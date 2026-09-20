"""Auth sessions, profile preferences, contacts and receipt metadata.

Revision ID: 0002_auth_profile_preferences
Revises: 0001_initial
Create Date: 2026-09-20 10:20:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_auth_profile_preferences"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("role", sa.Text(), nullable=False, server_default="user"))
        batch_op.add_column(sa.Column("phone", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("photo_url", sa.Text(), nullable=True))

    with op.batch_alter_table("accessibility_preferences") as batch_op:
        batch_op.add_column(sa.Column("screen_reader", sa.Boolean(), nullable=False, server_default="false"))
        batch_op.add_column(sa.Column("literacy_mode", sa.Boolean(), nullable=False, server_default="false"))

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("voice_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("emergency_payment_notifications", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "voice_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("language", sa.Text(), nullable=False, server_default="en"),
        sa.Column("speed", sa.Numeric(3, 2), nullable=False, server_default="1.00"),
        sa.Column("gender", sa.Text(), nullable=False, server_default="default"),
        sa.Column("volume", sa.Numeric(3, 2), nullable=False, server_default="1.00"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "trusted_contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("relationship", sa.Text(), nullable=True),
        sa.Column("notify_on_emergency_payment", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False, unique=True),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )

    with op.batch_alter_table("payment_history") as batch_op:
        batch_op.add_column(sa.Column("receipt_url", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("notification_status", sa.Text(), nullable=False, server_default="pending"))
        batch_op.add_column(sa.Column("qr_scan_id", sa.Integer(), sa.ForeignKey("qr_history.id", name="fk_payment_history_qr_scan_id"), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("payment_history") as batch_op:
        batch_op.drop_column("qr_scan_id")
        batch_op.drop_column("notification_status")
        batch_op.drop_column("receipt_url")
    op.drop_table("refresh_sessions")
    op.drop_table("trusted_contacts")
    op.drop_table("voice_settings")
    op.drop_table("notification_preferences")
    with op.batch_alter_table("accessibility_preferences") as batch_op:
        batch_op.drop_column("literacy_mode")
        batch_op.drop_column("screen_reader")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("photo_url")
        batch_op.drop_column("phone")
        batch_op.drop_column("role")
