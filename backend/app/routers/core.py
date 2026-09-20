"""Core compatibility routers.

These endpoints mirror the Express API contract exactly (including raw array
wrappers, status codes and camelCase fields) so the existing React app and its
generated client work against this backend without changes. Storage is the
PostgreSQL database via SQLAlchemy.
"""

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user, get_optional_user
from ..models import (
    AccessibilityPreference,
    ActivityLog,
    FraudAlert,
    LearningProgress,
    Notification,
    NotificationPreference,
    Payment,
    Tutorial,
    TrustedContact,
    User,
    VoiceSetting,
)
from ..schemas import (
    AnalyticsResponse,
    DashboardResponse,
    FraudAlertOut,
    GetFraudAlertsResponse,
    GetNotificationsResponse,
    GetTutorialsResponse,
    HealthCheckResponse,
    IntentOut,
    LanguageOut,
    NotificationPreferencesBody,
    NotificationPreferencesOut,
    SpeakTextBody,
    SpeakTextResponse,
    TranslateTextBody,
    TrustedContactBody,
    TrustedContactOut,
    ActivityLogOut,
    TranslateTextResponse,
    UpdateTutorialProgressBody,
    UpdateTutorialProgressResponse,
    VoiceSettingsBody,
    VoiceSettingsOut,
)
from ..services import build_analytics, detect_intent, serialize_payment
from ..translations import LANGUAGES, localize
from ..voice import detect_voice_intent, normalize_numerals

router = APIRouter(tags=["core"])


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

SETTINGS_FIELDS = {
    "profile_name": "profileName",
    "language": "language",
    "voice_guidance": "voiceGuidance",
    "voice_selection": "voiceSelection",
    "speech_speed": "speechSpeed",
    "large_text": "largeText",
    "high_contrast": "highContrast",
    "screen_reader": "screenReader",
    "simplified_mode": "simplifiedMode",
    "literacy_mode": "literacyMode",
    "reduced_motion": "reducedMotion",
    "daily_safety_reminders": "dailySafetyReminders",
    "learning_reminders": "learningReminders",
    "practice_reminders": "practiceReminders",
}


def settings_to_dict(pref: AccessibilityPreference) -> dict:
    out = {"id": pref.id}
    for column, key in SETTINGS_FIELDS.items():
        value = getattr(pref, column)
        out[key] = float(value) if key == "speechSpeed" else value
    return out


def log_activity(db: Session, activity_type: str, user_id=None, value: int = 1, metadata: dict | str | None = None) -> None:
    payload = metadata if isinstance(metadata, str) else json.dumps(metadata or {})
    db.add(ActivityLog(user_id=user_id, activity_type=activity_type, value=value, metadata_json=payload))


def get_or_create_settings(db: Session, user_id) -> AccessibilityPreference:
    pref = db.query(AccessibilityPreference).filter(AccessibilityPreference.user_id == user_id).first()
    if pref is None:
        pref = AccessibilityPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def get_or_create_notification_preferences(db: Session, user_id: int) -> NotificationPreference:
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if pref is None:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def get_or_create_voice_settings(db: Session, user_id: int) -> VoiceSetting:
    pref = db.query(VoiceSetting).filter(VoiceSetting.user_id == user_id).first()
    if pref is None:
        pref = VoiceSetting(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def notification_preferences_to_dict(pref: NotificationPreference) -> dict:
    return {
        "sms": pref.sms_enabled,
        "whatsapp": pref.whatsapp_enabled,
        "voice": pref.voice_enabled,
        "email": pref.email_enabled,
        "emergencyPaymentNotifications": pref.emergency_payment_notifications,
    }


def voice_settings_to_dict(pref: VoiceSetting) -> dict:
    return {
        "language": pref.language,
        "speed": float(pref.speed),
        "gender": pref.gender,
        "volume": float(pref.volume),
    }


def trusted_contact_to_dict(contact: TrustedContact) -> dict:
    return {
        "id": contact.id,
        "name": contact.name,
        "phone": contact.phone,
        "relationship": contact.relationship,
        "notifyOnEmergencyPayment": contact.notify_on_emergency_payment,
    }


def owner_id_for(user: User) -> int | None:
    return None if user.email == "aarav@demo.upisaathi.in" else user.id


def activity_log_to_dict(row: ActivityLog) -> dict:
    try:
        metadata = json.loads(row.metadata_json or "{}")
    except json.JSONDecodeError:
        metadata = {"raw": row.metadata_json}
    return {
        "id": row.id,
        "activityType": row.activity_type,
        "value": row.value,
        "metadata": metadata,
        "createdAt": row.created_at.isoformat(),
    }


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #


@router.get("/healthz", response_model=HealthCheckResponse)
def healthz():
    return {"status": "ok"}


# --------------------------------------------------------------------------- #
# Intent + voice
# --------------------------------------------------------------------------- #


@router.post("/intent/detect", response_model=IntentOut)
def intent_detect(body: dict, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    text = body.get("text", "") or ""
    language = body.get("language", "en")
    result = detect_intent(normalize_numerals(text), language)
    log_activity(db, "voice_command", user.id, metadata={"intent": result["intent"], "text": text[:120]})
    db.commit()
    return result


@router.post("/voice/transcribe", response_model=IntentOut)
def voice_transcribe(body: dict, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    transcript = body.get("transcript", "") or ""
    result = detect_voice_intent(transcript=transcript, language=body.get("language", "en"))
    log_activity(db, "voice_command", user.id, metadata={"intent": result["intent"], "text": transcript[:120]})
    db.commit()
    return result


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #


@router.get("/settings")
def get_settings_endpoint(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    pref = get_or_create_settings(db, user.id)
    return settings_to_dict(pref)


@router.post("/settings")
def save_settings(body: dict, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    pref = get_or_create_settings(db, user.id)
    for column, key in SETTINGS_FIELDS.items():
        if key in body and key != "id":
            setattr(pref, column, body[key])
    log_activity(db, "settings_changed", user.id, metadata={"fields": sorted(body.keys())})
    db.commit()
    db.refresh(pref)
    return settings_to_dict(pref)


@router.get("/notification-preferences", response_model=NotificationPreferencesOut)
def get_notification_preferences(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = get_or_create_notification_preferences(db, user.id)
    return notification_preferences_to_dict(pref)


@router.put("/notification-preferences", response_model=NotificationPreferencesOut)
def save_notification_preferences(
    body: NotificationPreferencesBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_or_create_notification_preferences(db, user.id)
    pref.sms_enabled = body.sms
    pref.whatsapp_enabled = body.whatsapp
    pref.voice_enabled = body.voice
    pref.email_enabled = body.email
    pref.emergency_payment_notifications = body.emergencyPaymentNotifications
    log_activity(db, "notification_preferences_changed", user.id, metadata=body.model_dump())
    db.commit()
    db.refresh(pref)
    return notification_preferences_to_dict(pref)


@router.get("/voice-settings", response_model=VoiceSettingsOut)
def get_voice_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = get_or_create_voice_settings(db, user.id)
    return voice_settings_to_dict(pref)


@router.put("/voice-settings", response_model=VoiceSettingsOut)
def save_voice_settings(
    body: VoiceSettingsBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_or_create_voice_settings(db, user.id)
    pref.language = body.language
    pref.speed = body.speed
    pref.gender = body.gender
    pref.volume = body.volume
    settings_pref = get_or_create_settings(db, user.id)
    settings_pref.language = body.language
    settings_pref.speech_speed = body.speed
    settings_pref.voice_selection = body.gender
    log_activity(db, "voice_settings_changed", user.id, metadata=body.model_dump())
    db.commit()
    db.refresh(pref)
    return voice_settings_to_dict(pref)


@router.get("/trusted-contacts", response_model=list[TrustedContactOut])
def list_trusted_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(TrustedContact).filter(TrustedContact.user_id == user.id).order_by(TrustedContact.id).all()
    return [trusted_contact_to_dict(row) for row in rows]


@router.post("/trusted-contacts", response_model=TrustedContactOut, status_code=status.HTTP_201_CREATED)
def add_trusted_contact(
    body: TrustedContactBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = TrustedContact(
        user_id=user.id,
        name=body.name,
        phone=body.phone,
        relationship=body.relationship,
        notify_on_emergency_payment=body.notifyOnEmergencyPayment,
    )
    db.add(contact)
    user.trusted_contact_name = body.name
    user.trusted_contact_phone = body.phone
    log_activity(db, "trusted_contact_added", user.id, metadata={"name": body.name})
    db.commit()
    db.refresh(contact)
    return trusted_contact_to_dict(contact)


@router.put("/trusted-contacts/{contact_id}", response_model=TrustedContactOut)
def update_trusted_contact(
    contact_id: int,
    body: TrustedContactBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = db.get(TrustedContact, contact_id)
    if contact is None or contact.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found")
    contact.name = body.name
    contact.phone = body.phone
    contact.relationship = body.relationship
    contact.notify_on_emergency_payment = body.notifyOnEmergencyPayment
    log_activity(db, "trusted_contact_updated", user.id, metadata={"contactId": contact_id})
    db.commit()
    db.refresh(contact)
    return trusted_contact_to_dict(contact)


@router.delete("/trusted-contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trusted_contact(
    contact_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = db.get(TrustedContact, contact_id)
    if contact is None or contact.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found")
    db.delete(contact)
    log_activity(db, "trusted_contact_deleted", user.id, metadata={"contactId": contact_id})
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- #
# Languages + translate + speak
# --------------------------------------------------------------------------- #


@router.get("/languages", response_model=list[LanguageOut])
def get_languages():
    return LANGUAGES


@router.post("/translate", response_model=TranslateTextResponse)
def translate_endpoint(body: TranslateTextBody):
    language = body.language or "en"
    return {
        "text": body.text,
        "language": language,
        "translatedText": localize(language, body.text),
    }


@router.post("/voice/speak", response_model=SpeakTextResponse)
def speak_endpoint(body: SpeakTextBody):
    language = body.language or "en"
    return {
        "text": localize(language, body.text),
        "language": language,
        "supported": True,
    }


# --------------------------------------------------------------------------- #
# Dashboard / history / analytics
# --------------------------------------------------------------------------- #


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    pref = get_or_create_settings(db, user.id)
    owner_id = owner_id_for(user)
    recent = [
        serialize_payment(p)
        for p in db.query(Payment).filter(Payment.user_id == owner_id).order_by(desc(Payment.date)).limit(4).all()
    ]
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    payments = db.query(Payment).filter(Payment.user_id == owner_id).all()
    weekly = []
    for index, day in enumerate(day_labels):
        count = sum(1 for p in payments if p.date and p.date.weekday() == index)
        weekly.append({"day": day, "value": max(1, count)})
    progress_rows = db.query(LearningProgress).filter(LearningProgress.user_id == user.id).all()
    avg_progress = (
        round(sum(r.progress for r in progress_rows) / len(progress_rows)) if progress_rows else 0
    )
    alerts = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == owner_id, Notification.type == "safety", Notification.read.is_(False))
        .scalar()
        or 0
    )
    return {
        "userName": pref.profile_name or "Aarav",
        "accessibilityScore": min(100, 70 + sum(bool(getattr(pref, c)) for c in ["large_text", "high_contrast", "simplified_mode", "reduced_motion", "voice_guidance"]) * 4),
        "offlineProgress": avg_progress,
        "safetyAlerts": alerts,
        "recentPayments": recent,
        "weeklyActivity": weekly,
    }


@router.get("/history")
def get_history(
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
    search: str | None = Query(default=None),
    source: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    query = db.query(Payment).filter(Payment.user_id == owner_id_for(user))
    if search:
        query = query.filter(func.lower(Payment.recipient).contains(search.lower()))
    if source:
        query = query.filter(Payment.source == source)
    if status:
        query = query.filter(Payment.status == status)
    rows = query.order_by(desc(Payment.date)).all()
    return [serialize_payment(p) for p in rows]


@router.get("/history/export")
def export_history(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    rows = db.query(Payment).filter(Payment.user_id == owner_id_for(user)).order_by(desc(Payment.date)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["transaction_id", "date", "recipient", "amount", "status", "source", "notification_status"])
    for payment in rows:
        writer.writerow([
            payment.transaction_id,
            payment.date.isoformat(),
            payment.recipient,
            float(payment.amount),
            payment.status,
            payment.source,
            payment.notification_status,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=upi-saathi-history.csv"},
    )


@router.get("/history/{transaction_id}/receipt")
def export_receipt(transaction_id: str, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    payment = (
        db.query(Payment)
        .filter(Payment.user_id == owner_id_for(user), Payment.transaction_id == transaction_id)
        .first()
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    text = "\n".join([
        "UPI Saathi Practice Receipt",
        f"Transaction ID: {payment.transaction_id}",
        f"Date: {payment.date.isoformat()}",
        f"Recipient: {payment.recipient}",
        f"Amount: INR {float(payment.amount):.2f}",
        f"Status: {payment.status}",
        f"Safety: {payment.safety_status}",
        f"Notifications: {payment.notification_status}",
        "SIMULATED DEMO TRANSACTION - NO REAL MONEY TRANSFERRED.",
    ])
    return Response(
        content=text,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={payment.transaction_id}.txt"},
    )


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    return build_analytics(db)


@router.get("/activity-logs", response_model=list[ActivityLogOut])
def get_activity_logs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user.id)
        .order_by(desc(ActivityLog.created_at))
        .limit(100)
        .all()
    )
    return [activity_log_to_dict(row) for row in rows]


# --------------------------------------------------------------------------- #
# Tutorials + learning progress
# --------------------------------------------------------------------------- #


@router.get("/tutorials", response_model=GetTutorialsResponse)
def get_tutorials(db: Session = Depends(get_db)):
    rows = db.query(Tutorial).order_by(Tutorial.id).all()
    return {
        "tutorials": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "icon": t.icon,
                "difficulty": t.difficulty,
                "minutes": t.minutes,
                "progress": t.progress,
                "offline": t.offline,
            }
            for t in rows
        ]
    }


@router.post("/tutorials/{tutorial_id}/progress", response_model=UpdateTutorialProgressResponse)
def update_tutorial_progress(
    tutorial_id: int,
    body: dict,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    tutorial = db.get(Tutorial, tutorial_id)
    if tutorial is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial not found")

    combined = TutorialProgressInputShim(
        progress=int(body.get("progress", 0)),
        completed=bool(body.get("completed", False)),
        quiz_score=int(body.get("quizScore", 0)),
        bookmarked=bool(body.get("bookmarked", False)),
    )
    row = (
        db.query(LearningProgress)
        .filter(
            LearningProgress.user_id == user.id,
            LearningProgress.tutorial_id == tutorial_id,
        )
        .first()
    )
    if row is None:
        row = LearningProgress(user_id=user.id, tutorial_id=tutorial_id)
        db.add(row)
    row.progress = combined.progress
    row.completed = combined.completed
    row.quiz_score = combined.quiz_score
    row.bookmarked = combined.bookmarked
    tutorial.progress = max(tutorial.progress, combined.progress)
    db.commit()

    if combined.completed:
        db.add(
            Notification(
                user_id=user.id,
                type="learning",
                title="Lesson completed",
                message=f"{tutorial.title} is now part of your Saathi learning streak.",
            )
        )
        log_activity(db, "lesson_completed", user.id, metadata=f'{{"tutorialId": {tutorial_id}}}')
        db.commit()

    return {
        "tutorialId": tutorial_id,
        "progress": combined.progress,
        "completed": combined.completed,
        "quizScore": combined.quiz_score,
        "bookmarked": combined.bookmarked,
    }


class TutorialProgressInputShim:
    def __init__(self, progress: int, completed: bool, quiz_score: int, bookmarked: bool):
        self.progress = progress
        self.completed = completed
        self.quiz_score = quiz_score
        self.bookmarked = bookmarked


# --------------------------------------------------------------------------- #
# Fraud
# --------------------------------------------------------------------------- #


@router.get("/fraud/alerts", response_model=GetFraudAlertsResponse)
def get_fraud_alerts(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    rows = db.query(FraudAlert).filter(FraudAlert.user_id == user.id).order_by(desc(FraudAlert.created_at)).all()
    return {"alerts": [_fraud_alert_dict(r) for r in rows]}


def _fraud_alert_dict(alert: FraudAlert) -> dict:
    return {
        "id": alert.id,
        "category": alert.category,
        "result": alert.result,
        "createdAt": alert.created_at.isoformat(),
    }


@router.post("/fraud/quiz", response_model=FraudAlertOut, status_code=status.HTTP_201_CREATED)
def submit_fraud_quiz(
    body: dict,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    alert = FraudAlert(user_id=user.id, category=body["category"], result=body["result"])
    db.add(alert)
    log_activity(db, "fraud_quiz", user.id, value=score_from_result(body["result"]))
    db.commit()
    db.refresh(alert)
    return _fraud_alert_dict(alert)


def score_from_result(result: str) -> int:
    import re

    match = re.search(r"\d+", result or "")
    return int(match.group(0)) if match else 0


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #


@router.get("/notifications", response_model=GetNotificationsResponse)
def get_notifications(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == owner_id_for(user))
        .order_by(desc(Notification.created_at))
        .limit(40)
        .all()
    )
    return {
        "notifications": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "read": n.read,
                "createdAt": n.created_at.isoformat(),
            }
            for n in rows
        ]
    }


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != owner_id_for(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.read = True
    log_activity(db, "notification_read", user.id, metadata={"notificationId": notification_id})
    db.commit()
    return {
        "id": notification.id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "read": notification.read,
        "createdAt": notification.created_at.isoformat(),
    }


@router.patch("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == owner_id_for(user)).update({Notification.read: True})
    log_activity(db, "notifications_read_all", user.id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
