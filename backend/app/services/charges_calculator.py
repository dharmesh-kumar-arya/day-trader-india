"""Indian Statutory Charges & Brokerage Calculator for Equity Intraday (MIS).

Calculates accurate government taxes and broker fees so the trader sees TRUE Net P&L:
- Flat Brokerage: ₹20 / order or 0.03% (whichever is lower)
- STT (Securities Transaction Tax): 0.025% on sell side turnover
- NSE Exchange Transaction Charge: 0.00345% on turnover (both buy and sell)
- GST: 18% on (Brokerage + Exchange Charge + SEBI Charge)
- SEBI Turnover Fee: ₹10 per crore (0.0001% on turnover)
- Stamp Duty: 0.003% on buy side turnover
"""

from typing import Dict

def calculate_intraday_charges(buy_price: float, sell_price: float, quantity: int) -> Dict[str, float]:
    """Calculates all taxes and net P&L for an intraday round-trip trade."""
    buy_turnover = buy_price * quantity
    sell_turnover = sell_price * quantity
    total_turnover = buy_turnover + sell_turnover
    
    # Gross Profit/Loss
    gross_pnl = (sell_price - buy_price) * quantity
    
    # 1. Brokerage (e.g. Dhan / Zerodha: ₹20 or 0.03% per leg)
    buy_brokerage = min(20.0, buy_turnover * 0.0003)
    sell_brokerage = min(20.0, sell_turnover * 0.0003)
    total_brokerage = round(buy_brokerage + sell_brokerage, 2)
    
    # 2. STT (0.025% on sell side for equity intraday)
    stt = round(sell_turnover * 0.00025, 2)
    
    # 3. Exchange Transaction Charges (NSE ~0.00345% on total turnover)
    exchange_charges = round(total_turnover * 0.0000345, 2)
    
    # 4. SEBI Turnover Charges (₹10 per crore = 0.0001% on total turnover)
    sebi_charges = round(total_turnover * 0.000001, 2)
    
    # 5. GST (18% on Brokerage + Exchange charges + SEBI charges)
    gst = round((total_brokerage + exchange_charges + sebi_charges) * 0.18, 2)
    
    # 6. Stamp Duty (0.003% on buy side only)
    stamp_duty = round(buy_turnover * 0.00003, 2)
    
    # Total statutory friction
    total_charges = round(total_brokerage + stt + exchange_charges + sebi_charges + gst + stamp_duty, 2)
    net_pnl = round(gross_pnl - total_charges, 2)
    
    return {
        "buy_turnover": round(buy_turnover, 2),
        "sell_turnover": round(sell_turnover, 2),
        "total_turnover": round(total_turnover, 2),
        "gross_pnl": round(gross_pnl, 2),
        "brokerage": total_brokerage,
        "stt": stt,
        "exchange_charges": exchange_charges,
        "sebi_charges": sebi_charges,
        "gst": gst,
        "stamp_duty": stamp_duty,
        "total_charges": total_charges,
        "net_pnl": net_pnl,
        "breakeven_points": round(total_charges / quantity, 2) if quantity > 0 else 0.0,
    }

