"""Main FastAPI Application Entrypoint for Day Trader India."""

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import config
from app.core.nse_calendar import now_ist
from app.api.market import router as market_router
from app.api.scanner import router as scanner_router
from app.api.plan import router as plan_router
from app.api.dhan import router as dhan_router
from app.api.feeds import router as feeds_router
from app.api.ws import router as ws_router, manager

app = FastAPI(
    title=config.app_name,
    version=config.version,
    description="Algorithmic Day-Trading Platform & Dashboard for Indian Equities (NSE/BSE) with DhanHQ API."
)

# Enable CORS for React frontend (Vite defaults to localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(market_router)
app.include_router(scanner_router)
app.include_router(plan_router)
app.include_router(dhan_router)
app.include_router(feeds_router)
app.include_router(ws_router)

@app.get("/")
def root():
    return {
        "app": config.app_name,
        "version": config.version,
        "status": "ONLINE",
        "current_time_ist": now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
    }

# Background Daemon: Automated 15:15 IST Square-Off Worker, DB Init & WebSocket Live Ticker
@app.on_event("startup")
async def start_background_workers():
    from app.db.database import init_db
    init_db()
    asyncio.create_task(_auto_flatten_daemon())
    from app.api.ws import live_market_ticker
    asyncio.create_task(live_market_ticker())

async def _auto_flatten_daemon():
    from app.services.dhan_service import dhan_service
    from app.core.nse_calendar import is_trading_day
    last_flatten_date = ""
    while True:
        try:
            now = now_ist()
            today_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M")
            if is_trading_day(now.date()):
                if time_str >= "15:15" and last_flatten_date != today_str:
                    print(f"[{now.strftime('%H:%M:%S IST')}] Automated 15:15 IST auto-squareoff triggered.")
                    dhan_service.flatten_all_positions(is_paper=True)
                    dhan_service.flatten_all_positions(is_paper=False)
                    last_flatten_date = today_str
        except Exception as e:
            print(f"Auto-flatten worker error: {e}")
        await asyncio.sleep(5)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

