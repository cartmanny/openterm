"""Screener API routes."""
from fastapi import APIRouter, HTTPException

from app.services.screener_service import ScreenerService
from app.schemas.screener import ScreenerRequest, ScreenerResponse, SCREEN_TEMPLATES

router = APIRouter()


@router.post("/", response_model=ScreenerResponse)
async def screen_stocks(request: ScreenerRequest):
    """
    Screen stocks based on criteria.

    Filters support:
    - field: market_cap, pe_trailing, roe, dividend_yield, sector, etc.
    - operator: eq, neq, gt, gte, lt, lte, in, contains

    Example filter:
    {"field": "pe_trailing", "operator": "lt", "value": 15}
    """
    service = ScreenerService()
    return await service.screen(request)


@router.get("/templates", response_model=dict)
async def list_templates():
    """
    List available screen templates.

    Templates are pre-defined filter sets for common screening strategies.
    """
    service = ScreenerService()
    return await service.list_templates()


@router.get("/template/{template_name}", response_model=ScreenerResponse)
async def run_template(template_name: str):
    """
    Run a predefined screen template.

    Available templates:
    - value: Low P/E stocks
    - growth: High revenue growth
    - dividend: High dividend yield
    - quality: High ROE, low debt
    - large_cap: Market cap > $10B
    - small_cap: Market cap $300M - $2B
    """
    service = ScreenerService()
    request = await service.get_template(template_name)

    if not request:
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template_name}' not found. Available: {list(SCREEN_TEMPLATES.keys())}",
        )

    return await service.screen(request)
