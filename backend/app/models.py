"""SQLAlchemy ORM models.

Table and column names intentionally mirror the original drizzle-orm schema so
the API contract (and any existing tooling) stays compatible, while adding the
columns required for real authentication, per-user data, trusted contacts and
password storage.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship as sa_relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False, default="user")
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_language: Mapped[str] = mapped_column(Text, nullable=False, default="en")
    trusted_contact_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    trusted_contact_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    settings: Mapped["AccessibilityPreference"] = sa_relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    notification_preferences: Mapped["NotificationPreference"] = sa_relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    voice_settings: Mapped["VoiceSetting"] = sa_relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    trusted_contacts: Mapped[list["TrustedContact"]] = sa_relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    refresh_sessions: Mapped[list["RefreshSession"]] = sa_relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = sa_relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = sa_relationship(back_populates="user")


class AccessibilityPreference(Base):
    __tablename__ = "accessibility_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    profile_name: Mapped[str] = mapped_column(Text, nullable=False, default="Aarav")
    language: Mapped[str] = mapped_column(Text, nullable=False, default="en")
    voice_guidance: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    voice_selection: Mapped[str] = mapped_column(Text, nullable=False, default="default")
    speech_speed: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=1.00)
    large_text: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    screen_reader: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    simplified_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    literacy_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    daily_safety_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    learning_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    practice_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped["User"] = sa_relationship(back_populates="settings")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    voice_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    emergency_payment_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = sa_relationship(back_populates="notification_preferences")


class VoiceSetting(Base):
    __tablename__ = "voice_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    language: Mapped[str] = mapped_column(Text, nullable=False, default="en")
    speed: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=1.00)
    gender: Mapped[str] = mapped_column(Text, nullable=False, default="default")
    volume: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=1.00)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = sa_relationship(back_populates="voice_settings")


class TrustedContact(Base):
    __tablename__ = "trusted_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    relationship: Mapped[str | None] = mapped_column(Text, nullable=True)
    notify_on_emergency_payment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = sa_relationship(back_populates="trusted_contacts")


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = sa_relationship(back_populates="refresh_sessions")


class Payment(Base):
    __tablename__ = "payment_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    recipient: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, default="completed")
    safety_status: Mapped[str] = mapped_column(Text, nullable=False, default="verified")
    source: Mapped[str] = mapped_column(Text, nullable=False, default="voice")
    transaction_id: Mapped[str] = mapped_column(Text, nullable=False, default="UPI-DEMO")
    payment_type: Mapped[str] = mapped_column(Text, nullable=False, default="PERSONAL_TRANSFER")
    receipt_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notification_status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    qr_scan_id: Mapped[int | None] = mapped_column(ForeignKey("qr_history.id"), nullable=True)
    learning_note: Mapped[str] = mapped_column(
        Text, nullable=False, default="Pause, check the name and amount, then choose."
    )

    user: Mapped["User"] = sa_relationship(back_populates="payments")


class Tutorial(Base):
    __tablename__ = "offline_tutorials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(Text, nullable=False)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    offline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    tutorial_id: Mapped[int] = mapped_column(Integer, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quiz_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bookmarked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class QrHistory(Base):
    __tablename__ = "qr_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    merchant: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=245)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="verified")
    warning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AssistantHistory(Base):
    __tablename__ = "assistant_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    from_: Mapped[str] = mapped_column("from", Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = sa_relationship(back_populates="notifications")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    activity_type: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    metadata_json: Mapped[str] = mapped_column("metadata", Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PaymentConfirmation(Base):
    """Delivery record for every channel of a payment confirmation."""

    __tablename__ = "payment_confirmations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payment_history.id"), nullable=False)
    recipient: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    language: Mapped[str] = mapped_column(Text, nullable=False, default="en")
    sms_delivered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    whatsapp_delivered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    voice_delivered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    trusted_contact_delivered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    message_preview: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
