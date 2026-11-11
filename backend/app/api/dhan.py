"""DhanHQ Execution and Broker Endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.dhan_service import dhan_service
from app.db.database import get_all_positions, get_orders_history, get_today_trades_stats

router = APIRouter(prefix="/api/dhan", tags=["Dhan Broker"])

class CredentialsRequest(BaseModel):
    client_id: str
    access_token: str

class OrderRequest(BaseModel):
    symbol: str
    side: str = "BUY"
    quantity: int
    price: float
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None
    is_paper: bool = True

@router.get("/status")
def connection_status():
    """Checks whether Dhan token is active or expired."""
    return dhan_service.check_connection_status()

@router.post("/credentials")
def update_credentials(req: CredentialsRequest):
    """Updates Dhan Client ID and Access Token."""
    dhan_service.update_credentials(req.client_id, req.access_token)
    return dhan_service.check_connection_status()

@router.post("/order")
def execute_order(req: OrderRequest):
    """Executes a Bracket Order via Dhan API or Paper Simulator."""
    return dhan_service.place_order(
        symbol=req.symbol,
        side=req.side,
        quantity=req.quantity,
        price=req.price,
        stop_loss_price=req.stop_loss_price,
        take_profit_price=req.take_profit_price,
        is_paper=req.is_paper
    )

@router.get("/positions")
def get_open_positions(is_paper: bool = True):
    """Returns active day-trade positions."""
    return {"positions": dhan_service.get_positions(is_paper=is_paper)}

@router.post("/flatten")
def auto_flatten(is_paper: bool = True):
    """Emergency or 3:15 PM auto-flatten all positions."""
    return dhan_service.flatten_all_positions(is_paper=is_paper)

@router.get("/history")
def get_trade_history(is_paper: Optional[bool] = None):
    """Returns persistent trade journal and position history from database."""
    return {"history": get_all_positions(is_paper=is_paper)}

@router.get("/orders")
def get_orders(limit: int = 50):
    """Returns persistent order audit trail from database."""
    return {"orders": get_orders_history(limit=limit)}

@router.get("/stats")
def get_daily_stats(is_paper: bool = True):
    """Returns today's cumulative trading and risk statistics."""
    return get_today_trades_stats(is_paper=is_paper)

