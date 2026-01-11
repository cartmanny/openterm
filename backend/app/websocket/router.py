"""WebSocket endpoints for real-time data streaming."""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import stream_manager
from app.websocket.streamer import (
    data_streamer,
    crypto_streamer,
    sector_streamer,
    ticker_tape_streamer,
)

logger = logging.getLogger(__name__)

ws_router = APIRouter()


@ws_router.websocket("/stream/{ticker}")
async def websocket_stream(websocket: WebSocket, ticker: str):
    """
    WebSocket endpoint for streaming real-time ticker data.

    Connects to the stream for a specific ticker (e.g., AAPL, MSFT).
    Automatically starts streaming when first client connects.
    """
    await stream_manager.connect(websocket, ticker.upper())
    ticker_upper = ticker.upper()

    # Start streaming task if not already running
    if ticker_upper not in stream_manager.streaming_tasks:
        # Check if it's a crypto pair
        if ticker_upper.endswith("USDT") or ticker_upper.endswith("USD"):
            task = asyncio.create_task(crypto_streamer.stream_crypto(ticker_upper))
        else:
            task = asyncio.create_task(data_streamer.stream_ticker(ticker_upper))
        stream_manager.streaming_tasks[ticker_upper] = task

    try:
        # Send cached quote immediately if available
        cached = stream_manager.get_cached_quote(ticker_upper)
        if cached:
            await websocket.send_json(cached)

        # Keep connection alive
        while True:
            try:
                # Wait for any messages from client (ping/pong, unsubscribe, etc.)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except Exception:
                    break
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from {ticker_upper}")
    except Exception as e:
        logger.error(f"WebSocket error for {ticker_upper}: {e}")
    finally:
        await stream_manager.disconnect(websocket, ticker_upper)


@ws_router.websocket("/crypto/{symbol}")
async def websocket_crypto(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint for streaming real-time crypto data from Binance.

    Symbol should be in Binance format (e.g., BTCUSDT, ETHUSDT).
    """
    symbol_upper = symbol.upper()
    await stream_manager.connect(websocket, symbol_upper)

    # Start crypto streaming
    if symbol_upper not in stream_manager.streaming_tasks:
        task = asyncio.create_task(crypto_streamer.stream_crypto(symbol_upper))
        stream_manager.streaming_tasks[symbol_upper] = task

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        await stream_manager.disconnect(websocket, symbol_upper)


@ws_router.websocket("/orderbook/{symbol}")
async def websocket_orderbook(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint for streaming real-time order book from Binance.

    Returns top 10 bids and asks, updated every 100ms.
    """
    symbol_upper = symbol.upper()
    channel = f"orderbook:{symbol_upper}"
    await stream_manager.connect_channel(websocket, channel)

    # Start orderbook streaming
    task_key = f"orderbook:{symbol_upper}"
    if task_key not in stream_manager.streaming_tasks:
        task = asyncio.create_task(crypto_streamer.stream_orderbook(symbol_upper))
        stream_manager.streaming_tasks[task_key] = task

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        await stream_manager.disconnect_channel(websocket, channel)


@ws_router.websocket("/sectors")
async def websocket_sectors(websocket: WebSocket):
    """
    WebSocket endpoint for streaming sector performance data.

    Returns performance of 11 S&P 500 sectors via ETFs.
    Used for market heatmap visualization.
    """
    await stream_manager.connect_channel(websocket, "sectors")

    # Start sector streaming if not running
    if "sectors" not in stream_manager.streaming_tasks:
        task = asyncio.create_task(sector_streamer.stream_sectors())
        stream_manager.streaming_tasks["sectors"] = task

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        await stream_manager.disconnect_channel(websocket, "sectors")


@ws_router.websocket("/tape")
async def websocket_tape(websocket: WebSocket):
    """
    WebSocket endpoint for streaming ticker tape data.

    Returns quotes for major indices and popular stocks.
    Used for ticker tape visualization at bottom of screen.
    """
    await stream_manager.connect_channel(websocket, "tape")

    # Start tape streaming if not running
    if "tape" not in stream_manager.streaming_tasks:
        task = asyncio.create_task(ticker_tape_streamer.stream_tape())
        stream_manager.streaming_tasks["tape"] = task

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        await stream_manager.disconnect_channel(websocket, "tape")
