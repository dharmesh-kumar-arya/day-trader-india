"""Trade Planning, Time Machine Simulation & Risk Verification Endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.entry_exit import create_trade_plan
from app.services.timemachine_engine import run_time_machine_simulation
from app.services.risk_budget import size_position_inr, run_pre_trade_risk_check

router = APIRouter(prefix="/api/plan", tags=["Plan & Simulation"])

class PlanRequest(BaseModel):
    symbol: str
    entry_price: Optional[float] = None
    stop_mode: str = "or_mid"
    target_multiple: float = 2.0
    custom_stop: Optional[float] = None
    custom_target: Optional[float] = None
    side: str = "BUY"

class SizingRequest(BaseModel):
    entry_price: float
    stop_price: float
    account_capital_inr: float = 100000.0
    max_risk_inr: float = 1000.0
    leverage: float = 5.0

class SimulationRequest(BaseModel):
    symbol: str
    entry_price: float
    stop_price: float
    target_price: float
    replays: int = 10000
    seed: Optional[int] = None

class RiskCheckRequest(BaseModel):
    symbol: str
    entry_price: float
    stop_price: float
    target_price: float
    shares: int
    upper_circuit_price: Optional[float] = None
    max_risk_per_trade_inr: float = 1000.0
    max_daily_loss_inr: float = 3000.0
    dhan_token_valid: bool = True
    side: str = "BUY"

@router.post("/create")
def plan_trade(req: PlanRequest):
    """Generates structured exit plan (stop-loss, target, R:R)."""
    try:
        plan = create_trade_plan(
            symbol=req.symbol,
            entry_price=req.entry_price,
            stop_mode=req.stop_mode,
            target_multiple=req.target_multiple,
            custom_stop=req.custom_stop,
            custom_target=req.custom_target,
            side=req.side
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/size")
def calculate_size(req: SizingRequest):
    """Calculates position sizing in INR with 5x MIS margin."""
    return size_position_inr(
        entry_price=req.entry_price,
        stop_price=req.stop_price,
        account_capital_inr=req.account_capital_inr,
        max_risk_inr=req.max_risk_inr,
        leverage=req.leverage
    )

@router.post("/timemachine")
def simulate_timemachine(req: SimulationRequest):
    """Executes 10,000 Monte Carlo replays using 60-day historical NSE 5m bars."""
    return run_time_machine_simulation(
        symbol=req.symbol,
        entry_price=req.entry_price,
        stop_price=req.stop_price,
        target_price=req.target_price,
        replays=req.replays,
        seed=req.seed
    )

@router.post("/risk_check")
def verify_risk(req: RiskCheckRequest):
    """Evaluates the proposed order against the 7 pre-trade safety gates."""
    return run_pre_trade_risk_check(
        symbol=req.symbol,
        entry_price=req.entry_price,
        stop_price=req.stop_price,
        target_price=req.target_price,
        shares=req.shares,
        upper_circuit_price=req.upper_circuit_price,
        max_risk_per_trade_inr=req.max_risk_per_trade_inr,
        max_daily_loss_inr=req.max_daily_loss_inr,
        dhan_token_valid=req.dhan_token_valid,
        side=req.side
    )

