"""Initial schema for UPI Saathi.

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("preferred_language", sa.Text(), nullable=False, server_default="en"),
        sa.Column("trusted_contact_phone", sa.Text(), nullable=True),
        sa.Column("trusted_contact_name", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "accessibility_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("profile_name", sa.Text(), nullable=False, server_default="Aarav"),
        sa.Column("language", sa.Text(), nullable=False, server_default="en"),
        sa.Column("voice_guidance", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("voice_selection", sa.Text(), nullable=False, server_default="default"),
        sa.Column("speech_speed", sa.Numeric(3, 2), nullable=False, server_default="1.00"),
        sa.Column("large_text", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("high_contrast", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("simplified_mode", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("reduced_motion", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("daily_safety_reminders", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("learning_reminders", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("practice_reminders", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "payment_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("recipient", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="completed"),
        sa.Column("safety_status", sa.Text(), nullable=False, server_default="verified"),
        sa.Column("source", sa.Text(), nullable=False, server_default="voice"),
        sa.Column("transaction_id", sa.Text(), nullable=False, server_default="UPI-DEMO"),
        sa.Column("payment_type", sa.Text(), nullable=False, server_default="PERSONAL_TRANSFER"),
        sa.Column("learning_note", sa.Text(), nullable=False, server_default="Pause, check the name and amount, then choose."),
    )

    op.create_table(
        "offline_tutorials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.Text(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("offline", sa.Boolean(), nullable=False, server_default="true"),
    )

    op.create_table(
        "learning_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("tutorial_id", sa.Integer(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("quiz_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bookmarked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "qr_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("merchant", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False, server_default="245"),
        sa.Column("status", sa.Text(), nullable=False, server_default="verified"),
        sa.Column("warning", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "fraud_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "assistant_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("from", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("activity_type", sa.Text(), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "payment_confirmations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payment_history.id"), nullable=False),
        sa.Column("recipient", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("language", sa.Text(), nullable=False, server_default="en"),
        sa.Column("sms_delivered", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("whatsapp_delivered", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("voice_delivered", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("trusted_contact_delivered", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("message_preview", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("payment_confirmations")
    op.drop_table("activity_logs")
    op.drop_table("notifications")
    op.drop_table("assistant_history")
    op.drop_table("fraud_alerts")
    op.drop_table("qr_history")
    op.drop_table("learning_progress")
    op.drop_table("offline_tutorials")
    op.drop_table("payment_history")
    op.drop_table("accessibility_preferences")
    op.drop_table("users")