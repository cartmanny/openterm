"""Portfolio service with analytics."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID
import math

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.portfolio import Portfolio, Transaction
from app.models.instrument import Instrument
from app.models.price import DailyPrice
from app.schemas.common import ResponseMeta
from app.schemas.portfolio import (
    PortfolioCreate,
    TransactionCreate,
    PortfolioSchema,
    TransactionSchema,
    HoldingSchema,
    PortfolioSummary,
    PortfolioAnalytics,
    PortfolioDetailResponse,
    PortfolioAnalyticsResponse,
)


class PortfolioService:
    """Service for portfolio operations and analytics."""

    async def get_portfolio(self, portfolio_id: UUID) -> PortfolioDetailResponse | None:
        """Get portfolio with holdings and summary."""
        async with async_session_maker() as session:
            # Get portfolio
            result = await session.execute(
                select(Portfolio).where(Portfolio.id == portfolio_id)
            )
            portfolio = result.scalar_one_or_none()

            if not portfolio:
                return None

            # Get holdings
            holdings = await self._calculate_holdings(session, portfolio_id)

            # Calculate summary
            summary = self._calculate_summary(holdings)

            # Count transactions
            tx_count = await session.scalar(
                select(func.count())
                .select_from(Transaction)
                .where(Transaction.portfolio_id == portfolio_id)
            )
            summary.num_transactions = tx_count or 0

            meta = ResponseMeta(
                source="database",
                asof=datetime.now(timezone.utc),
                ingested_at=datetime.now(timezone.utc),
                freshness="delayed",
                quality_flags=[],
            )

            return PortfolioDetailResponse(
                portfolio=PortfolioSchema(
                    id=portfolio.id,
                    name=portfolio.name,
                    description=portfolio.description,
                    currency=portfolio.currency,
                    is_default=portfolio.is_default,
                    created_at=portfolio.created_at,
                    updated_at=portfolio.updated_at,
                ),
                summary=summary,
                holdings=holdings,
                meta=meta,
            )

    async def _calculate_holdings(
        self, session: AsyncSession, portfolio_id: UUID
    ) -> list[HoldingSchema]:
        """Calculate current holdings from transactions."""
        # Get all transactions grouped by instrument
        result = await session.execute(
            select(
                Transaction.instrument_id,
                func.sum(
                    func.case(
                        (Transaction.transaction_type == "buy", Transaction.quantity),
                        (Transaction.transaction_type == "sell", -Transaction.quantity),
                        else_=Decimal("0"),
                    )
                ).label("quantity"),
                func.sum(
                    func.case(
                        (
                            Transaction.transaction_type == "buy",
                            Transaction.quantity * Transaction.price,
                        ),
                        else_=Decimal("0"),
                    )
                ).label("total_cost"),
            )
            .where(Transaction.portfolio_id == portfolio_id)
            .group_by(Transaction.instrument_id)
            .having(
                func.sum(
                    func.case(
                        (Transaction.transaction_type == "buy", Transaction.quantity),
                        (Transaction.transaction_type == "sell", -Transaction.quantity),
                        else_=Decimal("0"),
                    )
                )
                > 0
            )
        )

        holdings_data = result.all()

        holdings = []
        total_value = Decimal("0")

        for row in holdings_data:
            instrument_id = row.instrument_id
            quantity = float(row.quantity)
            total_cost = float(row.total_cost)
            avg_cost = total_cost / quantity if quantity > 0 else 0

            # Get instrument info
            instr_result = await session.execute(
                select(Instrument).where(Instrument.id == instrument_id)
            )
            instrument = instr_result.scalar_one_or_none()

            ticker = instrument.ticker if instrument else str(instrument_id)[:8]
            name = instrument.name if instrument else None

            # Get latest price
            current_price = await self._get_latest_price(session, instrument_id)
            market_value = quantity * current_price if current_price else None

            if market_value:
                total_value += Decimal(str(market_value))

            unrealized_pnl = None
            unrealized_pnl_pct = None
            if current_price and avg_cost > 0:
                unrealized_pnl = (current_price - avg_cost) * quantity
                unrealized_pnl_pct = (current_price / avg_cost - 1) * 100

            holdings.append(
                HoldingSchema(
                    instrument_id=instrument_id,
                    ticker=ticker,
                    name=name,
                    quantity=quantity,
                    avg_cost=avg_cost,
                    current_price=current_price,
                    market_value=market_value,
                    cost_basis=total_cost,
                    unrealized_pnl=unrealized_pnl,
                    unrealized_pnl_pct=unrealized_pnl_pct,
                    weight=None,  # Calculated later
                )
            )

        # Calculate weights
        if total_value > 0:
            for h in holdings:
                if h.market_value:
                    h.weight = float(Decimal(str(h.market_value)) / total_value * 100)

        return holdings

    async def _get_latest_price(
        self, session: AsyncSession, instrument_id: UUID
    ) -> float | None:
        """Get latest price for an instrument."""
        result = await session.execute(
            select(DailyPrice.close)
            .where(DailyPrice.instrument_id == instrument_id)
            .order_by(DailyPrice.date.desc())
            .limit(1)
        )
        price = result.scalar_one_or_none()
        return float(price) if price else None

    def _calculate_summary(self, holdings: list[HoldingSchema]) -> PortfolioSummary:
        """Calculate portfolio summary from holdings."""
        total_value = sum(h.market_value or 0 for h in holdings)
        total_cost = sum(h.cost_basis for h in holdings)
        total_unrealized_pnl = sum(h.unrealized_pnl or 0 for h in holdings)

        return PortfolioSummary(
            total_value=total_value,
            total_cost=total_cost,
            total_unrealized_pnl=total_unrealized_pnl,
            total_unrealized_pnl_pct=(total_unrealized_pnl / total_cost * 100) if total_cost > 0 else 0,
            total_realized_pnl=0,  # Would need to track realized gains separately
            num_holdings=len(holdings),
            num_transactions=0,  # Filled by caller
        )

    async def get_analytics(self, portfolio_id: UUID) -> PortfolioAnalyticsResponse | None:
        """Get portfolio analytics including risk metrics."""
        async with async_session_maker() as session:
            # Get portfolio
            result = await session.execute(
                select(Portfolio).where(Portfolio.id == portfolio_id)
            )
            portfolio = result.scalar_one_or_none()

            if not portfolio:
                return None

            holdings = await self._calculate_holdings(session, portfolio_id)

            if not holdings:
                # Empty portfolio
                analytics = PortfolioAnalytics(
                    return_1d=None,
                    return_1w=None,
                    return_1m=None,
                    return_3m=None,
                    return_ytd=None,
                    return_1y=None,
                    sharpe_ratio=None,
                    sortino_ratio=None,
                    beta=None,
                    alpha=None,
                    volatility=None,
                    max_drawdown=None,
                    var_95=None,
                    top_holdings=[],
                    sector_allocation={},
                )
            else:
                # Calculate returns for each holding
                returns = await self._calculate_portfolio_returns(session, holdings)
                risk_metrics = self._calculate_risk_metrics(returns)

                # Top holdings by weight
                sorted_holdings = sorted(holdings, key=lambda h: h.weight or 0, reverse=True)
                top_holdings = [
                    {"ticker": h.ticker, "weight": round(h.weight or 0, 2)}
                    for h in sorted_holdings[:5]
                ]

                # Sector allocation (would need sector data from instruments)
                sector_allocation = {}

                analytics = PortfolioAnalytics(
                    return_1d=returns.get("1d"),
                    return_1w=returns.get("1w"),
                    return_1m=returns.get("1m"),
                    return_3m=returns.get("3m"),
                    return_ytd=returns.get("ytd"),
                    return_1y=returns.get("1y"),
                    sharpe_ratio=risk_metrics.get("sharpe"),
                    sortino_ratio=risk_metrics.get("sortino"),
                    beta=risk_metrics.get("beta"),
                    alpha=risk_metrics.get("alpha"),
                    volatility=risk_metrics.get("volatility"),
                    max_drawdown=risk_metrics.get("max_drawdown"),
                    var_95=risk_metrics.get("var_95"),
                    top_holdings=top_holdings,
                    sector_allocation=sector_allocation,
                )

            meta = ResponseMeta(
                source="database",
                asof=datetime.now(timezone.utc),
                ingested_at=datetime.now(timezone.utc),
                freshness="delayed",
                quality_flags=[],
            )

            return PortfolioAnalyticsResponse(
                portfolio_id=portfolio_id,
                portfolio_name=portfolio.name,
                analytics=analytics,
                meta=meta,
            )

    async def _calculate_portfolio_returns(
        self, session: AsyncSession, holdings: list[HoldingSchema]
    ) -> dict[str, float | None]:
        """Calculate portfolio returns over various periods."""
        # This is a simplified implementation
        # Full implementation would weight returns by position size

        today = date.today()
        periods = {
            "1d": today - timedelta(days=1),
            "1w": today - timedelta(weeks=1),
            "1m": today - timedelta(days=30),
            "3m": today - timedelta(days=90),
            "ytd": date(today.year, 1, 1),
            "1y": today - timedelta(days=365),
        }

        returns = {}

        for period_name, start_date in periods.items():
            total_start_value = 0.0
            total_end_value = 0.0

            for holding in holdings:
                if holding.current_price and holding.market_value:
                    total_end_value += holding.market_value

                    # Get historical price
                    result = await session.execute(
                        select(DailyPrice.close)
                        .where(
                            and_(
                                DailyPrice.instrument_id == holding.instrument_id,
                                DailyPrice.date >= start_date,
                            )
                        )
                        .order_by(DailyPrice.date.asc())
                        .limit(1)
                    )
                    hist_price = result.scalar_one_or_none()

                    if hist_price:
                        total_start_value += float(hist_price) * holding.quantity

            if total_start_value > 0:
                returns[period_name] = ((total_end_value / total_start_value) - 1) * 100
            else:
                returns[period_name] = None

        return returns

    def _calculate_risk_metrics(self, returns: dict) -> dict[str, float | None]:
        """Calculate risk-adjusted metrics."""
        # Simplified implementation - would need daily returns for proper calculation
        # Using approximations based on period returns

        metrics = {
            "sharpe": None,
            "sortino": None,
            "beta": None,
            "alpha": None,
            "volatility": None,
            "max_drawdown": None,
            "var_95": None,
        }

        # Annualized volatility approximation from 1-month return
        if returns.get("1m") is not None:
            monthly_return = returns["1m"] / 100
            # Approximate volatility assuming this is typical
            metrics["volatility"] = abs(monthly_return) * math.sqrt(12) * 100

        # Sharpe ratio approximation (assuming 4% risk-free rate)
        if returns.get("1y") is not None and metrics["volatility"]:
            annual_return = returns["1y"] / 100
            risk_free = 0.04
            if metrics["volatility"] > 0:
                metrics["sharpe"] = (annual_return - risk_free) / (metrics["volatility"] / 100)

        # Max drawdown approximation from YTD
        if returns.get("ytd") is not None and returns["ytd"] < 0:
            metrics["max_drawdown"] = returns["ytd"]

        return metrics

    async def create_portfolio(self, data: PortfolioCreate) -> PortfolioSchema:
        """Create a new portfolio."""
        async with async_session_maker() as session:
            portfolio = Portfolio(
                name=data.name,
                description=data.description,
                currency=data.currency,
            )
            session.add(portfolio)
            await session.commit()
            await session.refresh(portfolio)

            return PortfolioSchema(
                id=portfolio.id,
                name=portfolio.name,
                description=portfolio.description,
                currency=portfolio.currency,
                is_default=portfolio.is_default,
                created_at=portfolio.created_at,
                updated_at=portfolio.updated_at,
            )

    async def add_transaction(
        self, portfolio_id: UUID, data: TransactionCreate
    ) -> TransactionSchema:
        """Add a transaction to a portfolio."""
        async with async_session_maker() as session:
            transaction = Transaction(
                portfolio_id=portfolio_id,
                instrument_id=data.instrument_id,
                transaction_type=data.transaction_type,
                transaction_date=data.transaction_date,
                quantity=data.quantity,
                price=data.price,
                currency=data.currency,
                fees=data.fees,
                notes=data.notes,
            )
            session.add(transaction)
            await session.commit()
            await session.refresh(transaction)

            return TransactionSchema(
                id=transaction.id,
                portfolio_id=transaction.portfolio_id,
                instrument_id=transaction.instrument_id,
                ticker=None,
                transaction_type=transaction.transaction_type,
                transaction_date=transaction.transaction_date,
                quantity=float(transaction.quantity),
                price=float(transaction.price),
                currency=transaction.currency,
                fees=float(transaction.fees),
                notes=transaction.notes,
                created_at=transaction.created_at,
            )
