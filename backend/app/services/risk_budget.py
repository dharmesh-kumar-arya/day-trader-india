"""Pre-Trade Risk Gatekeeper & Position Sizing Engine for Indian Markets."""

import datetime
from typing import Dict, List, Optional
from app.core.config import config
from app.core.nse_calendar import now_ist, is_trading_day
from app.services.charges_calculator import calculate_intraday_charges
from app.db.database import get_today_trades_stats

def get_daily_ledger() -> dict:
    today_stats = get_today_trades_stats(is_paper=True)
    return {
        "date": now_ist().strftime("%Y-%m-%d"),
        "total_risk_committed_inr": float(today_stats.get("total_charges", 0.0)),
        "trades_placed_today": int(today_stats.get("count", 0)),
        "realized_pnl_inr": float(today_stats.get("total_net_pnl", 0.0))
    }

def size_position_inr(
    entry_price: float,
    stop_price: float,
    account_capital_inr: float = 100000.0,
    max_risk_inr: float = 1000.0,
    leverage: float = 5.0
) -> Dict:
    """Calculates whole shares that fit within risk ceiling and SEBI 5x MIS margin."""
    risk_per_share = abs(entry_price - stop_price)
    if risk_per_share <= 0:
        return {"shares": 0, "error": "Stop price cannot equal entry price."}
        
    # Shares sized strictly by risk per trade
    shares_by_risk = int(max_risk_inr // risk_per_share)
    
    # Capital limit with 5x MIS leverage
    max_purchasing_power = account_capital_inr * leverage
    shares_by_capital = int(max_purchasing_power // entry_price)
    
    final_shares = max(1, min(shares_by_risk, shares_by_capital))
    actual_risk_inr = round(final_shares * risk_per_share, 2)
    order_value_inr = round(final_shares * entry_price, 2)
    margin_required_inr = round(order_value_inr / leverage, 2)
    
    return {
        "shares": final_shares,
        "entry_price": entry_price,
        "stop_price": stop_price,
        "risk_per_share": round(risk_per_share, 2),
        "actual_risk_inr": actual_risk_inr,
        "order_value_inr": order_value_inr,
        "margin_required_inr": margin_required_inr,
        "leverage_used": leverage,
        "max_risk_budget_inr": max_risk_inr
    }

def run_pre_trade_risk_check(
    symbol: str,
    entry_price: float,
    stop_price: float,
    target_price: float,
    shares: int,
    upper_circuit_price: Optional[float] = None,
    max_risk_per_trade_inr: float = 1000.0,
    max_daily_loss_inr: float = 3000.0,
    dhan_token_valid: bool = True,
    side: str = "BUY"
) -> Dict:
    """Checks the trade against all safety gates and produces a PASS / BLOCK checklist."""
    now = now_ist()
    time_str = now.strftime("%H:%M")
    is_trading = is_trading_day(now.date())
    is_short = side.upper() == "SELL"
    
    if is_short:
        risk_per_share = round(stop_price - entry_price, 2)
        reward_per_share = round(entry_price - target_price, 2)
    else:
        risk_per_share = round(entry_price - stop_price, 2)
        reward_per_share = round(target_price - entry_price, 2)

    rr_ratio = round(reward_per_share / risk_per_share, 2) if risk_per_share > 0 else 0.0
    actual_trade_risk = round(shares * max(0.01, risk_per_share), 2)
    
    ledger = get_daily_ledger()
    projected_daily_risk = round(ledger["total_risk_committed_inr"] + actual_trade_risk, 2)
    
    # 1. Check: Stop price orientation
    if is_short:
        stop_passed = stop_price > entry_price
        stop_detail = f"Stop ₹{stop_price} > Entry ₹{entry_price}" if stop_passed else "Stop must be above entry for Short!"
        stop_title = "Stop Loss Above Entry (Short)"
    else:
        stop_passed = stop_price < entry_price
        stop_detail = f"Stop ₹{stop_price} < Entry ₹{entry_price}" if stop_passed else "Stop at or above entry!"
        stop_title = "Stop Loss Below Entry (Long)"

    check_stop = {
        "title": stop_title,
        "passed": stop_passed,
        "detail": stop_detail
    }
    
    # 2. Check: Reward-to-Risk ratio >= 1.5
    check_rr = {
        "title": "Minimum 1.5 Reward:Risk",
        "passed": rr_ratio >= 1.5,
        "detail": f"R:R ratio is {rr_ratio}:1 (Minimum 1.5 required)"
    }
    
    # 3. Check: Max Risk per trade limit
    check_risk = {
        "title": "Max Risk Per Trade",
        "passed": actual_trade_risk <= max_risk_per_trade_inr * 1.05,  # 5% rounding allowance
        "detail": f"Risk ₹{actual_trade_risk} within ₹{max_risk_per_trade_inr} limit"
    }
    
    # 4. Check: Daily loss limit ceiling
    check_daily_loss = {
        "title": "Daily Loss Ceiling",
        "passed": projected_daily_risk <= max_daily_loss_inr,
        "detail": f"Today's total risk ₹{projected_daily_risk} vs limit ₹{max_daily_loss_inr}"
    }
    
    # 5. Check: Entry window (09:30 to 14:30 IST)
    is_in_window = is_trading and ("09:30" <= time_str <= "14:30")
    check_window = {
        "title": "Day-Trade Entry Window (09:30 - 14:30 IST)",
        "passed": is_in_window,
        "detail": f"Current time is {time_str} IST"
    }
    
    # 6. Check: Circuit Breaker Safety (not within 1.5% of upper circuit)
    if upper_circuit_price and upper_circuit_price > 0:
        dist_to_uc = ((upper_circuit_price - entry_price) / entry_price) * 100.0
        safe_circuit = dist_to_uc >= 1.5
        circuit_detail = f"Distance to Upper Circuit: {round(dist_to_uc, 1)}% (Min 1.5%)"
    else:
        safe_circuit = True
        circuit_detail = "F&O stock: High liquidity, no rigid circuit freeze"
        
    check_circuit = {
        "title": "Circuit Breaker Protection",
        "passed": safe_circuit,
        "detail": circuit_detail
    }
    
    # 7. Check: Dhan Token Status
    check_token = {
        "title": "Dhan Connection / Token Active",
        "passed": dhan_token_valid,
        "detail": "Dhan token active and authenticated" if dhan_token_valid else "Dhan access token expired or missing"
    }
    
    checklist = [check_stop, check_rr, check_risk, check_daily_loss, check_window, check_circuit, check_token]
    all_passed = all(item["passed"] for item in checklist)
    
    # Calculate statutory charges breakdown
    charges = calculate_intraday_charges(entry_price, target_price, shares)

    return {
        "symbol": symbol.upper(),
        "passed": all_passed,
        "verdict": "PASS - ORDER APPROVED FOR EXECUTION" if all_passed else "BLOCK - RISK LIMIT EXCEEDED",
        "checklist": checklist,
        "actual_trade_risk_inr": actual_trade_risk,
        "projected_daily_risk_inr": projected_daily_risk,
        "charges_breakdown": charges,
        "net_profit_at_target_inr": charges["net_pnl"]
    }

