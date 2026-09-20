"""Text-to-speech synthesis for the voice confirmation channel.

Prefers gTTS (network) to return real MP3 bytes so the app can play the
confirmation aloud in the user's language. When gTTS is not installed or the
call fails, OTOH the client middleware falls back to the browser's own speech
synthesis, so it returns ``audio_base64=None`` rather than raising.
"""

import base64
from typing import Optional

from .config import get_settings

settings = get_settings()


def synthesize(text: str, language: str = "en") -> tuple[Optional[bytes], Optional[str]]:
    """Return ``(audio_bytes, content_type)`` or ``(None, None)`` on fallback."""
    if settings.tts_provider == "engine" or text is None or not text.strip():
        return None, None
    try:
        from gtts import gTTS

        lang = _tts_language(language)
        tts = gTTS(text=text, lang=lang)
        from io import BytesIO

        buf = BytesIO()
        tts.write_to_fp(buf)
        return buf.getvalue(), "audio/mpeg"
    except Exception:
        return None, None


def synth_base64(text: str, language: str = "en") -> Optional[str]:
    audio, _ = synthesize(text, language)
    if audio:
        return base64.b64encode(audio).decode("ascii")
    return None


def _tts_language(language: str) -> str:
    """gTTS language codes. Rajasthani falls back to Hindi; Punjabi to Punjabi."""
    mapping = {
        "en": "en",
        "hi": "hi",
        "mr": "mr",
        "ta": "ta",
        "te": "te",
        "gu": "gu",
        "bn": "bn",
        "kn": "kn",
        "ml": "ml",
        "pa": "pa",
        "raj": "hi",
    }
    return mapping.get(language, "en")