"""QR Safety Guardian endpoints: the compatibility read route plus the
image/payload-based explain route backed by the RAG knowledge base."""

import base64
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_optional_user
from ..fraud_engine import assess_qr, parse_upi_payload
from ..models import ActivityLog, QrHistory, User
from ..qr_guardian import decode_qr_base64, decode_qr_image, upi_payload_from_image
from ..rag import explain_qr_safety
from ..schemas import (
    ExplainQrBody,
    ExplainQrResponse,
    ReadQrBody,
    ReadQrResponse,
)

router = APIRouter(prefix="/qr", tags=["qr"])


@router.post("/read", response_model=ReadQrResponse)
def read_qr(body: ReadQrBody, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    safety = assess_qr(db, body.merchant, body.amount)
    checks = [
        {"name": "qr_detected", "passed": True, "detail": "A QR code was read successfully."},
        {"name": "merchant_verified", "passed": safety["checks"][0]["passed"], "detail": "The merchant name is visible for review."},
        {"name": "amount_verified", "passed": safety["checks"][1]["passed"], "detail": "The amount encoded in the QR is clearly shown."},
        *safety["checks"][2:],
    ]
    result = {
        "detected": True,
        "merchant": body.merchant,
        "amount": body.amount,
        "safe": safety["safe"],
        "warnings": safety["warnings"],
        "checks": checks,
        "summary": "QR checked. Review the merchant and amount before continuing."
        if safety["safe"]
        else safety["summary"],
    }
    owner_id = None if user.email == "aarav@demo.upisaathi.in" else user.id
    db.add(
        QrHistory(
            user_id=owner_id,
            merchant=body.merchant,
            amount=body.amount,
            status="verified" if safety["safe"] else "warning",
            warning=" ".join(safety["warnings"]) or None,
        )
    )
    db.add(
        ActivityLog(
            user_id=user.id,
            activity_type="qr_scan",
            metadata_json=json.dumps({"merchant": body.merchant, "safe": safety["safe"]}),
        )
    )
    db.commit()
    return result


@router.get("/history")
def get_qr_history(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    owner_id = None if user.email == "aarav@demo.upisaathi.in" else user.id
    rows = db.query(QrHistory).filter(QrHistory.user_id == owner_id).order_by(desc(QrHistory.created_at)).all()
    return [
        {
            "id": row.id,
            "merchant": row.merchant,
            "amount": float(row.amount),
            "status": row.status,
            "warning": row.warning,
            "createdAt": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.post("/safety/explain", response_model=ExplainQrResponse)
def explain_qr(
    body: ExplainQrBody,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Decode a QR (payload string or uploaded/base64 image) and explain the
    safety assessment using the RAG knowledge base."""
    payload = body.payload or ""
    decoded_by = "payload"

    if not payload and body.imageBase64:
        decoded = decode_qr_base64(body.imageBase64)
        payload = next((d for d in decoded if "upi://" in d.lower() or "@" in d), "")
        decoded_by = "image"

    info = parse_upi_payload(payload)
    if decoded_by == "image":
        info["expected_merchant"] = body.expectedMerchant
    else:
        info["expected_merchant"] = body.expectedMerchant

    payload_info = {
        "vpa": info.get("vpa"),
        "name": info.get("name"),
        "amount": info.get("amount"),
        "collect_request": info.get("collect_request", False),
        "expected_merchant": info.get("expected_merchant"),
    }

    explanation = explain_qr_safety(payload_info)
    explanation["decoded"] = info
    return explanation
