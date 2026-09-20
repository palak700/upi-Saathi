"""Domain services: intent parsing, safety checks, payment simulation, and
dashboard/analytics aggregations. This is the Python port of the Express
`upi-saathi` route logic, keeping identical JSON strings and response shapes.
"""

import re
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from .models import (
    AccessibilityPreference,
    ActivityLog,
    FraudAlert,
    LearningProgress,
    Notification,
    Payment,
    Tutorial,
)

DEMO_LABEL = "SIMULATED DEMO TRANSACTION"

KNOWN_RECIPIENTS = ["Mom", "Meera", "Rahul", "Dad", "Sister", "Brother", "Mobile Recharge"]
KNOWN_NAME_ALIASES = {
    "mom": "Mom",
    "maa": "Mom",
    "mother": "Mom",
    "meera": "Meera",
    "rahul": "Rahul",
    "dad": "Dad",
    "father": "Dad",
    "sister": "Sister",
    "brother": "Brother",
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "ten": 10, "twenty": 20, "fifty": 50, "hundred": 100,
}

_AMOUNT_RE = re.compile(
    r"(?:₹|rs\.?|rupees?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|rs\.?|₹)?", re.IGNORECASE
)


def _extract_amount(transcript: str) -> Optional[int]:
    low = transcript.lower()
    if len(low) <= 5:
        return None
    m = _AMOUNT_RE.search(transcript)
    if m:
        value = float(m.group(1))
        return int(value) if value == int(value) else round(value, 2)
    for word, num in NUMBER_WORDS.items():
        if re.search(rf"\b{word}\b", low):
            return num
    return None


def detect_intent(transcript: str, language: str = "en") -> dict:
    """Port of the Express parseIntent with multilingual greeting support."""
    text = (transcript or "").strip()
    low = text.lower()
    entities = {"recipient": None, "amount": None, "currency": "INR"}

    if low in {"hello", "hi", "namaste", "namaskar"}:
        return {
            "transcript": text,
            "intent": "GREETING",
            "confidence": 0.99,
            "entities": entities,
            "response": "Namaste! I am Saathi, your safety companion. Say 'recharge my phone', 'pay Mom', or 'scan a QR code' to get started.",
        }

    if re.search(r"\b(recharge|top.?up)\b", low):
        amount = _extract_amount(text) or 199
        entities["recipient"] = "Mobile Recharge"
        entities["amount"] = amount
        return {
            "transcript": text,
            "intent": "MOBILE_RECHARGE",
            "confidence": 0.95,
            "entities": entities,
            "response": f"You want to recharge your mobile phone with ₹{amount}. Please confirm the details.",
        }

    if re.search(r"\b(scan|qr|code)\b", low) and not re.search(r"\b(pay|send|transfer)\b", low):
        return {
            "transcript": text,
            "intent": "SCAN_QR",
            "confidence": 0.94,
            "entities": entities,
            "response": "Let's scan a QR code together. Hold the QR code steady so I can read it safely.",
        }

    if re.search(r"\b(fraud|scam|suspicious|fake|cheat)\b", low):
        return {
            "transcript": text,
            "intent": "FRAUD_HELP",
            "confidence": 0.97,
            "entities": entities,
            "response": "I can help you stay safe. Tell me what happened — for example, a strange message, an unknown QR, or a call asking for your PIN.",
        }

    if re.search(r"\b(cancel|stop|decline|don't want|do not want)\b", low):
        return {
            "transcript": text,
            "intent": "CANCEL",
            "confidence": 0.93,
            "entities": entities,
            "response": "No problem. I will cancel this payment. Nothing was sent.",
        }

    if re.search(r"\b(pay|send|transfer|give|give money)\b", low):
        intent = "TRANSFER" if re.search(r"\b(pay|send|transfer|give)\b", low) else "NEEDS_DETAILS"
        recipient = None
        for alias, canonical in KNOWN_NAME_ALIASES.items():
            if re.search(rf"\b{alias}\b", low):
                recipient = canonical
                break
        amount = _extract_amount(text)
        if recipient is None and amount is None:
            intent = "NEEDS_DETAILS"
        entities["recipient"] = recipient
        entities["amount"] = amount
        if intent == "NEEDS_DETAILS" and amount is None:
            response = "I need a few more details. Who are you paying and how much?"
        elif recipient and amount is not None:
            response = f"You want to pay {recipient} ₹{amount}. Please confirm."
        else:
            response = f"You want to pay {recipient or 'your contact'}. How much would you like to send?"
        return {
            "transcript": text,
            "intent": intent,
            "confidence": 0.92,
            "entities": entities,
            "response": response,
        }

    return {
        "transcript": text,
        "intent": "UNKNOWN",
        "confidence": 0.5,
        "entities": entities,
        "response": "I'm not sure I understood. Try 'recharge my phone', 'pay Mom five hundred', or 'scan a QR code'.",
    }


def _is_known_recipient(name: str) -> bool:
    low = (name or "").lower()
    for alias in list(KNOWN_NAME_ALIASES) + [k.lower() for k in KNOWN_RECIPIENTS]:
        if alias in low:
            return True
    return False


def build_safety(recipient: str, amount: float, db: Session) -> dict:
    """Port of the Express buildSafety: identical warnings, checks and summary."""
    warnings: list[str] = []
    if amount > 10000:
        warnings.append("This is a high-value payment. Take a moment to verify the amount.")
    if not _is_known_recipient(recipient):
        warnings.append("This recipient is not in your familiar demo contacts.")
    if re.search(r"collect|request|receive", recipient or "", re.IGNORECASE):
        warnings.append("Never enter your UPI PIN to receive money.")

    checks = [
        {"name": "recipient_verification", "passed": len(recipient or "") > 0, "detail": "Recipient name is visible before confirmation."},
        {"name": "amount_verification", "passed": amount > 0, "detail": "Amount is clearly shown in Indian rupees."},
        {"name": "payment_type_verification", "passed": True, "detail": "This is marked as a personal demo transfer."},
        {"name": "suspicious_pattern", "passed": len(warnings) == 0, "detail": "No suspicious pattern detected." if len(warnings) == 0 else "Review the warning before continuing."},
        {"name": "unknown_recipient", "passed": not any("familiar" in w for w in warnings), "detail": "Familiar demo contact check completed."},
        {"name": "repeated_payment", "passed": True, "detail": "No repeated demo payment pattern detected."},
        {"name": "collect_request_warning", "passed": not any("receive" in w for w in warnings), "detail": "Receiving money never requires a PIN."},
        {"name": "otp_warning", "passed": True, "detail": "Saathi will never ask for a one-time password."},
        {"name": "pin_protection", "passed": True, "detail": "UPI Saathi will never ask for a real UPI PIN."},
        {"name": "screen_sharing_warning", "passed": True, "detail": "Never share your screen while entering payment credentials."},
    ]

    return {
        "safe": len(warnings) == 0,
        "warnings": warnings,
        "checks": checks,
        "summary": "Ready for your review. This is a simulated demo only."
        if len(warnings) == 0
        else "Review the safety alert before deciding what to do.",
    }


def serialize_payment(p: Payment) -> dict:
    return {
        "id": p.id,
        "recipient": p.recipient,
        "amount": float(p.amount),
        "date": p.date.isoformat(),
        "status": p.status,
        "safetyStatus": p.safety_status,
        "source": p.source,
        "demoLabel": DEMO_LABEL,
        "transactionId": p.transaction_id,
        "paymentType": p.payment_type,
        "receiptUrl": p.receipt_url,
        "notificationStatus": p.notification_status,
        "qrScanId": p.qr_scan_id,
        "learningNote": p.learning_note,
    }


def simulate_payment(
    db: Session,
    recipient: str,
    amount: float,
    source: str = "voice",
    user_id: Optional[int] = None,
) -> Payment:
    tx_id = "UPI-" + uuid.uuid4().hex[:10].upper()
    payment = Payment(
        user_id=user_id,
        recipient=recipient,
        amount=amount,
        status="completed",
        safety_status="verified" if _is_known_recipient(recipient) else "warning",
        source=source,
        transaction_id=tx_id,
        payment_type="MOBILE_RECHARGE" if recipient.lower() == "mobile recharge" else "PERSONAL_TRANSFER",
        receipt_url=f"/api/history/{tx_id}/receipt",
        notification_status="pending",
        learning_note="Pause, check the name and amount, then choose.",
    )
    db.add(payment)
    db.add(ActivityLog(user_id=user_id, activity_type="payment_confirmed", value=int(amount), metadata_json=f'{{"source": "{source}"}}'))
    db.commit()
    db.refresh(payment)
    return payment


def post_transaction_notification(db: Session, payment: Payment, user_id: Optional[int] = None) -> None:
    db.add(
        Notification(
            user_id=user_id,
            type="payment",
            title="Payment completed",
            message=f"Paid ₹{float(payment.amount):.2f} to {payment.recipient}.",
        )
    )
    payment.notification_status = "sent"
    db.commit()


def build_dashboard(db: Session, profile_name: str) -> dict:
    recent = (
        db.query(Payment)
        .order_by(desc(Payment.date))
        .limit(5)
        .all()
    )
    weekly = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        count = db.query(func.count(Payment.id)).filter(Payment.date >= start, Payment.date < end).scalar() or 0
        weekly.append({"day": day.strftime("%a"), "value": count})

    progress_rows = db.query(LearningProgress).all()
    total_progress = sum(r.progress for r in progress_rows) if progress_rows else 0
    alerts = db.query(func.count(FraudAlert.id)).scalar() or 0

    return {
        "userName": profile_name or "Aarav",
        "accessibilityScore": min(100, 24 + total_progress // 3),
        "offlineProgress": min(100, len(progress_rows) * 14),
        "safetyAlerts": alerts,
        "recentPayments": [serialize_payment(p) for p in recent],
        "weeklyActivity": weekly,
    }


def build_analytics(db: Session) -> dict:
    practice = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        practice.append({"day": day.strftime("%a"), "value": 0})

    lessons = db.query(func.count(LearningProgress.id)).filter(LearningProgress.completed.is_(True)).scalar() or 0
    assistant = db.query(func.count(ActivityLog.id)).filter(ActivityLog.activity_type == "assistant_use").scalar() or 0
    quizzes = db.query(ActivityLog).filter(ActivityLog.activity_type == "fraud_quiz").all()
    quiz_score = sum(a.value for a in quizzes)
    a11y = db.query(ActivityLog).filter(ActivityLog.activity_type == "accessibility_use").count()
    sims = db.query(func.count(ActivityLog.id)).filter(ActivityLog.activity_type == "payment_confirmed").scalar() or 0

    language_usage = []
    settings = db.query(AccessibilityPreference).all()
    totals = {}
    for s in settings:
        totals[s.language or "en"] = totals.get(s.language or "en", 0) + 1
    for lang, count in sorted(totals.items(), key=lambda kv: kv[1], reverse=True):
        language_usage.append({"language": lang, "value": count})

    return {
        "practiceSessions": practice,
        "lessonsCompleted": lessons,
        "assistantUses": assistant,
        "fraudQuizScore": quiz_score,
        "accessibilityUsage": a11y,
        "paymentSimulations": sims,
        "languageUsage": language_usage,
    }


def rules_reply(message: str) -> str:
    """Keyword-based assistant reply used when the RAG backend is unavailable."""
    low = message.lower()
    if any(k in low for k in ["fraud", "scam", "fake"]):
        return (
            "Fraud often uses urgency and fear. A genuine bank never asks for your PIN or OTP. "
            "Pause, verify the caller, and report it in the Fraud section."
        )
    if "pin" in low:
        return "Your UPI PIN is private and is only for sending money. Never share it with anyone, including bank staff."
    if "qr" in low or "scan" in low:
        return "Before scanning any QR code, check the shop name and amount. Refuse codes that ask for your PIN to receive money."
    if "collect" in low or "request" in low:
        return "A Collect Request debits money from your account once approved. Only approve requests you recognise, and never enter your PIN to receive money."
    if "recharge" in low:
        return "For a mobile recharge, first confirm the number and the exact amount. Then only pay after the app shows the correct details."
    return (
        "Tell me more and I'll guide you. I can answer about QR codes, collect requests, "
        "UPI PIN safety, and avoiding fraud."
    )
