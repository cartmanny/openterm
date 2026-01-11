"""Real-time data streaming from multiple sources."""

import asyncio
import logging
from datetime import datetime
from typing import Any

import aiohttp

from app.core.config import settings
from app.websocket.manager import stream_manager

logger = logging.getLogger(__name__)


class DataStreamer:
    """Streams real-time data from multiple free sources."""

    def __init__(self):
        self.running = False
        self._session: aiohttp.ClientSession | None = None
        self._binance_ws: aiohttp.ClientWebSocketResponse | None = None
        self._sector_data: dict[str, dict] = {}

    async def start(self) -> None:
        """Start the data streaming service."""
        if self.running:
            return
        self.running = True
        self._session = aiohttp.ClientSession()
        logger.info("Data streamer started")

    async def stop(self) -> None:
        """Stop the data streaming service."""
        self.running = False
        if self._binance_ws:
            await self._binance_ws.close()
        if self._session:
            await self._session.close()
        logger.info("Data streamer stopped")

    async def stream_ticker(self, ticker: str) -> None:
        """Stream real-time data for a specific ticker."""
        logger.info(f"Starting stream for {ticker}")

        while self.running and stream_manager.get_ticker_subscribers(ticker) > 0:
            try:
                quote = await self._get_quote(ticker)
                if quote:
                    await stream_manager.broadcast_to_ticker(ticker, {
                        "type": "quote",
                        "ticker": ticker,
                        **quote
                    })
            except Exception as e:
                logger.error(f"Error streaming {ticker}: {e}")

            # Poll interval - 5 seconds for free tier rate limits
            await asyncio.sleep(5)

        logger.info(f"Stopped streaming {ticker}")

    async def _get_quote(self, ticker: str) -> dict[str, Any] | None:
        """Get real-time quote from available sources."""
        if not self._session:
            return None

        # Try Alpha Vantage first (if key available)
        if settings.alpha_vantage_api_key:
            quote = await self._get_alpha_vantage_quote(ticker)
            if quote:
                return quote

        # Fall back to Yahoo Finance
        quote = await self._get_yahoo_quote(ticker)
        return quote

    async def _get_alpha_vantage_quote(self, ticker: str) -> dict[str, Any] | None:
        """Get quote from Alpha Vantage."""
        try:
            url = "https://www.alphavantage.co/query"
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": ticker,
                "apikey": settings.alpha_vantage_api_key
            }
            async with self._session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    quote_data = data.get("Global Quote", {})
                    if quote_data:
                        price = float(quote_data.get("05. price", 0))
                        prev_close = float(quote_data.get("08. previous close", price))
                        change = price - prev_close
                        change_pct = (change / prev_close * 100) if prev_close else 0

                        return {
                            "price": price,
                            "change": change,
                            "change_percent": round(change_pct, 2),
                            "volume": int(quote_data.get("06. volume", 0)),
                            "high": float(quote_data.get("03. high", 0)),
                            "low": float(quote_data.get("04. low", 0)),
                            "open": float(quote_data.get("02. open", 0)),
                            "source": "alphavantage"
                        }
        except Exception as e:
            logger.debug(f"Alpha Vantage error for {ticker}: {e}")
        return None

    async def _get_yahoo_quote(self, ticker: str) -> dict[str, Any] | None:
        """Get quote from Yahoo Finance."""
        try:
            url = f"https://query1.finance.yahoo.com/v7/finance/quote"
            params = {"symbols": ticker}
            headers = {"User-Agent": "Mozilla/5.0"}

            async with self._session.get(url, params=params, headers=headers, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    result = data.get("quoteResponse", {}).get("result", [])
                    if result:
                        q = result[0]
                        return {
                            "price": q.get("regularMarketPrice", 0),
                            "change": q.get("regularMarketChange", 0),
                            "change_percent": round(q.get("regularMarketChangePercent", 0), 2),
                            "volume": q.get("regularMarketVolume", 0),
                            "high": q.get("regularMarketDayHigh", 0),
                            "low": q.get("regularMarketDayLow", 0),
                            "open": q.get("regularMarketOpen", 0),
                            "market_cap": q.get("marketCap", 0),
                            "source": "yahoo"
                        }
        except Exception as e:
            logger.debug(f"Yahoo error for {ticker}: {e}")
        return None


class CryptoStreamer:
    """Streams real-time crypto data from Binance WebSocket (FREE, no API key)."""

    BINANCE_WS_URL = "wss://stream.binance.com:9443/ws"

    def __init__(self):
        self.running = False
        self._session: aiohttp.ClientSession | None = None
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._subscribed_symbols: set[str] = set()

    async def start(self) -> None:
        """Start the crypto streaming service."""
        if self.running:
            return
        self.running = True
        self._session = aiohttp.ClientSession()
        logger.info("Crypto streamer started")

    async def stop(self) -> None:
        """Stop the crypto streaming service."""
        self.running = False
        if self._ws:
            await self._ws.close()
        if self._session:
            await self._session.close()
        logger.info("Crypto streamer stopped")

    async def stream_crypto(self, symbol: str) -> None:
        """Stream real-time data for a crypto pair (e.g., BTCUSDT)."""
        symbol_lower = symbol.lower()
        stream_url = f"{self.BINANCE_WS_URL}/{symbol_lower}@trade"

        logger.info(f"Starting crypto stream for {symbol}")

        try:
            async with self._session.ws_connect(stream_url) as ws:
                async for msg in ws:
                    if not self.running or stream_manager.get_ticker_subscribers(symbol) == 0:
                        break

                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = msg.json()
                        await stream_manager.broadcast_to_ticker(symbol, {
                            "type": "trade",
                            "ticker": symbol,
                            "price": float(data.get("p", 0)),
                            "quantity": float(data.get("q", 0)),
                            "trade_time": data.get("T", 0),
                            "source": "binance"
                        })
                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        break
        except Exception as e:
            logger.error(f"Crypto stream error for {symbol}: {e}")

        logger.info(f"Stopped crypto stream for {symbol}")

    async def stream_orderbook(self, symbol: str) -> None:
        """Stream real-time order book for a crypto pair."""
        symbol_lower = symbol.lower()
        stream_url = f"{self.BINANCE_WS_URL}/{symbol_lower}@depth20@100ms"

        logger.info(f"Starting orderbook stream for {symbol}")

        try:
            async with self._session.ws_connect(stream_url) as ws:
                async for msg in ws:
                    if not self.running:
                        break

                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = msg.json()
                        await stream_manager.broadcast_to_channel(f"orderbook:{symbol}", {
                            "type": "orderbook",
                            "ticker": symbol,
                            "bids": [[float(p), float(q)] for p, q in data.get("bids", [])[:10]],
                            "asks": [[float(p), float(q)] for p, q in data.get("asks", [])[:10]],
                            "source": "binance"
                        })
                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        break
        except Exception as e:
            logger.error(f"Orderbook stream error for {symbol}: {e}")


class SectorStreamer:
    """Streams sector performance data for market heatmap."""

    # Major sector ETFs
    SECTOR_ETFS = {
        "Technology": "XLK",
        "Healthcare": "XLV",
        "Financials": "XLF",
        "Energy": "XLE",
        "Consumer Discretionary": "XLY",
        "Consumer Staples": "XLP",
        "Industrials": "XLI",
        "Materials": "XLB",
        "Real Estate": "XLRE",
        "Utilities": "XLU",
        "Communications": "XLC"
    }

    def __init__(self):
        self.running = False
        self._session: aiohttp.ClientSession | None = None

    async def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._session = aiohttp.ClientSession()
        logger.info("Sector streamer started")

    async def stop(self) -> None:
        self.running = False
        if self._session:
            await self._session.close()
        logger.info("Sector streamer stopped")

    async def stream_sectors(self) -> None:
        """Stream sector performance data."""
        logger.info("Starting sector stream")

        while self.running and len(stream_manager.channel_connections.get("sectors", [])) > 0:
            try:
                sectors = await self._get_sector_data()
                if sectors:
                    await stream_manager.broadcast_to_channel("sectors", {
                        "type": "sectors",
                        "sectors": sectors
                    })
            except Exception as e:
                logger.error(f"Sector stream error: {e}")

            await asyncio.sleep(30)  # Update every 30 seconds

        logger.info("Stopped sector stream")

    async def _get_sector_data(self) -> list[dict[str, Any]]:
        """Get sector performance from Yahoo Finance."""
        sectors = []
        tickers = ",".join(self.SECTOR_ETFS.values())

        try:
            url = f"https://query1.finance.yahoo.com/v7/finance/quote"
            params = {"symbols": tickers}
            headers = {"User-Agent": "Mozilla/5.0"}

            async with self._session.get(url, params=params, headers=headers, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = data.get("quoteResponse", {}).get("result", [])

                    for result in results:
                        symbol = result.get("symbol")
                        sector_name = next(
                            (name for name, etf in self.SECTOR_ETFS.items() if etf == symbol),
                            None
                        )
                        if sector_name:
                            sectors.append({
                                "name": sector_name,
                                "ticker": symbol,
                                "price": result.get("regularMarketPrice", 0),
                                "change": round(result.get("regularMarketChangePercent", 0), 2),
                                "volume": result.get("regularMarketVolume", 0)
                            })
        except Exception as e:
            logger.error(f"Error fetching sector data: {e}")

        return sorted(sectors, key=lambda x: x["change"], reverse=True)


class TickerTapeStreamer:
    """Streams ticker tape data (top movers, trending stocks)."""

    # Major indices and popular stocks for tape
    TAPE_SYMBOLS = [
        "SPY", "QQQ", "DIA", "IWM",  # Indices
        "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",  # Mega caps
        "BTC-USD", "ETH-USD"  # Crypto
    ]

    def __init__(self):
        self.running = False
        self._session: aiohttp.ClientSession | None = None

    async def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._session = aiohttp.ClientSession()
        logger.info("Ticker tape streamer started")

    async def stop(self) -> None:
        self.running = False
        if self._session:
            await self._session.close()

    async def stream_tape(self) -> None:
        """Stream ticker tape data."""
        logger.info("Starting ticker tape stream")

        while self.running and len(stream_manager.channel_connections.get("tape", [])) > 0:
            try:
                quotes = await self._get_tape_data()
                if quotes:
                    await stream_manager.broadcast_to_channel("tape", {
                        "type": "tape",
                        "quotes": quotes
                    })
            except Exception as e:
                logger.error(f"Tape stream error: {e}")

            await asyncio.sleep(10)  # Update every 10 seconds

        logger.info("Stopped ticker tape stream")

    async def _get_tape_data(self) -> list[dict[str, Any]]:
        """Get quotes for ticker tape."""
        quotes = []
        tickers = ",".join(self.TAPE_SYMBOLS)

        try:
            url = f"https://query1.finance.yahoo.com/v7/finance/quote"
            params = {"symbols": tickers}
            headers = {"User-Agent": "Mozilla/5.0"}

            async with self._session.get(url, params=params, headers=headers, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = data.get("quoteResponse", {}).get("result", [])

                    for result in results:
                        quotes.append({
                            "symbol": result.get("symbol"),
                            "price": result.get("regularMarketPrice", 0),
                            "change": round(result.get("regularMarketChangePercent", 0), 2)
                        })
        except Exception as e:
            logger.error(f"Error fetching tape data: {e}")

        return quotes


# Global instances
data_streamer = DataStreamer()
crypto_streamer = CryptoStreamer()
sector_streamer = SectorStreamer()
ticker_tape_streamer = TickerTapeStreamer()
