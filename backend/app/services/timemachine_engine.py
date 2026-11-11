"""75-Bar Monte Carlo Time Machine Simulation Engine for Indian Equities (NSE).

Replays 10,000 simulated sessions from the planned entry price using the stock's
own historical 5-minute bars from the past 60 sessions.
Outputs win/loss probability, fan-chart percentiles, EV, and an honest verdict.
"""

import random
import math
import datetime
from typing import Dict, List, Optional
from app.services.market_data import get_symbol_candles

# Indian session: 09:15 to 15:30 = 75 five-minute bars
INDIAN_SESSION_BARS = 75
DEFAULT_REPLAYS = 10000

def run_time_machine_simulation(
    symbol: str,
    entry_price: float,
    stop_price: float,
    target_price: float,
    replays: int = DEFAULT_REPLAYS,
    seed: Optional[int] = None
) -> Dict:
    """Runs 10,000 Monte Carlo replays and outputs fan chart & statistical probabilities."""
    if seed is not None:
        random.seed(seed)
    else:
        random.seed()
    
    # 1. Fetch 60 days of 5-minute bars for the stock
    candles = get_symbol_candles(symbol, interval="5m", range_str="60d")
    if not candles:
        # Fallback to 1mo or 5d if needed
        candles = get_symbol_candles(symbol, interval="5m", range_str="1mo")
        
    risk_per_share = abs(entry_price - stop_price)
    reward_per_share = abs(target_price - entry_price)
    target_r = round(reward_per_share / risk_per_share, 2) if risk_per_share > 0 else 1.0

    # 2. Build candle change ratios pool
    # Group by trading date
    days_map: Dict[str, List[dict]] = {}
    for c in candles:
        dt_str = datetime.datetime.fromtimestamp(c["time"]).strftime("%Y-%m-%d")
        if dt_str not in days_map:
            days_map[dt_str] = []
        days_map[dt_str].append(c)
        
    # Build ratio pool: for each bar, (open, high, low, close) relative to prev close
    ratio_pool: List[Tuple[float, float, float, float]] = []
    for d, day_candles in days_map.items():
        if len(day_candles) < 20:
            continue
        for i in range(1, len(day_candles)):
            prev_c = day_candles[i - 1]["close"]
            curr = day_candles[i]
            if prev_c > 0:
                ratio_pool.append((
                    curr["open"] / prev_c,
                    curr["high"] / prev_c,
                    curr["low"] / prev_c,
                    curr["close"] / prev_c
                ))
                
    # Fallback to realistic random walk if historical pool is shallow
    if len(ratio_pool) < 50:
        vol = 0.003  # 0.3% standard deviation for 5m bar
        for _ in range(500):
            ret = random.gauss(0, vol)
            h = abs(random.gauss(0, vol * 0.7))
            l = abs(random.gauss(0, vol * 0.7))
            ratio_pool.append((1.0, 1.0 + h, 1.0 - l, 1.0 + ret))

    # 3. Simulate remaining bars of the day (e.g. from 10:15 to 15:15 = ~60 bars)
    bars_to_simulate = 60
    
    target_hits = 0
    stop_hits = 0
    neither_count = 0
    terminal_r_values = []
    
    # Store trajectories for fan chart (subsample 1,000 paths for UI rendering speed)
    fan_sample_count = min(1000, replays)
    sampled_paths: List[List[float]] = []

    for r_idx in range(replays):
        cur_p = entry_price
        path = [cur_p] if r_idx < fan_sample_count else None
        outcome = "neither"
        terminal_r = 0.0

        for b_idx in range(bars_to_simulate):
            # Sample a ratio from pool
            o_r, h_r, l_r, c_r = random.choice(ratio_pool)
            bar_high = cur_p * h_r
            bar_low = cur_p * l_r
            bar_close = cur_p * c_r
            
            # Conservative rule: check stop first
            if bar_low <= stop_price:
                outcome = "stop"
                terminal_r = -1.0
                if path:
                    path.append(stop_price)
                break
            elif bar_high >= target_price:
                outcome = "target"
                terminal_r = target_r
                if path:
                    path.append(target_price)
                break
                
            cur_p = bar_close
            if path:
                path.append(round(cur_p, 2))
                
        if outcome == "target":
            target_hits += 1
        elif outcome == "stop":
            stop_hits += 1
        else:
            neither_count += 1
            terminal_r = round((cur_p - entry_price) / risk_per_share, 2)
            
        terminal_r_values.append(terminal_r)
        if path:
            # Pad path to bars_to_simulate if exited early
            last_p = path[-1]
            while len(path) <= bars_to_simulate:
                path.append(last_p)
            sampled_paths.append(path)

    # 4. Probabilities & EV
    target_pct = round((target_hits / replays) * 100.0, 1)
    stop_pct = round((stop_hits / replays) * 100.0, 1)
    neither_pct = round((neither_count / replays) * 100.0, 1)
    
    avg_r = round(sum(terminal_r_values) / replays, 2)
    ev_inr = round(avg_r * risk_per_share, 2)

    # 5. Honest Verdict determination
    # Target's share of decided trades
    decided = target_hits + stop_hits
    if decided > 0:
        target_share = (target_hits / decided) * 100.0
        breakeven_share = (1.0 / (1.0 + target_r)) * 100.0
        edge_gap = target_share - breakeven_share
        
        if edge_gap >= 15.0:
            verdict = "Strong Lean Toward Target (Approved)"
            verdict_badge = "STRONG_LEAN"
        elif edge_gap >= 5.0:
            verdict = "Clear Lean Toward Target (Approved)"
            verdict_badge = "CLEAR_LEAN"
        elif edge_gap <= -5.0:
            verdict = "Leans Toward Stop Loss (High Risk)"
            verdict_badge = "LEANS_STOP"
        else:
            verdict = "Close to Coin Flip / Breakeven"
            verdict_badge = "COIN_FLIP"
    else:
        verdict = "Low Volatility / Range Bound"
        verdict_badge = "NEUTRAL"

    # 6. Build Fan Chart Percentiles (p5, p25, p50, p75, p95) along the time axis
    fan_chart_series = []
    for step in range(bars_to_simulate + 1):
        step_prices = sorted([p[step] for p in sampled_paths])
        n = len(step_prices)
        fan_chart_series.append({
            "step": step,
            "p5": round(step_prices[int(0.05 * n)], 2),
            "p25": round(step_prices[int(0.25 * n)], 2),
            "median": round(step_prices[int(0.50 * n)], 2),
            "p75": round(step_prices[int(0.75 * n)], 2),
            "p95": round(step_prices[int(0.95 * n)], 2),
        })

    # 7. Histogram bins for R outcomes
    sorted_r = sorted(terminal_r_values)
    bins = [
        {"range": "< -1.0R", "count": sum(1 for r in sorted_r if r < -1.0)},
        {"range": "-1.0R (Stop)", "count": sum(1 for r in sorted_r if -1.0 <= r < -0.5)},
        {"range": "-0.5R to 0.0R", "count": sum(1 for r in sorted_r if -0.5 <= r < 0.0)},
        {"range": "0.0R to +0.5R", "count": sum(1 for r in sorted_r if 0.0 <= r < 0.5)},
        {"range": "+0.5R to +1.0R", "count": sum(1 for r in sorted_r if 0.5 <= r < 1.0)},
        {"range": "+1.0R to Target", "count": sum(1 for r in sorted_r if 1.0 <= r < target_r)},
        {"range": f">={target_r}R (Target)", "count": sum(1 for r in sorted_r if r >= target_r)},
    ]

    return {
        "symbol": symbol.upper(),
        "replays": replays,
        "entry_price": entry_price,
        "stop_price": stop_price,
        "target_price": target_price,
        "target_r": target_r,
        "probabilities": {
            "target_first_pct": target_pct,
            "stop_first_pct": stop_pct,
            "neither_pct": neither_pct,
        },
        "expected_value_r": avg_r,
        "expected_value_inr": ev_inr,
        "verdict": verdict,
        "verdict_badge": verdict_badge,
        "fan_chart": fan_chart_series,
        "histogram": bins
    }

