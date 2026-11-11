"""Alerts Manager: Tracks market events, price triggers and broadcasts notifications."""

import datetime
from typing import List, Dict
from app.core.nse_calendar import now_ist

_alert_history: List[Dict] = []

def add_alert(alert_type: str, title: str, message: str, symbol: str = "") -> Dict:
    """Records an alert event and returns it."""
    alert_item = {
        "id": f"ALT-{int(datetime.datetime.now().timestamp() * 1000)}",
        "type": alert_type,  # "BELL", "TRIGGER", "STOP", "TARGET", "SQUAREOFF", "WARNING"
        "title": title,
        "message": message,
        "symbol": symbol.upper(),
        "time": now_ist().strftime("%H:%M:%S IST"),
        "timestamp": int(datetime.datetime.now().timestamp())
    }
    _alert_history.insert(0, alert_item)
    # Keep last 50 alerts
    if len(_alert_history) > 50:
        _alert_history.pop()
    return alert_item

def get_alerts() -> List[Dict]:
    """Returns the list of recent alerts."""
    if not _alert_history:
        # Seed initial session alerts
        add_alert("BELL", "Market Open", "NSE equity market open for trading (09:15 IST)")
        add_alert("BELL", "15m ORB Formed", "Opening range highs and lows locked (09:30 IST)")
    return _alert_history

