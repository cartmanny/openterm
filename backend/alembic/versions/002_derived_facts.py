"""Add derived_facts table for screener.

Revision ID: 002
Create Date: 2024-01-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Derived facts table for fast screening
    op.create_table(
        "derived_facts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="CASCADE"), nullable=False, unique=True),

        # Identifiers (denormalized)
        sa.Column("ticker", sa.String(20), nullable=False, index=True),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("sector", sa.String(100), nullable=True, index=True),
        sa.Column("industry", sa.String(100), nullable=True),

        # Price Metrics
        sa.Column("last_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("price_change_1d", sa.Numeric(10, 6), nullable=True),
        sa.Column("price_change_5d", sa.Numeric(10, 6), nullable=True),
        sa.Column("price_change_1m", sa.Numeric(10, 6), nullable=True),
        sa.Column("price_change_3m", sa.Numeric(10, 6), nullable=True),
        sa.Column("price_change_ytd", sa.Numeric(10, 6), nullable=True),
        sa.Column("price_change_1y", sa.Numeric(10, 6), nullable=True),
        sa.Column("high_52w", sa.Numeric(18, 6), nullable=True),
        sa.Column("low_52w", sa.Numeric(18, 6), nullable=True),
        sa.Column("from_52w_high", sa.Numeric(10, 6), nullable=True),
        sa.Column("from_52w_low", sa.Numeric(10, 6), nullable=True),

        # Volume Metrics
        sa.Column("avg_volume_10d", sa.BigInteger, nullable=True),
        sa.Column("avg_volume_3m", sa.BigInteger, nullable=True),
        sa.Column("relative_volume", sa.Numeric(10, 4), nullable=True),

        # Valuation
        sa.Column("market_cap", sa.BigInteger, nullable=True, index=True),
        sa.Column("enterprise_value", sa.BigInteger, nullable=True),
        sa.Column("pe_trailing", sa.Numeric(10, 4), nullable=True, index=True),
        sa.Column("pe_forward", sa.Numeric(10, 4), nullable=True),
        sa.Column("peg_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("price_to_book", sa.Numeric(10, 4), nullable=True),
        sa.Column("price_to_sales", sa.Numeric(10, 4), nullable=True),
        sa.Column("ev_to_ebitda", sa.Numeric(10, 4), nullable=True),

        # Growth
        sa.Column("revenue_growth_yoy", sa.Numeric(10, 6), nullable=True),
        sa.Column("eps_growth_yoy", sa.Numeric(10, 6), nullable=True),

        # Profitability
        sa.Column("gross_margin", sa.Numeric(10, 6), nullable=True),
        sa.Column("operating_margin", sa.Numeric(10, 6), nullable=True),
        sa.Column("profit_margin", sa.Numeric(10, 6), nullable=True),
        sa.Column("roe", sa.Numeric(10, 6), nullable=True, index=True),
        sa.Column("roa", sa.Numeric(10, 6), nullable=True),

        # Dividend
        sa.Column("dividend_yield", sa.Numeric(10, 6), nullable=True, index=True),
        sa.Column("payout_ratio", sa.Numeric(10, 6), nullable=True),

        # Leverage
        sa.Column("debt_to_equity", sa.Numeric(10, 4), nullable=True),
        sa.Column("current_ratio", sa.Numeric(10, 4), nullable=True),

        # Volatility
        sa.Column("beta", sa.Numeric(10, 4), nullable=True),
        sa.Column("volatility_30d", sa.Numeric(10, 6), nullable=True),

        # Data Lineage
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("quality_flags", postgresql.ARRAY(sa.Text), server_default="{}"),
        sa.Column("extra", postgresql.JSONB, server_default="{}"),
    )

    # Composite indexes for common screening patterns
    op.create_index("idx_derived_facts_instrument", "derived_facts", ["instrument_id"])
    op.create_index("idx_derived_facts_sector_mcap", "derived_facts", ["sector", "market_cap"])
    op.create_index("idx_derived_facts_div_yield", "derived_facts", ["dividend_yield"])
    op.create_index("idx_derived_facts_pe", "derived_facts", ["pe_trailing"])


def downgrade() -> None:
    op.drop_table("derived_facts")
