"""Smart Money Tracker (FII/DII Net Flows, NSE Bulk Deals) & Corporate Announcements."""

import datetime
from typing import List, Dict

# Realistic seed feeds of today's institutional and corporate actions for Indian markets
def get_fii_dii_flows() -> Dict:
    """Returns today's FII and DII institutional net flows in ₹ Crores."""
    return {
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "fii_gross_buy_cr": 12450.80,
        "fii_gross_sell_cr": 11120.30,
        "fii_net_flow_cr": +1330.50,
        "dii_gross_buy_cr": 9850.20,
        "dii_gross_sell_cr": 8910.00,
        "dii_net_flow_cr": +940.20,
        "total_institutional_net_cr": +2270.70,
        "sentiment": "BULLISH_FLOW"
    }

def get_bulk_and_block_deals() -> List[Dict]:
    """Returns notable NSE Bulk & Block deals (>0.5% company equity)."""
    return [
        {
            "symbol": "RELIANCE",
            "client_name": "Vanguard Emerging Markets Stock Index Fund",
            "deal_type": "BUY",
            "quantity": 1250000,
            "trade_price": 1338.50,
            "equity_pct": 0.58,
            "time": "10:14 IST"
        },
        {
            "symbol": "TATAMOTORS",
            "client_name": "GQG Partners Emerging Markets Equity Fund",
            "deal_type": "BUY",
            "quantity": 2100000,
            "trade_price": 982.40,
            "equity_pct": 0.72,
            "time": "09:42 IST"
        },
        {
            "symbol": "HDFCBANK",
            "client_name": "LIC of India",
            "deal_type": "BUY",
            "quantity": 3500000,
            "trade_price": 1745.20,
            "equity_pct": 0.65,
            "time": "09:28 IST"
        },
        {
            "symbol": "INFY",
            "client_name": "SBI Mutual Fund - Bluechip Fund",
            "deal_type": "BUY",
            "quantity": 1800000,
            "trade_price": 1820.00,
            "equity_pct": 0.52,
            "time": "10:25 IST"
        }
    ]

def get_corporate_announcements() -> List[Dict]:
    """Returns recent NSE/BSE corporate announcements with sentiment tags."""
    return [
        {
            "symbol": "RELIANCE",
            "title": "Board Meeting scheduled for Nov 14 to consider Interim Dividend",
            "category": "DIVIDEND",
            "time": "10:30 IST",
            "impact": "POSITIVE"
        },
        {
            "symbol": "TATAMOTORS",
            "title": "Jaguar Land Rover reports Q2 global wholesale growth of 11.2% YoY",
            "category": "RESULTS",
            "time": "09:45 IST",
            "impact": "POSITIVE"
        },
        {
            "symbol": "HDFCBANK",
            "title": "RBI Repo Rate Stance and Credit Growth Guidance Announcement",
            "category": "MONETARY",
            "time": "09:12 IST",
            "impact": "NEUTRAL"
        },
        {
            "symbol": "TCS",
            "title": "TCS expands strategic partnership with leading European bank for Cloud AI migration",
            "category": "CONTRACT",
            "time": "08:50 IST",
            "impact": "POSITIVE"
        },
        {
            "symbol": "SUNPHARMA",
            "title": "US FDA completes inspection at Halol facility with zero observations (EIR issued)",
            "category": "REGULATORY",
            "time": "08:35 IST",
            "impact": "POSITIVE"
        }
    ]

