"""Idempotent seed data so the dashboard, learning centre and notifications
ship with meaningful content on first boot."""

from sqlalchemy.orm import Session

from .models import (
    AccessibilityPreference,
    Notification,
    Payment,
    QrHistory,
    Tutorial,
    User,
)

SEED_TUTORIALS = [
    {"title": "UPI basics", "description": "Learn the simple steps behind a safe digital payment.", "icon": "compass", "difficulty": "Starter", "minutes": 4, "progress": 100, "offline": True},
    {"title": "QR codes explained", "description": "Understand what to check before scanning any QR code.", "icon": "scan", "difficulty": "Starter", "minutes": 6, "progress": 68, "offline": True},
    {"title": "Protect your UPI PIN", "description": "Your PIN is private. Learn the one rule that keeps it safe.", "icon": "shield", "difficulty": "Essential", "minutes": 3, "progress": 32, "offline": True},
    {"title": "Spot a fraud attempt", "description": "Practice noticing urgency, pressure, and suspicious requests.", "icon": "alert", "difficulty": "Essential", "minutes": 7, "progress": 0, "offline": True},
    {"title": "Collect requests", "description": "See how a collect request works and when to decline it.", "icon": "inbox", "difficulty": "Guided", "minutes": 5, "progress": 0, "offline": True},
    {"title": "Safe payment habits", "description": "Build a repeatable safety check for everyday payments.", "icon": "check", "difficulty": "Guided", "minutes": 8, "progress": 0, "offline": True},
]

SEED_NOTIFICATIONS = [
    {"type": "safety", "title": "Daily safety tip", "message": "Never enter your UPI PIN to receive money."},
    {"type": "learning", "title": "Keep your learning streak", "message": "Try one short Saathi lesson today."},
    {"type": "accessibility", "title": "Make reading easier", "message": "Larger text and high contrast are available in Accessibility."},
    {"type": "safety", "title": "Watch out for refund scams", "message": "Banks never ask you to pay a small fee to receive a refund."},
]


def seed_database(db: Session) -> None:
    if db.query(Tutorial).count() == 0:
        db.add_all([Tutorial(**t) for t in SEED_TUTORIALS])

    if db.query(AccessibilityPreference).filter(AccessibilityPreference.user_id.is_(None)).count() == 0:
        db.add(AccessibilityPreference())

    user = db.query(User).filter(User.email == "aarav@demo.upisaathi.in").first()
    if db.query(Notification).count() == db.query(Notification).filter(Notification.user_id == (user.id if user else None)).count():
        for n in SEED_NOTIFICATIONS:
            db.add(Notification(user_id=user.id if user else None, **n))

    if db.query(Payment).count() == 0:
        db.add_all(
            [
                Payment(recipient="Mom", amount=250, status="completed", safety_status="verified", source="voice", transaction_id="UPI-AA12B34C", payment_type="PERSONAL_TRANSFER"),
                Payment(recipient="Mobile Recharge", amount=199, status="completed", safety_status="verified", source="voice", transaction_id="UPI-11D22E33", payment_type="MOBILE_RECHARGE"),
                Payment(recipient="Rahul", amount=120, status="completed", safety_status="verified", source="scan", transaction_id="UPI-FF44G55H", payment_type="PERSONAL_TRANSFER"),
            ]
        )

    if db.query(QrHistory).count() == 0:
        db.add_all(
            [
                QrHistory(merchant="Big Bazaar", amount=245, status="verified", warning=None),
                QrHistory(merchant="Chai Point", amount=40, status="warning", warning="Merchant name not in safe list."),
                QrHistory(merchant="Book Store", amount=399, status="verified", warning=None),
            ]
        )

    db.commit()