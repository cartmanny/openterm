"""Screener service for stock screening."""
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.screener import DerivedFacts
from app.models.fundamentals import Fundamentals
from app.models.instrument import Instrument
from app.schemas.common import ResponseMeta
from app.schemas.screener import (
    ScreenerFilter,
    ScreenerRequest,
    ScreenerResult,
    ScreenerResultData,
    ScreenerMeta,
    ScreenerResponse,
    SCREEN_TEMPLATES,
)


class ScreenerService:
    """Service for screening stocks based on criteria."""

    # Map filter fields to model columns
    FIELD_MAP = {
        "ticker": DerivedFacts.ticker,
        "sector": DerivedFacts.sector,
        "industry": DerivedFacts.industry,
        "market_cap": DerivedFacts.market_cap,
        "pe_trailing": DerivedFacts.pe_trailing,
        "pe_forward": DerivedFacts.pe_forward,
        "peg_ratio": DerivedFacts.peg_ratio,
        "price_to_book": DerivedFacts.price_to_book,
        "price_to_sales": DerivedFacts.price_to_sales,
        "gross_margin": DerivedFacts.gross_margin,
        "operating_margin": DerivedFacts.operating_margin,
        "profit_margin": DerivedFacts.profit_margin,
        "roe": DerivedFacts.roe,
        "roa": DerivedFacts.roa,
        "dividend_yield": DerivedFacts.dividend_yield,
        "payout_ratio": DerivedFacts.payout_ratio,
        "debt_to_equity": DerivedFacts.debt_to_equity,
        "current_ratio": DerivedFacts.current_ratio,
        "price_change_1d": DerivedFacts.price_change_1d,
        "price_change_ytd": DerivedFacts.price_change_ytd,
        "price_change_1y": DerivedFacts.price_change_1y,
        "revenue_growth_yoy": DerivedFacts.revenue_growth_yoy,
        "eps_growth_yoy": DerivedFacts.eps_growth_yoy,
    }

    def _build_filter(self, f: ScreenerFilter) -> Any:
        """Convert a ScreenerFilter to SQLAlchemy expression."""
        column = self.FIELD_MAP.get(f.field)
        if column is None:
            return None

        if f.operator == "eq":
            return column == f.value
        elif f.operator == "neq":
            return column != f.value
        elif f.operator == "gt":
            return column > f.value
        elif f.operator == "gte":
            return column >= f.value
        elif f.operator == "lt":
            return column < f.value
        elif f.operator == "lte":
            return column <= f.value
        elif f.operator == "in":
            return column.in_(f.value if isinstance(f.value, list) else [f.value])
        elif f.operator == "contains":
            return column.ilike(f"%{f.value}%")
        return None

    async def screen(self, request: ScreenerRequest) -> ScreenerResponse:
        """
        Screen stocks based on criteria.

        Args:
            request: ScreenerRequest with filters, sort, limit, offset

        Returns:
            ScreenerResponse with matching stocks
        """
        async with async_session_maker() as session:
            # Build base query
            query = select(DerivedFacts)

            # Apply filters
            conditions = []
            for f in request.filters:
                condition = self._build_filter(f)
                if condition is not None:
                    conditions.append(condition)

            if conditions:
                query = query.where(and_(*conditions))

            # Get total count
            count_query = select(func.count()).select_from(
                query.subquery()
            )
            total_count = await session.scalar(count_query) or 0

            # Apply sorting
            if request.sort:
                sort_column = self.FIELD_MAP.get(request.sort.field, DerivedFacts.market_cap)
                if request.sort.order == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(DerivedFacts.market_cap))

            # Apply pagination
            query = query.offset(request.offset).limit(request.limit)

            # Execute
            result = await session.execute(query)
            rows = result.scalars().all()

            # Convert to response
            results = [
                ScreenerResult(
                    instrument_id=row.instrument_id,
                    ticker=row.ticker,
                    name=row.company_name or row.ticker,
                    sector=row.sector,
                    industry=row.industry,
                    market_cap=row.market_cap,
                    pe_trailing=float(row.pe_trailing) if row.pe_trailing else None,
                    roe=float(row.roe) if row.roe else None,
                    profit_margin=float(row.profit_margin) if row.profit_margin else None,
                    debt_to_equity=float(row.debt_to_equity) if row.debt_to_equity else None,
                    dividend_yield=float(row.dividend_yield) if row.dividend_yield else None,
                    price=float(row.last_price) if row.last_price else None,
                    return_1m=float(row.price_change_1m) if row.price_change_1m else None,
                    return_3m=float(row.price_change_3m) if row.price_change_3m else None,
                    return_1y=float(row.price_change_1y) if row.price_change_1y else None,
                )
                for row in rows
            ]

            data = ScreenerResultData(
                results=results,
                total_count=total_count,
                filters_applied=len(request.filters),
            )

            meta = ScreenerMeta(
                source="database",
                asof=datetime.now(timezone.utc),
                ingested_at=datetime.now(timezone.utc),
                freshness="delayed",
                quality_flags=[],
                note=f"Screened {total_count} stocks matching {len(request.filters)} filters",
            )

            return ScreenerResponse(data=data, meta=meta)

    async def get_template(self, template_name: str) -> ScreenerRequest | None:
        """Get a predefined screen template as a request."""
        template = SCREEN_TEMPLATES.get(template_name.lower())
        if not template:
            return None

        filters = [
            ScreenerFilter(**f)
            for f in template.get("filters", [])
        ]

        return ScreenerRequest(filters=filters)

    async def list_templates(self) -> dict[str, dict]:
        """List available screen templates."""
        return {
            name: {"name": t["name"], "description": t["description"]}
            for name, t in SCREEN_TEMPLATES.items()
        }
