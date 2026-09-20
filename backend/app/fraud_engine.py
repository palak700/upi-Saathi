"""Fraud detection engine.

Returns the exact check/warning contract consumed by the React QR guidance and
payment flows, and additionally powers the rising-risk assessment used by the
QR Safety Guardian explain endpoint.
"""

import re

from .models import Payment
from .settings_constants import HIGH_AMOUNT_THRESHOLD
from sqlalchemy.orm import Session

SUSPICIOUS_VPA_WORDS = ["cashback", "lottery", "prize", "refund", "gift", "reward", "offer"]


def _is_known_merchant(name: str, db: Session) -> bool:
    known = ["Big Bazaar", "Chai Point", "Book Store", "Distributor", "Metro", "Kirana"]
    low = (name or "").lower()
    return any(k.lower() in low for k in known)


def _recent_repeated(db: Session, merchant: str, amount: float) -> bool:
    from sqlalchemy import func

    row = (
        db.query(Payment)
        .filter(func.lower(Payment.recipient) == merchant.lower(), Payment.amount == amount)
        .first()
    )
    return row is not None


def assess_qr(db: Session, merchant: str, amount: float, vpa: Optional[str] = None) -> dict:
    """Produce the ReadQrResponse-style safety report for a scanned/read QR."""
    checks: list[dict] = []
    warnings: list[str] = []

    # 1. qr_detected
    detected_ok = bool(merchant)
    checks.append(
        {
            "name": "qr_detected",
            "passed": detected_ok,
            "detail": "QR code decoded successfully" if detected_ok else "Could not decode a QR code from this image.",
        }
    )

    # 2. merchant_verified
    known = _is_known_merchant(merchant, db)
    checks.append(
        {
            "name": "merchant_verified",
            "passed": known,
            "detail": "Merchant matches a familiar payee name" if known else "Unfamiliar merchant — cross-check the name and shop.",
        }
    )
    if not known:
        warnings.append("The merchant name is not in your safe scan list. Confirm it with the shop.")

    # 3. amount_verified
    amount_ok = 0 < float(amount) <= HIGH_AMOUNT_THRESHOLD
    checks.append(
        {
            "name": "amount_verified",
            "passed": amount_ok,
            "detail": "Amount is within policy" if amount_ok else "Amount exceeds your safety threshold.",
        }
    )
    if not amount_ok:
        warnings.append("The encoded amount is unusually high for this shop.")

    # 4. suspicious_pattern (VPA keywords / malformed)
    suspicious_vpa = bool(vpa) and any(w in (vpa or "").lower() for w in SUSPICIOUS_VPA_WORDS)
    checks.append(
        {
            "name": "suspicious_pattern",
            "passed": not suspicious_vpa,
            "detail": "No suspicious keywords in the UPI ID" if not suspicious_vpa else "The UPI ID contains fraud keywords.",
        }
    )
    if suspicious_vpa:
        warnings.append("This UPI ID looks suspicious. Do not pay.")

    # 5. unknown_recipient
    checks.append(
        {
            "name": "unknown_recipient",
            "passed": known,
            "detail": "Payee recognised" if known else "You have not paid this payee before.",
        }
    )

    # 6. repeated_payment
    repeated = _recent_repeated(db, merchant, amount)
    checks.append(
        {
            "name": "repeated_payment",
            "passed": repeated,
            "detail": "You have scanned this payee for this amount before." if repeated else "First time scanning this payee at this amount.",
        }
    )

    # 7. collect_request_warning
    collect = bool(vpa) and ("collect" in (vpa or "").lower() or "request" in (vpa or "").lower())
    checks.append(
        {
            "name": "collect_request_warning",
            "passed": not collect,
            "detail": "Not a collect request" if not collect else "Collect Request detected — approving it debits your account.",
        }
    )
    if collect:
        warnings.append("Never enter your UPI PIN to receive money.")

    # 8. otp_warning
    checks.append(
        {
            "name": "otp_warning",
            "passed": True,
            "detail": "You are never asked for an OTP while scanning a merchant QR.",
        }
    )

    # 9. pin_protection
    checks.append(
        {
            "name": "pin_protection",
            "passed": True,
            "detail": "Your PIN is only for outgoing payments.",
        }
    )

    # 10. screen_sharing_warning
    checks.append(
        {
            "name": "screen_sharing_warning",
            "passed": True,
            "detail": "Never share your screen while scanning or paying.",
        }
    )

    failed = [c for c in checks if not c["passed"]]
    summary = (
        "This QR code looks safe to scan. Proceed with the displayed name and amount."
        if not failed
        else f"Safety check found {len(failed)} concern{'s' if len(failed) != 1 else ''}. Verify before you pay."
    )

    return {
        "safe": not failed,
        "warnings": warnings,
        "checks": checks,
        "summary": summary,
        "collect_request": collect,
        "suspicious_vpa": suspicious_vpa,
    }


def parse_upi_payload(payload: str) -> dict:
    """Parse a UPI QR string like upi://pay?pa=user@bank&pn=Name&am=100&cu=INR."""
    result = {
        "vpa": None,
        "name": None,
        "amount": None,
        "currency": None,
        "transaction_note": None,
        "collect_request": False,
        "raw": payload or "",
    }
    if not payload:
        return result
    lowered = payload.lower()
    result["collect_request"] = "collect" in lowered or ("tn" in lowered and "request" in lowered)
    match = re.search(r"[?&]pa=([^&\s]+)", payload, re.IGNORECASE)
    if match:
        result["vpa"] = match.group(1)
    match = re.search(r"[?&]pn=([^&\s]+)", payload, re.IGNORECASE)
    if match:
        result["name"] = match.group(1).replace("+", " ")
    match = re.search(r"[?&]am=([^&\s]+)", payload, re.IGNORECASE)
    if match:
        try:
            result["amount"] = float(match.group(1))
        except ValueError:
            result["amount"] = None
    match = re.search(r"[?&]cu=([^&\s]+)", payload, re.IGNORECASE)
    if match:
        result["currency"] = match.group(1).upper()
    match = re.search(r"[?&]tn=([^&\s]+)", payload, re.IGNORECASE)
    if match:
        result["transaction_note"] = match.group(1).replace("+", " ")
    return result