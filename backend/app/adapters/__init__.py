"""Data source adapters."""
from app.adapters.base import BaseAdapter, SourceHealth
from app.adapters.stooq import StooqAdapter
from app.adapters.yahoo import YahooFinanceAdapter
from app.adapters.sec_edgar import SECEdgarAdapter

__all__ = [
    "BaseAdapter",
    "SourceHealth",
    "StooqAdapter",
    "YahooFinanceAdapter",
    "SECEdgarAdapter",
]
