"""Portfolio API routes."""
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.services.portfolio_service import PortfolioService
from app.schemas.portfolio import (
    PortfolioCreate,
    TransactionCreate,
    PortfolioSchema,
    TransactionSchema,
    PortfolioDetailResponse,
    PortfolioAnalyticsResponse,
)

router = APIRouter()


@router.post("/", response_model=PortfolioSchema)
async def create_portfolio(data: PortfolioCreate):
    """Create a new portfolio."""
    service = PortfolioService()
    return await service.create_portfolio(data)


@router.get("/{portfolio_id}", response_model=PortfolioDetailResponse)
async def get_portfolio(portfolio_id: UUID):
    """
    Get portfolio details with holdings and summary.

    Returns current holdings, cost basis, unrealized P&L,
    and portfolio-level statistics.
    """
    service = PortfolioService()
    result = await service.get_portfolio(portfolio_id)

    if not result:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return result


@router.get("/{portfolio_id}/analytics", response_model=PortfolioAnalyticsResponse)
async def get_portfolio_analytics(portfolio_id: UUID):
    """
    Get portfolio analytics and risk metrics.

    Returns:
    - Returns over various periods (1d, 1w, 1m, 3m, YTD, 1Y)
    - Risk-adjusted metrics (Sharpe, Sortino, Beta, Alpha)
    - Risk metrics (Volatility, Max Drawdown, VaR)
    - Allocation breakdown (Top holdings, Sector allocation)
    """
    service = PortfolioService()
    result = await service.get_analytics(portfolio_id)

    if not result:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return result


@router.post("/{portfolio_id}/transactions", response_model=TransactionSchema)
async def add_transaction(portfolio_id: UUID, data: TransactionCreate):
    """
    Add a transaction to a portfolio.

    Transaction types:
    - buy: Purchase shares
    - sell: Sell shares
    - dividend: Dividend payment
    - split: Stock split adjustment
    """
    service = PortfolioService()
    return await service.add_transaction(portfolio_id, data)
