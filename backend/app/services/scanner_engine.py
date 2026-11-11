"""Scanner Engine for Indian Markets: ORB, 20-day high breakouts, bull flags, reclaims, oversold bounces."""

import datetime
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional
from app.services.nse_universe import get_universe, to_yahoo_ticker
from app.services.market_data import fetch_yahoo_chart, parse_candles, calculate_rsi

# In-memory scanner cache with 30-second TTL
_scanner_cache: Dict[str, List[dict]] = {}
_cache_timestamp: Dict[str, float] = {}
SCANNER_CACHE_TTL = 30.0  # 30 seconds

def scan_symbol_setups(symbol_entry: dict) -> Optional[dict]:
    """Evaluates setups for a single symbol."""
    sym = symbol_entry["symbol"]
    ticker = to_yahoo_ticker(sym)
    
    # 1. Fetch 5-day 5-minute bars for intraday & ORB
    intraday_data = fetch_yahoo_chart(ticker, interval="5m", range_str="2d")
    if not intraday_data:
        return None
        
    intraday_candles = parse_candles(intraday_data)
    if len(intraday_candles) < 5:
        return None
        
    current_price = intraday_candles[-1]["close"]
    prev_close = intraday_candles[0]["open"]
    try:
        meta = intraday_data["chart"]["result"][0]["meta"]
        prev_close = meta.get("previousClose", prev_close) or prev_close
        current_price = meta.get("regularMarketPrice", current_price) or current_price
    except Exception:
        pass
        
    pct_change = round(((current_price - prev_close) / prev_close) * 100.0, 2)
    
    # 2. Check 15m ORB setup (09:15 - 09:30 range)
    # The first 3 bars of the day
    today_dt = datetime.datetime.fromtimestamp(intraday_candles[-1]["time"]).date()
    today_bars = [c for c in intraday_candles if datetime.datetime.fromtimestamp(c["time"]).date() == today_dt]
    
    orb_triggered = False
    orb_breakdown = False
    orb_high = None
    orb_low = None
    if len(today_bars) >= 3:
        range_bars = today_bars[:3]
        orb_high = max(b["high"] for b in range_bars)
        orb_low = min(b["low"] for b in range_bars)
        for b in today_bars[3:]:
            if b["close"] > orb_high:
                orb_triggered = True
                break
            elif b["close"] < orb_low:
                orb_breakdown = True
                break

    # 3. Fetch daily bars for multi-day setups (20d high, 20d low, bull flag, RSI)
    daily_data = fetch_yahoo_chart(ticker, interval="1d", range_str="3mo")
    daily_candles = parse_candles(daily_data) if daily_data else []
    
    is_20d_breakout = False
    is_20d_breakdown = False
    is_bull_flag = False
    is_oversold_bounce = False
    rsi_val = 50.0
    
    if len(daily_candles) >= 22:
        closes = [c["close"] for c in daily_candles]
        last_close = closes[-1]
        prior_20 = closes[-21:-1]
        
        # 20d High Breakout
        if last_close > max(prior_20):
            is_20d_breakout = True
        elif last_close < min(prior_20):
            is_20d_breakdown = True
            
        # RSI 14 Wilder
        rsis = calculate_rsi(closes)
        if rsis[-1] is not None:
            rsi_val = rsis[-1]
            if len(rsis) >= 2 and rsis[-2] is not None:
                if rsis[-2] < 30 and closes[-1] > closes[-2]:
                    is_oversold_bounce = True
                    
        # Bull flag: up > 8% over 10 sessions, then consolidation inside 4%
        if len(closes) >= 16:
            flag_base = closes[-16]
            flag_pole = max(closes[-15:-5])
            if (flag_pole - flag_base) / flag_base > 0.08:
                last_5 = closes[-5:]
                if (max(last_5) - min(last_5)) / min(last_5) < 0.04:
                    is_bull_flag = True

    setups = []
    if orb_triggered:
        setups.append("15m ORB Breakout")
    if orb_breakdown:
        setups.append("15m ORB Breakdown (Short)")
    if is_20d_breakout:
        setups.append("20-Day High Breakout")
    if is_20d_breakdown:
        setups.append("20-Day Low Breakdown (Short)")
    if is_bull_flag:
        setups.append("Bull Flag")
    if is_oversold_bounce:
        setups.append("Oversold RSI Bounce")

    # Calculate Setup Conviction Score (0 to 100)
    score = 0
    reasons = []

    # 1. ORB Breakout / Breakdown (+35 pts)
    if orb_triggered:
        score += 35
        reasons.append("15m ORB breakout confirmed (Bullish)")
    elif orb_breakdown:
        score += 35
        reasons.append("15m ORB breakdown confirmed (Bearish / Short)")

    # 2. 20-Day High Breakout / Low Breakdown (+25 pts)
    if is_20d_breakout:
        score += 25
        reasons.append("20-Day multi-week high breakout")
    elif is_20d_breakdown:
        score += 25
        reasons.append("20-Day multi-week low breakdown (Short)")

    # 3. Bull Flag continuation (+15 pts)
    if is_bull_flag:
        score += 15
        reasons.append("Bull flag pattern continuation")

    # 4. Volume Surge (+15 pts)
    vol = intraday_candles[-1]["volume"]
    if vol > 800000:
        score += 15
        reasons.append("Heavy institutional volume (>800k)")
    elif vol > 300000:
        score += 10
        reasons.append("Healthy trading volume (>300k)")

    # 5. Price momentum (+10 pts)
    if 1.0 <= pct_change <= 3.5:
        score += 10
        reasons.append(f"Ideal breakout momentum (+{pct_change}%)")
    elif pct_change > 3.5:
        score += 5
        reasons.append(f"Strong momentum (+{pct_change}%)")

    # Grade classification
    if score >= 70:
        grade = "A+"
    elif score >= 50:
        grade = "A"
    elif score >= 30:
        grade = "B"
    else:
        grade = "C"

    return {
        "symbol": sym,
        "name": symbol_entry["name"],
        "sector": symbol_entry["sector"],
        "dhan_id": symbol_entry["dhan_id"],
        "current_price": current_price,
        "prev_close": prev_close,
        "pct_change": pct_change,
        "volume": vol,
        "orb_high": orb_high,
        "orb_low": orb_low,
        "orb_triggered": orb_triggered,
        "setups": setups,
        "has_setup": len(setups) > 0,
        "rsi": round(rsi_val, 1),
        "score": score,
        "grade": grade,
        "reasons": reasons
    }

def run_scanner(sector: Optional[str] = None, only_setups: bool = False) -> List[dict]:
    """Runs setup scanner in parallel across universe with in-memory caching."""
    cache_key = f"{sector or 'ALL'}:{only_setups}"
    now_t = time.time()
    if cache_key in _scanner_cache and (now_t - _cache_timestamp.get(cache_key, 0) < SCANNER_CACHE_TTL):
        return _scanner_cache[cache_key]

    symbols = get_universe(sector)
    results = []

    # Parallel setup evaluation across symbols (12 concurrent threads)
    with ThreadPoolExecutor(max_workers=12) as executor:
        future_to_sym = {executor.submit(scan_symbol_setups, s): s for s in symbols}
        for future in as_completed(future_to_sym):
            try:
                res = future.result()
                if res:
                    if not only_setups or res["has_setup"]:
                        results.append(res)
            except Exception:
                continue

    # Sort: highest Conviction Score first, then percentage gain
    results.sort(key=lambda x: (x["score"], x["pct_change"]), reverse=True)

    # Store in memory cache
    _scanner_cache[cache_key] = results
    _cache_timestamp[cache_key] = now_t
    return results

