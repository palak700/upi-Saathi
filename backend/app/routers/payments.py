"""Payment guidance, confirmation, and the delivery of multilingual
confirmation messages to both parties plus an optional trusted contact."""

import json

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_optional_user
from ..models import ActivityLog, Notification, NotificationPreference, TrustedContact, User
from ..notify import deliver_confirmation
from ..schemas import (
    PaymentConfirmationBody,
    PaymentConfirmationResponse,
    GuidePaymentBody,
    ConfirmPaymentBody,
    PaymentOut,
)
from ..services import build_safety, post_transaction_notification, serialize_payment, simulate_payment

router = APIRouter(prefix="/payment", tags=["payments"])


@router.post("/guide")
def guide_payment(body: GuidePaymentBody, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    return build_safety(body.recipient, body.amount, db)


@router.post("/confirm", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def confirm_payment(
    body: ConfirmPaymentBody,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    safety = build_safety(body.recipient, body.amount, db)
    if not safety["safe"] and not body.merchantMismatchAccepted:
        # Still simulate so learners can practice, but surface the review state.
        safety_status = "review"
    else:
        safety_status = "verified" if safety["safe"] else "warning"

    payment = simulate_payment(
        db, body.recipient, body.amount, body.source or "voice",
        user_id=None if user.email == "aarav@demo.upisaathi.in" else user.id,
    )
    if payment:
        payment.safety_status = safety_status
        payment.learning_note = (
            "You verified the recipient and amount before confirming."
            if safety["safe"]
            else "You noticed a warning and practiced pausing before a payment."
        )
        db.commit()
        db.refresh(payment)

    post_transaction_notification(db, payment, payment.user_id)
    prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).first()
    emergency_enabled = prefs.emergency_payment_notifications if prefs else True
    if emergency_enabled and float(body.amount) >= 10000:
        contacts = (
            db.query(TrustedContact)
            .filter(TrustedContact.user_id == user.id, TrustedContact.notify_on_emergency_payment.is_(True))
            .all()
        )
        for contact in contacts:
            db.add(
                Notification(
                    user_id=user.id,
                    type="trusted_contact",
                    title=f"Emergency notice prepared for {contact.name}",
                    message=f"{contact.name} would be notified about the simulated payment to {body.recipient}.",
                )
            )
        if payment:
            payment.notification_status = "trusted_contact_queued" if contacts else payment.notification_status
    db.add(
        ActivityLog(
            user_id=user.id,
            activity_type="payment_confirmation",
            value=int(body.amount),
            metadata_json=json.dumps({"recipient": body.recipient, "source": body.source or "voice"}),
        )
    )
    db.commit()
    return PaymentOut(**serialize_payment(payment))


@router.post("/confirmations", response_model=PaymentConfirmationResponse)
def send_confirmations(
    body: PaymentConfirmationBody,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Send a multilingual confirmation for a completed payment to the payee,
    the payer, and the optional trusted contact."""
    payment = simulate_payment(
        db,
        body.recipient,
        body.amount,
        source="manual",
        user_id=None if user.email == "aarav@demo.upisaathi.in" else user.id,
    )
    result = deliver_confirmation(
        db=db,
        payment=payment,
        receiver=body.receiver,
        sender_name=user.name,
        language=body.language or "en",
        channel=body.channel,
        trusted_contact_phone=body.trustedContactPhone,
        trusted_contact_name=body.trustedContactName,
    )
    db.commit()
    return result
