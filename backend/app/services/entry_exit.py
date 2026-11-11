"""Entry and Exit Planning Engine for Indian Stocks (Long & Short Day Trades)."""

from typing import Dict, Optional
from app.services.market_data import get_opening_range, get_symbol_candles

def create_trade_plan(
    symbol: str,
    entry_price: Optional[float] = None,
    stop_mode: str = "or_mid",  # "or_mid", "or_low", "or_high", "pct"
    target_multiple: float = 2.0,  # 1.0 = 1R, 2.0 = 2R, 3.0 = 3R
    custom_stop: Optional[float] = None,
    custom_target: Optional[float] = None,
    side: str = "BUY"
) -> Dict:
    """Builds a structured trade plan with entry, stop-loss, take-profit target, and R:R ratio."""
    orb = get_opening_range(symbol)
    current_price = orb["current_price"] if orb else 0.0
    is_short = side.upper() == "SELL"
    
    # 1. Determine entry price
    if entry_price is None or entry_price <= 0:
        if orb and orb.get("breakout_price"):
            entry_price = orb["breakout_price"]
        else:
            entry_price = current_price
            
    if entry_price <= 0:
        raise ValueError("Invalid entry price: Could not determine market price.")

    # 2. Determine Stop Loss
    if custom_stop is not None and custom_stop > 0:
        stop_price = round(custom_stop, 2)
    elif is_short:
        if stop_mode == "or_mid" and orb and orb.get("or_mid") and orb["or_mid"] > entry_price:
            stop_price = round(orb["or_mid"], 2)
        elif (stop_mode == "or_high" or stop_mode == "or_mid") and orb and orb.get("or_high"):
            stop_price = round(orb["or_high"], 2)
        elif stop_mode == "pct":
            stop_price = round(entry_price * 1.01, 2)  # 1% stop above
        else:
            stop_price = round(entry_price * 1.008, 2)  # 0.8% stop above
    else:
        if stop_mode == "or_mid" and orb and orb.get("or_mid") and orb["or_mid"] < entry_price:
            stop_price = round(orb["or_mid"], 2)
        elif stop_mode == "or_low" and orb and orb.get("or_low"):
            stop_price = round(orb["or_low"], 2)
        elif stop_mode == "pct":
            stop_price = round(entry_price * 0.99, 2)  # 1% stop below
        else:
            stop_price = round(entry_price * 0.992, 2)  # 0.8% stop below
        
    # Safety Check: Stop must be on correct side of entry
    if is_short:
        if stop_price <= entry_price:
            stop_price = round(entry_price * 1.005, 2)
        risk_per_share = round(stop_price - entry_price, 2)
    else:
        if stop_price >= entry_price:
            stop_price = round(entry_price * 0.995, 2)
        risk_per_share = round(entry_price - stop_price, 2)

    if risk_per_share <= 0:
        risk_per_share = round(entry_price * 0.005, 2)
        stop_price = round(entry_price + risk_per_share if is_short else entry_price - risk_per_share, 2)

    # 3. Determine Take-Profit Target
    if custom_target is not None and custom_target > 0:
        target_price = round(custom_target, 2)
        reward_per_share = round(entry_price - target_price if is_short else target_price - entry_price, 2)
        target_r = round(reward_per_share / risk_per_share, 2) if risk_per_share > 0 else 0.0
    else:
        reward_per_share = round(risk_per_share * target_multiple, 2)
        target_price = round(entry_price - reward_per_share if is_short else entry_price + reward_per_share, 2)
        target_r = float(target_multiple)

    # 4. Enforce reward:risk ratio
    rr_ratio = round(reward_per_share / risk_per_share, 2) if risk_per_share > 0 else 0.0

    is_valid = (
        rr_ratio >= 1.0 and 
        (target_price < entry_price < stop_price if is_short else stop_price < entry_price < target_price)
    )

    return {
        "symbol": symbol.upper(),
        "side": "SELL" if is_short else "BUY",
        "entry_price": round(entry_price, 2),
        "stop_price": round(stop_price, 2),
        "target_price": round(target_price, 2),
        "risk_per_share": risk_per_share,
        "reward_per_share": reward_per_share,
        "target_r": target_r,
        "reward_risk_ratio": rr_ratio,
        "orb_high": orb.get("or_high") if orb else None,
        "orb_low": orb.get("or_low") if orb else None,
        "orb_mid": orb.get("or_mid") if orb else None,
        "square_off_time": "15:15 IST",
        "valid": is_valid
    }

