"""Voice assistant helpers: Whisper speech-to-text and intent/amount/recipient
extraction that normalizes Indian-language numerals before parsing.
"""

import base64
import re
from typing import Optional

from .config import get_settings
from .services import detect_intent

settings = get_settings()

_DIGIT_MAPS = {
    "०१२३४५६७८९": "0123456789",  # Devanagari
    "೦೧೨೩೪೫೬೭೮೯": "0123456789",  # Kannada
    "௦௧௨௩௪௫௬௭௮௯": "0123456789",  # Tamil
    "౦౧౨౩౪౫౬౭౮౯": "0123456789",  # Telugu
    "૦૧૨૩૪૫૬૭૮૯": "0123456789",  # Gujarati
    "০১২৩৪৫৬৭৮৯": "0123456789",  # Bengali
    "੦੧੨੩੪੫੬੭੮੯": "0123456789",  # Punjabi
    "൦൧൨൩൪൫൬൭൮൯": "0123456789",  # Malayalam
}

_DIGIT_CHARS = {ord(s): ord(t) for src, dst in _DIGIT_MAPS.items() for s, t in zip(src, dst)}


def normalize_numerals(text: str) -> str:
    """Map non-ASCII numerals (Devanagari, Tamil, ...) to ASCII digits."""
    return text.translate(_DIGIT_CHARS)


_WHISPER_MODEL = None


def transcribe_audio(audio_bytes: bytes, language: Optional[str] = None) -> str:
    """Transcribe audio bytes with faster-whisper; raises RuntimeError when the
    model or dependency is unavailable so callers can respond gracefully."""
    global _WHISPER_MODEL
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:  # pragma: no cover - depends on optional install
        raise RuntimeError(
            "faster-whisper is not installed. Install it with "
            "`pip install faster-whisper` to enable speech-to-text on the server."
        ) from exc

    if _WHISPER_MODEL is None:
        _WHISPER_MODEL = WhisperModel(settings.whisper_model_size, compute_type="int8")
    segments, _info = _WHISPER_MODEL.transcribe(
        audio_bytes, language=language, vad_filter=True
    )
    return " ".join(segment.text for segment in segments).strip()


def resolve_transcript(transcript: str = "", audio_b64: Optional[str] = None) -> str:
    """Prefer the caller-provided transcript; otherwise decode the audio."""
    transcript = normalize_numerals(transcript or "")
    if transcript:
        return transcript
    if audio_b64:
        audio_bytes = base64.b64decode(audio_b64)
        return transcribe_audio(audio_bytes)
    return ""


def detect_voice_intent(transcript: str = "", audio_b64: Optional[str] = None, language: str = "en") -> dict:
    """Full voice intent pipeline: resolve audio, then run intent detection."""
    text = resolve_transcript(transcript, audio_b64)
    from .services import detect_intent as _detect

    return _detect(normalize_numerals(text), language)


_AMOUNT_HINT = re.compile(r"(?:₹|rs\.?|rupee[s]?)?\s*([0-9]+(?:\.[0-9]{1,2})?)(?:\s*(?:rupee[s]?|rs\.?))?", re.IGNORECASE)


def extract_amount_and_recipient(text: str) -> dict:
    """Lightweight extractions used by downstream flows to prefill UIs."""
    result = detect_intent(text)
    entities = result["entities"]
    return {
        "recipient": entities.get("recipient"),
        "amount": entities.get("amount"),
        "intent": result["intent"],
        "response": result["response"],
    }