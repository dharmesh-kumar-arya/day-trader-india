"""Application configuration and default parameters for Day Trader India."""

import os
from pydantic import BaseModel

class AppConfig(BaseModel):
    app_name: str = "Day Trader India - Algorithmic Terminal"
    version: str = "1.0.0"
    env: str = os.getenv("APP_ENV", "development")
    
    # Dhan API credentials
    dhan_client_id: str = os.getenv("DHAN_CLIENT_ID", "")
    dhan_access_token: str = os.getenv("DHAN_ACCESS_TOKEN", "")
    
    # Trading Mode: Paper trading by default for maximum safety
    paper_trading: bool = True
    paper_capital_inr: float = 200000.0  # ₹2,00,000 initial virtual capital
    
    # Risk limits (in INR)
    default_max_risk_per_trade_inr: float = 1000.0
    default_max_daily_loss_inr: float = 3000.0
    min_reward_risk_ratio: float = 1.5
    default_leverage_mis: float = 5.0    # 5x SEBI intraday margin for equities
    
    # Timings (IST)
    market_open_time: str = "09:15"
    orb_cutoff_time: str = "09:30"
    no_entries_after: str = "14:30"
    auto_flatten_time: str = "15:15"
    market_close_time: str = "15:30"

config = AppConfig()

