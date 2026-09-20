"""Payment confirmation delivery: multilingual SMS, WhatsApp and voice message
to the payer and the payee, plus an optional trusted contact.

Uses Twilio when ``UPI_TWILIO_*`` credentials are configured. Without
credentials the endpoint runs in *preview mode*: it builds the exact localized
messages, marks channels as not delivered, and returns the reason so the UI can
display a confirmation and offer in-app "read aloud" playback (TTS). No fake
"sent" statuses are ever reported.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from . import tts
from .config import get_settings
from .models import Payment, PaymentConfirmation
from .translations import translate

settings = get_settings()


def _twilio_client():
    if not (settings.twilio_account_sid and settings.twilio_auth_token):
        return None
    try:
        from twilio.rest import Client

        return Client(settings.twilio_account_sid, settings.twilio_auth_token)
    except Exception:
        return None


def _sanitize_phone(phone: str) -> Optional[str]:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) < 10:
        return None
    return "+" + digits if not digits.startswith("+") else digits


def build_messages(
    recipient: str, receiver: str, sender_name: str, amount: float, language: str = "en"
) -> tuple[str, str]:
    """Return ``(english_preview, localized_message)``."""
    amount_text = f"₹{amount:,.2f}"
    english = (
        f"Payment of {amount_text} to {recipient} was successful. "
        f"Receiver: you received {amount_text} from {sender_name}."
    )
    localized = "\n".join(
        [
            translate(language, "pay.success", amount=amount_text, recipient=recipient),
            translate(language, "pay.received", amount=amount_text, sender=sender_name),
            translate(language, "dot.pop"),
        ]
    )
    return english, localized


def deliver_confirmation(
    db: Session,
    payment: Payment,
    receiver: str,
    sender_name: str,
    language: str = "en",
    channel: str = "all",
    trusted_contact_phone: Optional[str] = None,
    trusted_contact_name: Optional[str] = None,
) -> dict:
    english, localized = build_messages(
        payment.recipient, receiver, sender_name, float(payment.amount), language
    )

    client = _twilio_client()
    from_number = settings.twilio_from_number
    deliver_sms = channel in {"sms", "all"}
    deliver_wa = channel in {"whatsapp", "all"}
    deliver_voice = channel in {"voice", "all"}

    sms_ok = whatsapp_ok = voice_ok = trusted_ok = False
    reason = (
        "Delivery provider credentials are not configured; preview mode active. "
        "Messages below can still be read aloud or displayed in the app."
        if client is None
        else "Delivery attempted."
    )

    to_phone = _sanitize_phone(receiver)
    if client is not None and to_phone and from_number:
        try:
            if deliver_sms:
                client.messages.create(body=localized, from_=from_number, to=to_phone)
                sms_ok = True
            if deliver_wa:
                client.messages.create(
                    body=localized,
                    from_="whatsapp:" + from_number,
                    to="whatsapp:" + to_phone,
                )
                whatsapp_ok = True
        except Exception:
            sms_ok = whatsapp_ok = False

    if deliver_voice:
        audio, _ = tts.synthesize(localized, language)
        voice_ok = audio is not None

    if trusted_contact_phone:
        tc_phone = _sanitize_phone(trusted_contact_phone)
        if client is not None and tc_phone and from_number:
            try:
                tc_message = translate(
                    language, "pay.trusted", sender=sender_name, amount=f"₹{float(payment.amount):,.2f}", recipient=payment.recipient
                )
                client.messages.create(body=tc_message, from_=from_number, to=tc_phone)
                trusted_ok = True
            except Exception:
                trusted_ok = False
        elif tc_phone is None:
            reason = "Trusted contact phone number is not a valid mobile number."

    record = PaymentConfirmation(
        payment_id=payment.id,
        recipient=payment.recipient,
        amount=float(payment.amount),
        language=language,
        sms_delivered=sms_ok,
        whatsapp_delivered=whatsapp_ok,
        voice_delivered=voice_ok,
        trusted_contact_delivered=trusted_ok,
        message_preview=localized,
    )
    db.add(record)
    db.commit()

    channels = []
    if deliver_sms:
        channels.append("sms")
    if deliver_wa:
        channels.append("whatsapp")
    if deliver_voice:
        channels.append("voice")

    return {
        "messagePreview": english,
        "messageLocalized": localized,
        "delivered": {
            "sms": sms_ok,
            "whatsapp": whatsapp_ok,
            "voice": voice_ok,
            "trustedContact": trusted_ok,
        },
        "reason": reason,
        "channels": channels,
    }