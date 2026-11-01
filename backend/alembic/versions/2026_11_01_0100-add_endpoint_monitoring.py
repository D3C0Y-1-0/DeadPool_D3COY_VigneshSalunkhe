"""Add endpoint agent and security event tables.

Revision ID: 31ad8c0f6b21
Revises: ff52bd24cb61
Create Date: 2026-11-01 01:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "31ad8c0f6b21"
down_revision: Union[str, None] = "ff52bd24cb61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "endpoint_agents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("hostname", sa.String(), nullable=False),
        sa.Column("operating_system", sa.String(), nullable=False),
        sa.Column("os_version", sa.String(), nullable=False),
        sa.Column("agent_version", sa.String(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("registered_at", sa.String(), nullable=False),
        sa.Column("last_heartbeat", sa.String(), nullable=True),
        sa.Column("last_event_at", sa.String(), nullable=True),
        sa.Column("revoked_at", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_endpoint_agents_hostname", "endpoint_agents", ["hostname"])
    op.create_index("ix_endpoint_agents_status", "endpoint_agents", ["status"])
    op.create_index("ix_endpoint_agents_token_hash", "endpoint_agents", ["token_hash"])
    op.create_index("ix_endpoint_agents_last_heartbeat", "endpoint_agents", ["last_heartbeat"])

    op.create_table(
        "endpoint_security_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("timestamp", sa.String(), nullable=False),
        sa.Column("received_at", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source_ip", sa.String(), nullable=True),
        sa.Column("raw_event", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["endpoint_agents.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_id", "event_id", name="uq_endpoint_event_agent_event"),
    )
    op.create_index("ix_endpoint_security_events_event_id", "endpoint_security_events", ["event_id"])
    op.create_index("ix_endpoint_security_events_agent_id", "endpoint_security_events", ["agent_id"])
    op.create_index("ix_endpoint_security_events_timestamp", "endpoint_security_events", ["timestamp"])
    op.create_index("ix_endpoint_security_events_received_at", "endpoint_security_events", ["received_at"])
    op.create_index("ix_endpoint_security_events_source", "endpoint_security_events", ["source"])
    op.create_index("ix_endpoint_security_events_event_type", "endpoint_security_events", ["event_type"])
    op.create_index("ix_endpoint_security_events_severity", "endpoint_security_events", ["severity"])
    op.create_index("ix_endpoint_security_events_source_ip", "endpoint_security_events", ["source_ip"])


def downgrade() -> None:
    op.drop_index("ix_endpoint_security_events_source_ip", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_severity", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_event_type", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_source", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_received_at", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_timestamp", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_agent_id", table_name="endpoint_security_events")
    op.drop_index("ix_endpoint_security_events_event_id", table_name="endpoint_security_events")
    op.drop_table("endpoint_security_events")
    op.drop_index("ix_endpoint_agents_last_heartbeat", table_name="endpoint_agents")
    op.drop_index("ix_endpoint_agents_token_hash", table_name="endpoint_agents")
    op.drop_index("ix_endpoint_agents_status", table_name="endpoint_agents")
    op.drop_index("ix_endpoint_agents_hostname", table_name="endpoint_agents")
    op.drop_table("endpoint_agents")
