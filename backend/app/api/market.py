"""Market Data and Calendar Endpoints."""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.core.nse_calendar import get_market_status
from app.services.nse_universe import get_universe, get_sectors
from app.services.market_data import get_symbol_candles, get_opening_range

router = APIRouter(prefix="/api/market", tags=["Market Data"])

@router.get("/status")
def market_status():
    """Returns current market session status in IST."""
    return get_market_status()

@router.get("/universe")
def universe(sector: Optional[str] = Query(None)):
    """Returns list of NSE F&O universe stocks."""
    return {
        "stocks": get_universe(sector),
        "sectors": get_sectors()
    }

@router.get("/chart/{symbol}")
def chart_data(symbol: str, interval: str = Query("5m"), range_str: str = Query("5d")):
    """Returns candlestick bar history for a symbol."""
    candles = get_symbol_candles(symbol, interval=interval, range_str=range_str)
    return {
        "symbol": symbol.upper(),
        "interval": interval,
        "candles": candles
    }

@router.get("/orb/{symbol}")
def orb_data(symbol: str):
    """Returns today's 15-minute Opening Range details."""
    data = get_opening_range(symbol)
    if not data:
        raise HTTPException(status_code=404, detail=f"No ORB data available for {symbol}")
    return data

