"""Feeds Endpoints: Corporate Announcements, FII/DII Institutional Flows & Alerts."""

from fastapi import APIRouter
from app.services.institutional import get_corporate_announcements, get_fii_dii_flows, get_bulk_and_block_deals
from app.services.alerts_manager import get_alerts, add_alert

router = APIRouter(prefix="/api/feeds", tags=["Feeds & Catalysts"])

@router.get("/corporate")
def corporate_announcements():
    """Returns today's corporate announcements and earnings releases."""
    return {"announcements": get_corporate_announcements()}

@router.get("/institutional")
def institutional_activity():
    """Returns FII/DII net cash flow and NSE Bulk Deals."""
    return {
        "flows": get_fii_dii_flows(),
        "bulk_deals": get_bulk_and_block_deals()
    }

@router.get("/alerts")
def alerts_history():
    """Returns recent alerts."""
    return {"alerts": get_alerts()}

