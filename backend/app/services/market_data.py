"""Market Data Service: Historical bars, candle calculations, indicators and Opening Range."""

import time
import json
import urllib.request
import urllib.error
import datetime
from typing import List, Dict, Optional, Tuple
from app.services.nse_universe import to_yahoo_ticker

CACHE_EXPIRY_SECONDS = 3  # Fast 3s cache for sub-5s live chart ticks
_chart_cache: Dict[str, Tuple[float, dict]] = {}

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"

def fetch_yahoo_chart(ticker: str, interval: str = "5m", range_str: str = "5d") -> Optional[dict]:
    """Fetches chart data from Yahoo Finance endpoint with polite headers and caching."""
    cache_key = f"{ticker}:{interval}:{range_str}"
    now = time.time()
    if cache_key in _chart_cache:
        cached_time, cached_data = _chart_cache[cache_key]
        if now - cached_time < CACHE_EXPIRY_SECONDS:
            return cached_data

    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range={range_str}&interval={interval}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            _chart_cache[cache_key] = (now, data)
            return data
    except urllib.error.HTTPError as e:
        if e.code in (429, 500, 502, 503):
            # Fallback to query1
            fallback_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={range_str}&interval={interval}"
            try:
                fallback_req = urllib.request.Request(fallback_url, headers={"User-Agent": UA})
                with urllib.request.urlopen(fallback_req, timeout=10) as f_resp:
                    data = json.loads(f_resp.read().decode("utf-8"))
                    _chart_cache[cache_key] = (now, data)
                    return data
            except Exception:
                return None
        return None
    except Exception:
        return None

def parse_candles(data: dict) -> List[Dict]:
    """Extracts OHLCV candle list from Yahoo chart response."""
    candles = []
    try:
        result = data["chart"]["result"][0]
        timestamps = result.get("timestamp", [])
        quotes = result["indicators"]["quote"][0]
        opens = quotes.get("open", [])
        highs = quotes.get("high", [])
        lows = quotes.get("low", [])
        closes = quotes.get("close", [])
        volumes = quotes.get("volume", [])
        
        for i in range(len(timestamps)):
            o, h, l, c = opens[i], highs[i], lows[i], closes[i]
            if None in (o, h, l, c):
                continue
            candles.append({
                "time": timestamps[i],
                "open": round(float(o), 2),
                "high": round(float(h), 2),
                "low": round(float(l), 2),
                "close": round(float(c), 2),
                "volume": int(volumes[i]) if volumes[i] is not None else 0
            })
    except Exception:
        pass
    return candles

def get_symbol_candles(symbol: str, interval: str = "5m", range_str: str = "5d") -> List[Dict]:
    """Retrieves clean candlestick series for a symbol."""
    ticker = to_yahoo_ticker(symbol)
    data = fetch_yahoo_chart(ticker, interval, range_str)
    if not data:
        return []
    return parse_candles(data)

def calculate_rsi(closes: List[float], period: int = 14) -> List[Optional[float]]:
    """Calculates Wilder's RSI(14)."""
    if len(closes) < period + 1:
        return [None] * len(closes)
    
    rsi_values = [None] * len(closes)
    gains = []
    losses = []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(0.0, diff))
        losses.append(max(0.0, -diff))
        
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    if avg_loss == 0:
        rsi_values[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi_values[period] = round(100.0 - (100.0 / (1.0 + rs)), 2)
        
    for i in range(period + 1, len(closes)):
        gain = gains[i - 1]
        loss = losses[i - 1]
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        if avg_loss == 0:
            rsi_values[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi_values[i] = round(100.0 - (100.0 / (1.0 + rs)), 2)
            
    return rsi_values

def get_opening_range(symbol: str) -> Optional[Dict]:
    """Calculates the 9:15 to 9:30 AM IST Opening Range for today's session."""
    candles = get_symbol_candles(symbol, interval="5m", range_str="1d")
    if not candles:
        # Try 5d if 1d has few bars
        candles = get_symbol_candles(symbol, interval="5m", range_str="5d")
    if not candles:
        return None
        
    # Group by trading date in IST
    today_candles = []
    latest_dt = datetime.datetime.fromtimestamp(candles[-1]["time"], tz=datetime.timezone.utc).astimezone(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    latest_date = latest_dt.date()
    
    for c in candles:
        dt = datetime.datetime.fromtimestamp(c["time"], tz=datetime.timezone.utc).astimezone(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
        if dt.date() == latest_date:
            today_candles.append((dt, c))
            
    if not today_candles:
        return None
        
    # First 3 five-minute bars form the 15-minute range (09:15 to 09:30)
    range_bars = [c for dt, c in today_candles if "09:15" <= dt.strftime("%H:%M") < "09:30"]
    if not range_bars:
        # If market just opened, take up to first 3 bars
        range_bars = [c for _, c in today_candles[:3]]
        
    if not range_bars:
        return None
        
    or_high = max(b["high"] for b in range_bars)
    or_low = min(b["low"] for b in range_bars)
    or_mid = round((or_high + or_low) / 2.0, 2)
    or_volume = sum(b["volume"] for b in range_bars)
    
    current_candle = today_candles[-1][1]
    current_price = current_candle["close"]
    
    # Check if a bar has closed above range high after 09:30
    post_range_bars = [c for dt, c in today_candles if dt.strftime("%H:%M") >= "09:30"]
    breakout_bar = None
    for b in post_range_bars:
        if b["close"] > or_high:
            breakout_bar = b
            break
            
    status = "TRIGGERED" if breakout_bar else ("WAITING" if len(today_candles) >= 3 else "FORMING")
    
    return {
        "symbol": symbol.upper(),
        "date": latest_date.strftime("%Y-%m-%d"),
        "or_high": or_high,
        "or_low": or_low,
        "or_mid": or_mid,
        "or_range_points": round(or_high - or_low, 2),
        "or_volume": or_volume,
        "current_price": current_price,
        "status": status,
        "breakout_price": breakout_bar["close"] if breakout_bar else None,
        "breakout_time": datetime.datetime.fromtimestamp(breakout_bar["time"]).strftime("%H:%M") if breakout_bar else None,
        "bars_count": len(today_candles)
    }

