"""WebSocket connection manager for real-time data streaming."""

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting."""

    def __init__(self):
        # ticker -> list of connected websockets
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)
        # channel -> list of connected websockets (for general channels like 'tape', 'sectors')
        self.channel_connections: dict[str, list[WebSocket]] = defaultdict(list)
        # Track active streaming tasks
        self.streaming_tasks: dict[str, asyncio.Task] = {}
        # Latest quotes cache for quick access
        self.quote_cache: dict[str, dict[str, Any]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, ticker: str) -> None:
        """Accept a WebSocket connection for a specific ticker."""
        await websocket.accept()
        async with self._lock:
            self.active_connections[ticker].append(websocket)
            logger.info(f"Client connected to {ticker}. Total connections: {len(self.active_connections[ticker])}")

    async def connect_channel(self, websocket: WebSocket, channel: str) -> None:
        """Accept a WebSocket connection for a general channel."""
        await websocket.accept()
        async with self._lock:
            self.channel_connections[channel].append(websocket)
            logger.info(f"Client connected to channel {channel}. Total: {len(self.channel_connections[channel])}")

    async def disconnect(self, websocket: WebSocket, ticker: str) -> None:
        """Remove a WebSocket connection for a ticker."""
        async with self._lock:
            if websocket in self.active_connections[ticker]:
                self.active_connections[ticker].remove(websocket)
                logger.info(f"Client disconnected from {ticker}. Remaining: {len(self.active_connections[ticker])}")

                # Clean up empty ticker subscriptions
                if not self.active_connections[ticker]:
                    del self.active_connections[ticker]
                    # Cancel streaming task if no subscribers
                    if ticker in self.streaming_tasks:
                        self.streaming_tasks[ticker].cancel()
                        del self.streaming_tasks[ticker]

    async def disconnect_channel(self, websocket: WebSocket, channel: str) -> None:
        """Remove a WebSocket connection from a channel."""
        async with self._lock:
            if websocket in self.channel_connections[channel]:
                self.channel_connections[channel].remove(websocket)
                if not self.channel_connections[channel]:
                    del self.channel_connections[channel]

    async def broadcast_to_ticker(self, ticker: str, message: dict[str, Any]) -> None:
        """Broadcast a message to all clients subscribed to a ticker."""
        if ticker not in self.active_connections:
            return

        # Add timestamp
        message["timestamp"] = datetime.utcnow().isoformat()

        # Update cache
        self.quote_cache[ticker] = message

        # Send to all connected clients
        disconnected = []
        for connection in self.active_connections[ticker]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message to client: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            await self.disconnect(conn, ticker)

    async def broadcast_to_channel(self, channel: str, message: dict[str, Any]) -> None:
        """Broadcast a message to all clients on a channel."""
        if channel not in self.channel_connections:
            return

        message["timestamp"] = datetime.utcnow().isoformat()

        disconnected = []
        for connection in self.channel_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message to channel {channel}: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            await self.disconnect_channel(conn, channel)

    def get_ticker_subscribers(self, ticker: str) -> int:
        """Get number of subscribers for a ticker."""
        return len(self.active_connections.get(ticker, []))

    def get_all_subscribed_tickers(self) -> list[str]:
        """Get list of all tickers with active subscribers."""
        return list(self.active_connections.keys())

    def get_cached_quote(self, ticker: str) -> dict[str, Any] | None:
        """Get cached quote for a ticker."""
        return self.quote_cache.get(ticker)


# Global connection manager instance
stream_manager = ConnectionManager()
