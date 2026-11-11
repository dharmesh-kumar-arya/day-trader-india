"""NSE / BSE Market Calendar, Timings and Holiday Schedule (Asia/Kolkata)."""

import datetime
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

NSE_HOLIDAYS_2026 = {
    "2026-01-26": "Republic Day",
    "2026-03-04": "Holi",
    "2026-03-20": "Ramzan Id (Id-Ul-Fitr)",
    "2026-03-31": "Mahavir Jayanti",
    "2026-04-03": "Good Friday",
    "2026-04-14": "Dr. Baba Saheb Ambedkar Jayanti",
    "2026-05-01": "Maharashtra Day",
    "2026-05-27": "Bakri Id (Id-Ul-Zuha)",
    "2026-06-26": "Muharram",
    "2026-08-15": "Independence Day",
    "2026-09-04": "Milad-Un-Nabi",
    "2026-10-02": "Mahatma Gandhi Jayanti",
    "2026-10-20": "Dussehra",
    "2026-11-08": "Diwali Laxmi Pujan (Muhurat Trading)",
    "2026-11-10": "Diwali Balipratipada",
    "2026-11-24": "Gurunanak Jayanti",
    "2026-12-25": "Christmas",
}

NSE_HOLIDAYS_2027 = {
    "2027-01-26": "Republic Day",
    "2027-03-23": "Holi",
    "2027-03-26": "Good Friday",
    "2027-04-14": "Dr. Ambedkar Jayanti",
    "2027-05-01": "Maharashtra Day",
    "2027-08-15": "Independence Day",
    "2027-10-02": "Mahatma Gandhi Jayanti",
    "2027-10-10": "Dussehra",
    "2027-10-29": "Diwali Laxmi Pujan",
    "2027-11-14": "Gurunanak Jayanti",
    "2027-12-25": "Christmas",
}

ALL_HOLIDAYS = {**NSE_HOLIDAYS_2026, **NSE_HOLIDAYS_2027}

def now_ist() -> datetime.datetime:
    """Returns current datetime in Asia/Kolkata timezone."""
    return datetime.datetime.now(IST)

def is_trading_day(dt: datetime.date = None) -> bool:
    """Checks if the given date is a weekday and not an NSE holiday."""
    if dt is None:
        dt = now_ist().date()
    if dt.weekday() >= 5:  # Saturday or Sunday
        return False
    dt_str = dt.strftime("%Y-%m-%d")
    return dt_str not in ALL_HOLIDAYS

def get_market_status(dt: datetime.datetime = None) -> dict:
    """Returns current market session status in IST."""
    if dt is None:
        dt = now_ist()
    
    current_date = dt.date()
    is_trading = is_trading_day(current_date)
    date_str = current_date.strftime("%Y-%m-%d")
    holiday_name = ALL_HOLIDAYS.get(date_str)
    
    current_time_str = dt.strftime("%H:%M")
    
    # Session windows
    if not is_trading:
        status = "CLOSED"
        message = f"Market Closed ({holiday_name or 'Weekend'})"
    elif current_time_str < "09:00":
        status = "PRE_MARKET_WAIT"
        message = "Pre-market starts at 09:00 IST"
    elif "09:00" <= current_time_str < "09:08":
        status = "PRE_MARKET_OPEN"
        message = "Pre-market order collection"
    elif "09:08" <= current_time_str < "09:15":
        status = "PRE_MARKET_MATCH"
        message = "Pre-market price discovery"
    elif "09:15" <= current_time_str < "09:30":
        status = "OPENING_RANGE"
        message = "15m Opening Range forming (09:15 - 09:30)"
    elif "09:30" <= current_time_str < "14:30":
        status = "REGULAR_TRADING"
        message = "Regular day-trading session open"
    elif "14:30" <= current_time_str < "15:15":
        status = "LATE_SESSION"
        message = "Late session: No new entries, manage open positions"
    elif "15:15" <= current_time_str < "15:30":
        status = "SQUARE_OFF"
        message = "Mandatory Intraday Square-off in progress"
    elif "15:30" <= current_time_str < "16:00":
        status = "POST_MARKET"
        message = "Post-market closing session"
    else:
        status = "CLOSED"
        message = "Market Closed for the day"
        
    # Calculate seconds to square-off (15:15 IST)
    square_off_time = dt.replace(hour=15, minute=15, second=0, microsecond=0)
    seconds_to_squareoff = max(0, int((square_off_time - dt).total_seconds())) if is_trading and current_time_str < "15:15" else 0
    
    return {
        "status": status,
        "message": message,
        "is_trading_day": is_trading,
        "holiday": holiday_name,
        "current_time_ist": dt.strftime("%Y-%m-%d %H:%M:%S IST"),
        "seconds_to_squareoff": seconds_to_squareoff,
    }

