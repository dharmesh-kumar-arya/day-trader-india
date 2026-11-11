"""Scanner and Screener Endpoints."""

from fastapi import APIRouter, Query
from typing import Optional
from app.services.scanner_engine import run_scanner

router = APIRouter(prefix="/api/scanner", tags=["Scanner"])

@router.get("/run")
def scan_setups(sector: Optional[str] = Query(None), only_setups: bool = Query(False)):
    """Runs intraday setup scanner across universe."""
    results = run_scanner(sector=sector, only_setups=only_setups)
    return {
        "count": len(results),
        "results": results
    }

