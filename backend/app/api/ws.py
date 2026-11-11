"""WebSocket Hub for Real-Time Market Ticks, Candle Updates, Positions, and Alerts."""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.market_data import get_symbol_candles, get_opening_range
from app.services.dhan_service import dhan_service
from app.core.nse_calendar import get_market_status, now_ist

logger = logging.getLogger("daytrader.ws")

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    """Manages active WebSocket connections and their individual subscriptions."""

    def __init__(self):
        # Maps WebSocket -> Dict of client subscription settings
        # e.g. { "symbol": "RELIANCE", "interval": "5m", "is_paper": True }
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections[websocket] = {
                "symbol": "RELIANCE",
                "interval": "5m",
                "is_paper": True,
            }
        logger.info(f"[WS] Client connected. Active connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                del self.active_connections[websocket]
        logger.info(f"[WS] Client disconnected. Active connections: {len(self.active_connections)}")

    async def update_subscription(self, websocket: WebSocket, data: dict):
        async with self._lock:
            if websocket in self.active_connections:
                sub = self.active_connections[websocket]
                if "symbol" in data and data["symbol"]:
                    sub["symbol"] = str(data["symbol"]).upper()
                if "interval" in data and data["interval"]:
                    sub["interval"] = str(data["interval"])
                if "is_paper" in data:
                    sub["is_paper"] = bool(data["is_paper"])

    async def broadcast(self, message: dict):
        text = json.dumps(message)
        dead = []
        async with self._lock:
            items = list(self.active_connections.items())

        for ws, _ in items:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    if ws in self.active_connections:
                        del self.active_connections[ws]

    async def broadcast_positions(self, is_paper: Optional[bool] = None):
        """Immediately broadcasts active positions to subscribed clients."""
        try:
            if is_paper is None:
                pos_paper = await asyncio.to_thread(dhan_service.get_positions, is_paper=True)
                pos_live = await asyncio.to_thread(dhan_service.get_positions, is_paper=False)
                async with self._lock:
                    items = list(self.active_connections.items())
                for ws, sub in items:
                    p = pos_paper if sub.get("is_paper", True) else pos_live
                    try:
                        await ws.send_text(json.dumps({
                            "type": "POSITIONS",
                            "is_paper": sub.get("is_paper", True),
                            "positions": p
                        }))
                    except Exception:
                        pass
            else:
                pos = await asyncio.to_thread(dhan_service.get_positions, is_paper=is_paper)
                async with self._lock:
                    items = list(self.active_connections.items())
                for ws, sub in items:
                    if sub.get("is_paper", True) == is_paper:
                        try:
                            await ws.send_text(json.dumps({
                                "type": "POSITIONS",
                                "is_paper": is_paper,
                                "positions": pos
                            }))
                        except Exception:
                            pass
        except Exception as e:
            logger.error(f"[WS] Error broadcasting positions: {e}")

manager = ConnectionManager()

# Track symbols that already alerted ORB today to avoid spamming alerts
_orb_triggered_symbols: Set[str] = set()

async def live_market_ticker():
    """Background streaming worker: broadcasts candle delta ticks, positions, and market clocks."""
    cycle = 0
    while True:
        try:
            if not manager.active_connections:
                await asyncio.sleep(1.0)
                continue

            cycle += 1

            # 1. Snapshot connected clients and their unique subscriptions
            async with manager._lock:
                clients_snapshot = list(manager.active_connections.items())
                unique_pairs = set(
                    (sub.get("symbol", "RELIANCE"), sub.get("interval", "5m"))
                    for _, sub in clients_snapshot
                )

            # 2. Concurrently fetch latest candles for subscribed symbols
            latest_ticks = {}
            for sym, interval in unique_pairs:
                try:
                    range_str = "1mo" if interval == "1D" else "5d"
                    candles = await asyncio.to_thread(get_symbol_candles, sym, interval, range_str)
                    if candles:
                        latest = candles[-1]
                        latest_ticks[(sym, interval)] = {
                            "type": "TICK",
                            "symbol": sym,
                            "interval": interval,
                            "candle": latest,
                            "price": latest.get("close"),
                            "high": latest.get("high"),
                            "low": latest.get("low"),
                            "volume": latest.get("volume"),
                        }
                except Exception as ex:
                    logger.debug(f"[WS] Candle fetch failed for {sym}: {ex}")

            # 3. Stream TICKs to matching subscribers
            for ws, sub in clients_snapshot:
                pair = (sub.get("symbol", "RELIANCE"), sub.get("interval", "5m"))
                if pair in latest_ticks:
                    try:
                        await ws.send_text(json.dumps(latest_ticks[pair]))
                    except Exception:
                        pass

            # 4. Stream active positions (every cycle, syncing live MTM and bracket exits)
            try:
                pos_paper = await asyncio.to_thread(dhan_service.get_positions, is_paper=True)
                pos_live = await asyncio.to_thread(dhan_service.get_positions, is_paper=False)
                for ws, sub in clients_snapshot:
                    is_p = sub.get("is_paper", True)
                    positions_to_send = pos_paper if is_p else pos_live
                    try:
                        await ws.send_text(json.dumps({
                            "type": "POSITIONS",
                            "is_paper": is_p,
                            "positions": positions_to_send
                        }))
                    except Exception:
                        pass
            except Exception as e:
                logger.debug(f"[WS] Positions stream failed: {e}")

            # 5. Check Opening Range Breakouts for active symbols
            for sym, _ in unique_pairs:
                if sym not in _orb_triggered_symbols:
                    try:
                        orb = await asyncio.to_thread(get_opening_range, sym)
                        if orb and orb.get("status") == "TRIGGERED":
                            _orb_triggered_symbols.add(sym)
                            breakout_price = orb.get("breakout_price") or orb.get("current_price") or 0.0
                            breakout_msg = {
                                "type": "ORB_BREAKOUT",
                                "symbol": sym,
                                "breakout_price": breakout_price,
                                "or_high": orb.get("or_high"),
                                "or_low": orb.get("or_low"),
                                "time": orb.get("breakout_time") or now_ist().strftime("%H:%M")
                            }
                            await manager.broadcast(breakout_msg)

                            # Send actionable trade signal for native notifications
                            if breakout_price > 0:
                                await manager.broadcast({
                                    "type": "TRADE_SIGNAL",
                                    "symbol": sym,
                                    "signal": "BUY",
                                    "price": breakout_price,
                                    "target": round(breakout_price * 1.015, 2),
                                    "stop_loss": round(breakout_price * 0.992, 2),
                                    "setup": "15m ORB Breakout Confirmed",
                                    "conviction": 85,
                                    "time": orb.get("breakout_time") or now_ist().strftime("%H:%M")
                                })
                    except Exception:
                        pass

            # 6. Stream MARKET_STATUS every 5 cycles (~7.5 seconds)
            if cycle % 5 == 0:
                try:
                    m_status = get_market_status()
                    await manager.broadcast({
                        "type": "MARKET_STATUS",
                        "status": m_status
                    })
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"[WS] Live market ticker loop exception: {e}")

        await asyncio.sleep(1.5)


@router.websocket("/ws/market")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial sync payload immediately upon connection
        try:
            m_status = get_market_status()
            await websocket.send_text(json.dumps({"type": "MARKET_STATUS", "status": m_status}))
            pos = await asyncio.to_thread(dhan_service.get_positions, is_paper=True)
            await websocket.send_text(json.dumps({"type": "POSITIONS", "is_paper": True, "positions": pos}))
        except Exception:
            pass

        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
                action = data.get("action") or data.get("type")

                if action == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "timestamp": data.get("timestamp")
                    }))

                elif action in ("subscribe", "SUBSCRIBE"):
                    await manager.update_subscription(websocket, data)
                    sym = data.get("symbol", "RELIANCE").upper()
                    inv = data.get("interval", "5m")
                    range_str = "1mo" if inv == "1D" else "5d"
                    candles = await asyncio.to_thread(get_symbol_candles, sym, inv, range_str)
                    if candles:
                        await websocket.send_text(json.dumps({
                            "type": "TICK",
                            "symbol": sym,
                            "interval": inv,
                            "candle": candles[-1],
                            "price": candles[-1].get("close")
                        }))

                elif action in ("set_paper", "SET_PAPER"):
                    is_p = bool(data.get("is_paper", True))
                    await manager.update_subscription(websocket, {"is_paper": is_p})
                    pos = await asyncio.to_thread(dhan_service.get_positions, is_paper=is_p)
                    await websocket.send_text(json.dumps({
                        "type": "POSITIONS",
                        "is_paper": is_p,
                        "positions": pos
                    }))

                elif action in ("get_positions", "GET_POSITIONS"):
                    is_p = bool(data.get("is_paper", True))
                    pos = await asyncio.to_thread(dhan_service.get_positions, is_paper=is_p)
                    await websocket.send_text(json.dumps({
                        "type": "POSITIONS",
                        "is_paper": is_p,
                        "positions": pos
                    }))

            except Exception as e:
                logger.warning(f"[WS] Message parse error: {e}")

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


@router.post("/api/ws/broadcast-signal")
async def trigger_broadcast_trade_signal(payload: dict):
    """Triggers an immediate trade signal broadcast over WebSocket for push / native notifications."""
    sym = str(payload.get("symbol", "RELIANCE")).upper()
    signal = str(payload.get("signal", "BUY")).upper()
    price = float(payload.get("price", 1335.40))
    target = float(payload.get("target", round(price * 1.015, 2)))
    stop_loss = float(payload.get("stop_loss", round(price * 0.992, 2)))
    setup = str(payload.get("setup", "High Conviction Setup"))
    conviction = int(payload.get("conviction", 82))

    trade_signal = {
        "type": "TRADE_SIGNAL",
        "symbol": sym,
        "signal": signal,
        "price": price,
        "target": target,
        "stop_loss": stop_loss,
        "setup": setup,
        "conviction": conviction,
        "time": now_ist().strftime("%H:%M")
    }
    await manager.broadcast(trade_signal)
    return {"status": "broadcasted", "signal": trade_signal}

