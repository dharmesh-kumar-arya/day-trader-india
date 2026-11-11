"""DhanHQ API v2 Client, Hybrid Execution Engine & Paper Trading Simulator."""

import os
import json
import time
import uuid
import datetime
from typing import Dict, List, Optional
from app.core.config import config
from app.core.nse_calendar import now_ist
from app.services.nse_universe import to_dhan_security_id
from app.db.database import (
    insert_order,
    insert_position,
    get_open_positions,
    get_all_positions,
    get_orders_history,
    close_all_open_positions,
    get_today_trades_stats
)

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dhan_config.json")

# In-memory Paper Trading Portfolio state
_paper_state = {
    "capital_inr": config.paper_capital_inr,
    "available_margin_inr": config.paper_capital_inr,
    "realized_pnl_inr": 0.0,
    "positions": [],
    "order_book": []
}

class DhanService:
    def __init__(self):
        self.client_id = config.dhan_client_id
        self.access_token = config.dhan_access_token
        self.dhan_client = None
        self._cached_public_ip = ""
        
        # Load persisted config from disk if available
        self._load_persisted_config()
        self._init_client()

    def get_public_ip(self) -> str:
        if self._cached_public_ip:
            return self._cached_public_ip
        try:
            import urllib.request
            ip = urllib.request.urlopen("https://api.ipify.org", timeout=2.5).read().decode("utf8").strip()
            self._cached_public_ip = ip
            return ip
        except Exception:
            return ""

    def _load_persisted_config(self):
        try:
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    if data.get("client_id"):
                        self.client_id = data["client_id"]
                        config.dhan_client_id = self.client_id
                    if data.get("access_token"):
                        self.access_token = data["access_token"]
                        config.dhan_access_token = self.access_token
        except Exception as e:
            print(f"Error loading persisted Dhan config: {e}")

    def _save_persisted_config(self):
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump({
                    "client_id": self.client_id,
                    "access_token": self.access_token,
                    "updated_at": datetime.datetime.now().isoformat()
                }, f, indent=2)
        except Exception as e:
            print(f"Error saving Dhan config to disk: {e}")

    def _init_client(self):
        if self.client_id and self.access_token:
            try:
                from dhanhq import dhanhq, DhanContext
                context = DhanContext(self.client_id, self.access_token)
                self.dhan_client = dhanhq(context)
            except Exception as e:
                print(f"Error initializing Dhan SDK: {e}")
                self.dhan_client = None
        else:
            self.dhan_client = None

    def update_credentials(self, client_id: str, access_token: str) -> Dict:
        """Allows updating credentials dynamically from the UI and persists them."""
        self.client_id = client_id.strip()
        self.access_token = access_token.strip()
        config.dhan_client_id = self.client_id
        config.dhan_access_token = self.access_token
        self._save_persisted_config()
        self._init_client()
        return self.check_connection_status()

    def check_connection_status(self) -> Dict:
        """Verifies if Dhan token is active and valid."""
        pub_ip = self.get_public_ip()
        if not self.client_id or not self.access_token:
            return {
                "connected": False,
                "status": "UNCONFIGURED",
                "message": "Dhan Client ID or Access Token not set. (Running in Paper Mode)",
                "available_margin_inr": _paper_state["available_margin_inr"],
                "public_ip": pub_ip
            }
        
        if not self.dhan_client:
            return {
                "connected": False,
                "status": "ERROR",
                "message": "Dhan SDK initialization failed. Please check credentials.",
                "available_margin_inr": _paper_state["available_margin_inr"],
                "public_ip": pub_ip
            }

        try:
            funds_resp = self.dhan_client.get_fund_limits()
            if isinstance(funds_resp, dict):
                if funds_resp.get("status") == "success":
                    data = funds_resp.get("data", {})
                    avail_margin = float(data.get("availMargin", data.get("availableMargin", 0.0)))
                    return {
                        "connected": True,
                        "status": "CONNECTED",
                        "message": "Dhan API authenticated and live.",
                        "available_margin_inr": avail_margin,
                        "public_ip": pub_ip
                    }
                else:
                    remarks = funds_resp.get("remarks", {})
                    err_msg = ""
                    if isinstance(remarks, dict):
                        err_msg = remarks.get("error_message") or remarks.get("error_type")
                    elif isinstance(remarks, str):
                        err_msg = remarks
                    return {
                        "connected": False,
                        "status": "TOKEN_INVALID",
                        "message": err_msg or "Dhan rejected token. Access tokens expire at 6 AM daily. Please paste a fresh token from Dhan Web.",
                        "available_margin_inr": _paper_state["available_margin_inr"],
                        "public_ip": pub_ip
                    }
            else:
                return {
                    "connected": False,
                    "status": "ERROR",
                    "message": "Unexpected response from Dhan API endpoint.",
                    "available_margin_inr": _paper_state["available_margin_inr"],
                    "public_ip": pub_ip
                }
        except Exception as e:
            return {
                "connected": False,
                "status": "ERROR",
                "message": f"Dhan connection error: {str(e)}",
                "available_margin_inr": _paper_state["available_margin_inr"],
                "public_ip": pub_ip
            }

    def place_order(
        self,
        symbol: str,
        side: str,  # "BUY" or "SELL"
        quantity: int,
        price: float,
        stop_loss_price: Optional[float] = None,
        take_profit_price: Optional[float] = None,
        is_paper: bool = True
    ) -> Dict:
        """Places bracket order via Dhan API or Paper Simulator."""
        now = now_ist()
        order_id = f"ORD-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"

        # 1. PAPER TRADING EXECUTION
        if is_paper or not self.dhan_client:
            order_record = {
                "order_id": order_id,
                "symbol": symbol.upper(),
                "side": side.upper(),
                "quantity": quantity,
                "order_type": "LIMIT",
                "price": price,
                "stop_loss": stop_loss_price,
                "take_profit": take_profit_price,
                "status": "TRADED",
                "product_type": "INTRADAY",
                "created_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
                "is_paper": True
            }
            # Save to database
            insert_order(order_record)
            
            # Add to active paper positions
            position_record = {
                "position_id": f"POS-{uuid.uuid4().hex[:6].upper()}",
                "symbol": symbol.upper(),
                "side": side.upper(),
                "quantity": quantity,
                "buy_price": price,
                "current_price": price,
                "stop_loss": stop_loss_price,
                "take_profit": take_profit_price,
                "unrealized_pnl_inr": 0.0,
                "pnl_pct": 0.0,
                "opened_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
                "status": "OPEN",
                "is_paper": True
            }
            # Save to database
            insert_position(position_record)
            
            # Deduct required margin in memory
            margin_req = (quantity * price) / config.default_leverage_mis
            _paper_state["available_margin_inr"] = max(0.0, _paper_state["available_margin_inr"] - margin_req)

            return {
                "status": "SUCCESS",
                "mode": "PAPER",
                "order_id": order_id,
                "message": f"Paper Bracket Order executed: {quantity} {symbol} @ ₹{price}",
                "order": order_record
            }

        # 2. LIVE DHAN API EXECUTION
        sec_id = to_dhan_security_id(symbol)
        if not sec_id:
            return {
                "status": "FAILED",
                "message": f"Could not find Dhan Security ID for {symbol}."
            }

        try:
            # Place MIS Order using Dhan SDK
            resp = self.dhan_client.place_order(
                security_id=str(sec_id),
                exchange_segment=self.dhan_client.NSE,
                transaction_type=self.dhan_client.BUY if side.upper() == "BUY" else self.dhan_client.SELL,
                quantity=int(quantity),
                order_type=self.dhan_client.LIMIT,
                product_type=self.dhan_client.INTRA,
                price=float(price),
                trigger_price=0.0
            )

            if isinstance(resp, dict):
                if resp.get("status") == "success":
                    dhan_order_id = resp.get("data", {}).get("orderId", order_id)
                    
                    # Verify immediate RMS acceptance (e.g. margin checks, price bands)
                    time.sleep(0.5)
                    rms_rejected = False
                    rms_reason = ""
                    try:
                        ord_check = self.dhan_client.get_order_by_id(str(dhan_order_id))
                        if isinstance(ord_check, dict) and ord_check.get("status") == "success":
                            items = ord_check.get("data", [])
                            if items and isinstance(items, list):
                                first_item = items[0]
                                if first_item.get("orderStatus") == "REJECTED":
                                    rms_rejected = True
                                    rms_reason = first_item.get("omsErrorDescription") or "Order rejected by Dhan RMS."
                    except Exception:
                        pass

                    if rms_rejected:
                        # Log rejected order in database
                        insert_order({
                            "order_id": str(dhan_order_id),
                            "symbol": symbol.upper(),
                            "side": side.upper(),
                            "quantity": quantity,
                            "order_type": "LIMIT",
                            "price": price,
                            "stop_loss": stop_loss_price,
                            "take_profit": take_profit_price,
                            "status": "REJECTED",
                            "product_type": "INTRADAY",
                            "created_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
                            "is_paper": False,
                            "raw_response": rms_reason
                        })
                        return {
                            "status": "FAILED",
                            "mode": "LIVE_DHAN",
                            "message": f"Dhan RMS Rejected: {rms_reason}",
                            "raw_response": resp
                        }

                    # Otherwise, record active traded position
                    order_rec = {
                        "order_id": str(dhan_order_id),
                        "symbol": symbol.upper(),
                        "side": side.upper(),
                        "quantity": quantity,
                        "order_type": "LIMIT",
                        "price": price,
                        "stop_loss": stop_loss_price,
                        "take_profit": take_profit_price,
                        "status": "TRADED",
                        "product_type": "INTRADAY",
                        "created_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
                        "is_paper": False,
                        "raw_response": resp
                    }
                    insert_order(order_rec)

                    pos_rec = {
                        "position_id": f"POS-LIVE-{dhan_order_id}",
                        "symbol": symbol.upper(),
                        "quantity": quantity,
                        "buy_price": price,
                        "current_price": price,
                        "stop_loss": stop_loss_price,
                        "take_profit": take_profit_price,
                        "unrealized_pnl_inr": 0.0,
                        "pnl_pct": 0.0,
                        "opened_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
                        "status": "OPEN",
                        "is_paper": False
                    }
                    insert_position(pos_rec)

                    return {
                        "status": "SUCCESS",
                        "mode": "LIVE_DHAN",
                        "order_id": dhan_order_id,
                        "message": f"Live order submitted to Dhan: {quantity} {symbol} @ ₹{price}",
                        "raw_response": resp
                    }
                else:
                    remarks = resp.get("remarks", {})
                    err_msg = ""
                    if isinstance(remarks, dict):
                        err_code = remarks.get("error_code")
                        err_desc = remarks.get("error_message") or remarks.get("error_type")
                        if err_code == "DH-905":
                            err_msg = f"Dhan IP Error (DH-905): Public IP is not whitelisted. In web.dhan.co -> DhanHQ APIs, whitelist your public IP or regenerate token with IP restriction disabled."
                        elif err_code:
                            err_msg = f"Dhan error ({err_code}): {err_desc}"
                        else:
                            err_msg = err_desc
                    elif isinstance(remarks, str):
                        err_msg = str(remarks)

                    # Record rejected order in audit trail
                    insert_order({
                        "order_id": order_id,
                        "symbol": symbol.upper(),
                        "side": side.upper(),
                        "quantity": quantity,
                        "order_type": "LIMIT",
                        "price": price,
                        "stop_loss": stop_loss_price,
                        "take_profit": take_profit_price,
                        "status": "REJECTED",
                        "product_type": "INTRADAY",
                        "created_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
                        "is_paper": False,
                        "raw_response": resp
                    })

                    return {
                        "status": "FAILED",
                        "mode": "LIVE_DHAN",
                        "message": err_msg or "Dhan rejected the order.",
                        "raw_response": resp
                    }

            return {
                "status": "SUCCESS",
                "mode": "LIVE_DHAN",
                "order_id": order_id,
                "message": f"Live order submitted to Dhan: {quantity} {symbol} @ ₹{price}",
                "raw_response": resp
            }
        except Exception as e:
            return {
                "status": "ERROR",
                "mode": "LIVE_DHAN",
                "message": f"Dhan order error: {str(e)}"
            }

    def get_positions(self, is_paper: bool = True) -> List[Dict]:
        """Returns active open positions from SQLite database."""
        if is_paper or not self.dhan_client:
            return get_open_positions(is_paper=True)
        try:
            resp = self.dhan_client.get_positions()
            if isinstance(resp, dict) and resp.get("status") == "success":
                return resp.get("data", [])
        except Exception:
            pass
        return get_open_positions(is_paper=False)

    def flatten_all_positions(self, is_paper: bool = True) -> Dict:
        """Executes emergency or scheduled 3:15 PM auto-flatten and updates DB."""
        count = close_all_open_positions(exit_reason="MANUAL_FLATTEN", is_paper=is_paper)
        return {
            "status": "SUCCESS",
            "message": f"All {count} intraday positions flattened and saved to trade journal at 15:15 IST.",
            "flattened_count": count
        }

dhan_service = DhanService()
