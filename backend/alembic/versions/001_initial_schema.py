"""Initial schema.

Revision ID: 001
Create Date: 2024-01-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Instruments table
    op.create_table(
        "instruments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("figi", sa.String(12), unique=True, nullable=True),
        sa.Column("isin", sa.String(12), nullable=True),
        sa.Column("cusip", sa.String(9), nullable=True),
        sa.Column("cik", sa.String(10), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("short_name", sa.String(100), nullable=True),
        sa.Column("security_type", sa.String(50), nullable=False, server_default="equity"),
        sa.Column("sector", sa.String(100), nullable=True),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("sic_code", sa.String(4), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("asof", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("quality_flags", postgresql.ARRAY(sa.Text), server_default="{}"),
        sa.Column("extra", postgresql.JSONB, server_default="{}"),
    )
    op.create_index("idx_instruments_type", "instruments", ["security_type"])
    op.create_index("idx_instruments_sector", "instruments", ["sector"])

    # Listings table
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exchange", sa.String(20), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False, index=True),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("asof", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_listings_instrument", "listings", ["instrument_id"])

    # Daily prices table
    op.create_table(
        "daily_prices",
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("trade_date", sa.Date, primary_key=True),
        sa.Column("open", sa.Numeric(20, 6), nullable=True),
        sa.Column("high", sa.Numeric(20, 6), nullable=True),
        sa.Column("low", sa.Numeric(20, 6), nullable=True),
        sa.Column("close", sa.Numeric(20, 6), nullable=False),
        sa.Column("adj_close", sa.Numeric(20, 6), nullable=True),
        sa.Column("volume", sa.BigInteger, nullable=True),
        sa.Column("currency", sa.String(3), server_default="USD"),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("asof", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("quality_flags", postgresql.ARRAY(sa.Text), server_default="{}"),
    )
    op.create_index("idx_daily_prices_date", "daily_prices", ["trade_date"])
    op.create_index("idx_daily_prices_source", "daily_prices", ["source"])

    # Fundamentals table
    op.create_table(
        "fundamentals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("period_type", sa.String(10), nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("fiscal_year", sa.Integer, nullable=True),
        sa.Column("fiscal_quarter", sa.Integer, nullable=True),
        sa.Column("market_cap", sa.BigInteger, nullable=True),
        sa.Column("enterprise_value", sa.BigInteger, nullable=True),
        sa.Column("shares_outstanding", sa.BigInteger, nullable=True),
        sa.Column("float_shares", sa.BigInteger, nullable=True),
        sa.Column("pe_trailing", sa.Numeric(10, 4), nullable=True),
        sa.Column("pe_forward", sa.Numeric(10, 4), nullable=True),
        sa.Column("peg_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("price_to_book", sa.Numeric(10, 4), nullable=True),
        sa.Column("price_to_sales", sa.Numeric(10, 4), nullable=True),
        sa.Column("ev_to_ebitda", sa.Numeric(10, 4), nullable=True),
        sa.Column("revenue", sa.BigInteger, nullable=True),
        sa.Column("gross_profit", sa.BigInteger, nullable=True),
        sa.Column("operating_income", sa.BigInteger, nullable=True),
        sa.Column("net_income", sa.BigInteger, nullable=True),
        sa.Column("ebitda", sa.BigInteger, nullable=True),
        sa.Column("eps", sa.Numeric(10, 4), nullable=True),
        sa.Column("eps_diluted", sa.Numeric(10, 4), nullable=True),
        sa.Column("gross_margin", sa.Numeric(10, 6), nullable=True),
        sa.Column("operating_margin", sa.Numeric(10, 6), nullable=True),
        sa.Column("profit_margin", sa.Numeric(10, 6), nullable=True),
        sa.Column("total_assets", sa.BigInteger, nullable=True),
        sa.Column("total_liabilities", sa.BigInteger, nullable=True),
        sa.Column("total_equity", sa.BigInteger, nullable=True),
        sa.Column("total_debt", sa.BigInteger, nullable=True),
        sa.Column("cash", sa.BigInteger, nullable=True),
        sa.Column("roe", sa.Numeric(10, 6), nullable=True),
        sa.Column("roa", sa.Numeric(10, 6), nullable=True),
        sa.Column("roic", sa.Numeric(10, 6), nullable=True),
        sa.Column("debt_to_equity", sa.Numeric(10, 4), nullable=True),
        sa.Column("debt_to_ebitda", sa.Numeric(10, 4), nullable=True),
        sa.Column("current_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("quick_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("dividend_yield", sa.Numeric(10, 6), nullable=True),
        sa.Column("payout_ratio", sa.Numeric(10, 6), nullable=True),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("asof", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("quality_flags", postgresql.ARRAY(sa.Text), server_default="{}"),
        sa.Column("extra", postgresql.JSONB, server_default="{}"),
        sa.UniqueConstraint("instrument_id", "period_type", "period_end"),
    )
    op.create_index("idx_fundamentals_period", "fundamentals", ["period_end"])
    op.create_index("idx_fundamentals_market_cap", "fundamentals", ["market_cap"])

    # Filings table
    op.create_table(
        "filings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("cik", sa.String(10), nullable=False, index=True),
        sa.Column("accession_number", sa.String(25), nullable=False, unique=True),
        sa.Column("form_type", sa.String(20), nullable=False, index=True),
        sa.Column("filing_date", sa.Date, nullable=False),
        sa.Column("accepted_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("primary_document", sa.String(255), nullable=True),
        sa.Column("primary_doc_url", sa.String(500), nullable=True),
        sa.Column("title", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("is_amended", sa.Boolean, server_default="false"),
        sa.Column("amendment_of", postgresql.UUID(as_uuid=True), sa.ForeignKey("filings.id"), nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="sec_edgar"),
        sa.Column("asof", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("quality_flags", postgresql.ARRAY(sa.Text), server_default="{}"),
        sa.Column("extra", postgresql.JSONB, server_default="{}"),
    )
    op.create_index("idx_filings_date", "filings", ["filing_date"])

    # Watchlists table
    op.create_table(
        "watchlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(100), nullable=False, server_default="Default"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Watchlist items table
    op.create_table(
        "watchlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("watchlist_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_watchlist_items_watchlist", "watchlist_items", ["watchlist_id"])
    op.create_index("idx_watchlist_items_instrument", "watchlist_items", ["instrument_id"])

    # Portfolios table
    op.create_table(
        "portfolios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(100), nullable=False, server_default="Main Portfolio"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("currency", sa.String(3), server_default="USD"),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Transactions table
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("instrument_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("instruments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("transaction_date", sa.Date, nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("price", sa.Numeric(20, 6), nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD"),
        sa.Column("fees", sa.Numeric(20, 6), server_default="0"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_transactions_portfolio", "transactions", ["portfolio_id"])
    op.create_index("idx_transactions_instrument", "transactions", ["instrument_id"])
    op.create_index("idx_transactions_date", "transactions", ["transaction_date"])

    # Macro series table
    op.create_table(
        "macro_series",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("units", sa.String(100), nullable=True),
        sa.Column("frequency", sa.String(20), nullable=True),
        sa.Column("seasonal_adjustment", sa.String(50), nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="fred"),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Macro observations table
    op.create_table(
        "macro_observations",
        sa.Column("series_id", sa.String(50), sa.ForeignKey("macro_series.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("observation_date", sa.Date, primary_key=True),
        sa.Column("value", sa.Numeric(20, 6), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_macro_obs_date", "macro_observations", ["observation_date"])


def downgrade() -> None:
    op.drop_table("macro_observations")
    op.drop_table("macro_series")
    op.drop_table("transactions")
    op.drop_table("portfolios")
    op.drop_table("watchlist_items")
    op.drop_table("watchlists")
    op.drop_table("filings")
    op.drop_table("fundamentals")
    op.drop_table("daily_prices")
    op.drop_table("listings")
    op.drop_table("instruments")
