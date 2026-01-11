"""Application configuration from environment variables."""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Application
    app_name: str = "OpenTerm"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://openterm:openterm@localhost:5432/openterm"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # API Keys (Free Tier)
    fred_api_key: str = ""
    finnhub_api_key: str = ""
    alpha_vantage_api_key: str = ""

    # SEC EDGAR
    sec_user_agent: str = "OpenTerm/0.1 (openterm@example.com)"

    # Feature Flags
    enable_yahoo: bool = True  # Yahoo is unstable; set False to disable
    enable_stooq: bool = True
    enable_edgar: bool = True
    enable_fred: bool = True
    enable_news: bool = True

    # Rate Limits (requests per minute unless specified)
    stooq_rpm: int = 60
    yahoo_rph: int = 100  # per hour
    edgar_rps: int = 8  # per second
    fred_rpm: int = 100
    finnhub_rpm: int = 50

    # Cache TTLs (seconds)
    cache_search_ttl: int = 3600  # 1 hour
    cache_quote_ttl: int = 300  # 5 min
    cache_bars_ttl: int = 86400  # 24 hours
    cache_fundamentals_ttl: int = 3600  # 1 hour
    cache_filings_ttl: int = 900  # 15 min

    # Cache version for invalidation
    cache_version: str = "v1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
