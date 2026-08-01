"""create risk-service tables (outbox_events, processed_events, risk_evaluations)

Revision ID: 0001
Revises:
Create Date: 2026-07-31

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "outbox_events",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("aggregate_id", sa.String(64), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("retry_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text, nullable=True),
    )
    op.create_index("idx_outbox_events_status_created_at", "outbox_events", ["status", "created_at"])

    op.create_table(
        "processed_events",
        sa.Column("event_id", sa.String(64), primary_key=True),
        sa.Column("consumer_name", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "risk_evaluations",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("payment_id", sa.String(64), nullable=False),
        sa.Column("source_account_id", sa.String(64), nullable=False),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("outcome", sa.String(20), nullable=False),
        sa.Column("evaluation_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_risk_evaluations_source_account_id", "risk_evaluations", ["source_account_id"])
    op.create_index("idx_risk_evaluations_evaluation_date", "risk_evaluations", ["evaluation_date"])


def downgrade() -> None:
    op.drop_table("risk_evaluations")
    op.drop_table("processed_events")
    op.drop_table("outbox_events")
