import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from app.core.nse_calendar import now_ist

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "day_trader.db")

def init_db():
    """Initializes the SQLite database and creates tables if they don't exist."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        stop_loss REAL,
        take_profit REAL,
        order_type TEXT DEFAULT 'LIMIT',
        product_type TEXT DEFAULT 'INTRADAY',
        status TEXT NOT NULL,
        is_paper INTEGER NOT NULL DEFAULT 1,
        raw_response TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Positions Table (Active and Historical Closed Positions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id TEXT UNIQUE NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL DEFAULT 'BUY',
        quantity INTEGER NOT NULL,
        buy_price REAL NOT NULL,
        current_price REAL NOT NULL,
        exit_price REAL,
        stop_loss REAL,
        take_profit REAL,
        unrealized_pnl_inr REAL DEFAULT 0.0,
        realized_pnl_inr REAL DEFAULT 0.0,
        total_charges_inr REAL DEFAULT 0.0,
        net_pnl_inr REAL DEFAULT 0.0,
        status TEXT NOT NULL DEFAULT 'OPEN',
        exit_reason TEXT,
        is_paper INTEGER NOT NULL DEFAULT 1,
        opened_at TEXT NOT NULL,
        closed_at TEXT
    );
    """)

    # Ensure 'side' column exists in case of existing table
    cursor.execute("PRAGMA table_info(positions)")
    cols = [row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in cursor.fetchall()]
    if "side" not in cols:
        cursor.execute("ALTER TABLE positions ADD COLUMN side TEXT DEFAULT 'BUY'")

    # 3. Daily Risk & Trade Journal Audit Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_risk_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        risk_inr REAL NOT NULL,
        action TEXT NOT NULL,
        verdict TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
    );
    """)

    # 4. Trade Plans Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trade_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_price REAL NOT NULL,
        target_price REAL NOT NULL,
        risk_reward_ratio REAL,
        conviction_score INTEGER,
        conviction_grade TEXT,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

def get_connection():
    """Returns a SQLite connection with dict-like row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Database Helper Functions

def insert_order(order_data: Dict) -> None:
    conn = get_connection()
    try:
        raw_resp = json.dumps(order_data.get("raw_response", {})) if isinstance(order_data.get("raw_response"), dict) else str(order_data.get("raw_response", ""))
        conn.execute("""
            INSERT OR REPLACE INTO orders (
                order_id, symbol, side, quantity, price, stop_loss, take_profit,
                order_type, product_type, status, is_paper, raw_response, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_data["order_id"],
            order_data["symbol"],
            order_data["side"],
            int(order_data["quantity"]),
            float(order_data["price"]),
            float(order_data.get("stop_loss") or 0.0),
            float(order_data.get("take_profit") or 0.0),
            order_data.get("order_type", "LIMIT"),
            order_data.get("product_type", "INTRADAY"),
            order_data["status"],
            1 if order_data.get("is_paper", True) else 0,
            raw_resp,
            order_data.get("created_at") or now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
        ))
        conn.commit()
    finally:
        conn.close()

def insert_position(pos_data: Dict) -> None:
    conn = get_connection()
    try:
        conn.execute("""
            INSERT OR REPLACE INTO positions (
                position_id, symbol, side, quantity, buy_price, current_price, exit_price,
                stop_loss, take_profit, unrealized_pnl_inr, realized_pnl_inr,
                total_charges_inr, net_pnl_inr, status, exit_reason, is_paper,
                opened_at, closed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pos_data["position_id"],
            pos_data["symbol"],
            pos_data.get("side", "BUY").upper(),
            int(pos_data["quantity"]),
            float(pos_data["buy_price"]),
            float(pos_data.get("current_price", pos_data["buy_price"])),
            pos_data.get("exit_price"),
            float(pos_data.get("stop_loss") or 0.0),
            float(pos_data.get("take_profit") or 0.0),
            float(pos_data.get("unrealized_pnl_inr") or 0.0),
            float(pos_data.get("realized_pnl_inr") or 0.0),
            float(pos_data.get("total_charges_inr") or 0.0),
            float(pos_data.get("net_pnl_inr") or 0.0),
            pos_data.get("status", "OPEN"),
            pos_data.get("exit_reason"),
            1 if pos_data.get("is_paper", True) else 0,
            pos_data.get("opened_at") or now_ist().strftime("%Y-%m-%d %H:%M:%S IST"),
            pos_data.get("closed_at")
        ))
        conn.commit()
    finally:
        conn.close()

def get_open_positions(is_paper: bool = True) -> List[Dict]:
    """Returns active open positions, synchronizing prices with live market and triggering brackets."""
    from app.services.market_data import get_symbol_candles
    from app.services.charges_calculator import calculate_intraday_charges
    conn = get_connection()
    now_str = now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM positions
            WHERE status = 'OPEN' AND is_paper = ?
            ORDER BY id DESC
        """, (1 if is_paper else 0,))
        open_pos = [dict(row) for row in cur.fetchall()]
        if not open_pos:
            return []

        active_positions = []
        for pos in open_pos:
            sym = pos["symbol"]
            candles = get_symbol_candles(sym, interval="1m", range_str="1d")
            latest_price = candles[-1]["close"] if candles else pos["current_price"]
            buy_price = pos["buy_price"]
            qty = pos["quantity"]
            side = pos.get("side", "BUY").upper()
            stop_loss = pos.get("stop_loss") or 0.0
            take_profit = pos.get("take_profit") or 0.0

            # Calculate live MTM PnL based on Long vs Short side
            if side == "SELL":
                # Short: profit when price falls below entry
                unrealized_pnl = round((buy_price - latest_price) * qty, 2)
                pnl_pct = round(((buy_price - latest_price) / buy_price) * 100.0, 2) if buy_price > 0 else 0.0
                
                # Bracket Order Triggers for Short
                exit_reason = None
                if stop_loss > 0 and latest_price >= stop_loss:
                    exit_reason = "STOP_HIT"
                elif take_profit > 0 and latest_price <= take_profit:
                    exit_reason = "TARGET_HIT"
            else:
                # Long: profit when price rises above entry
                unrealized_pnl = round((latest_price - buy_price) * qty, 2)
                pnl_pct = round(((latest_price - buy_price) / buy_price) * 100.0, 2) if buy_price > 0 else 0.0
                
                # Bracket Order Triggers for Long
                exit_reason = None
                if stop_loss > 0 and latest_price <= stop_loss:
                    exit_reason = "STOP_HIT"
                elif take_profit > 0 and latest_price >= take_profit:
                    exit_reason = "TARGET_HIT"

            if exit_reason:
                charges = calculate_intraday_charges(buy_price=buy_price, sell_price=latest_price, quantity=qty)
                tot_charges = charges["total_charges"]
                net_pnl = round(unrealized_pnl - tot_charges, 2)
                cur.execute("""
                    UPDATE positions
                    SET status = 'CLOSED',
                        current_price = ?,
                        exit_price = ?,
                        realized_pnl_inr = ?,
                        total_charges_inr = ?,
                        net_pnl_inr = ?,
                        exit_reason = ?,
                        closed_at = ?
                    WHERE position_id = ?
                """, (latest_price, latest_price, unrealized_pnl, tot_charges, net_pnl, exit_reason, now_str, pos["position_id"]))
            else:
                cur.execute("""
                    UPDATE positions
                    SET current_price = ?,
                        unrealized_pnl_inr = ?
                    WHERE position_id = ?
                """, (latest_price, unrealized_pnl, pos["position_id"]))
                pos["current_price"] = latest_price
                pos["unrealized_pnl_inr"] = unrealized_pnl
                pos["pnl_pct"] = pnl_pct
                active_positions.append(pos)

        conn.commit()
        return active_positions
    finally:
        conn.close()

def get_all_positions(is_paper: Optional[bool] = None) -> List[Dict]:
    """Returns all positions (both open and historical closed)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        if is_paper is not None:
            cur.execute("""
                SELECT * FROM positions
                WHERE is_paper = ?
                ORDER BY id DESC
            """, (1 if is_paper else 0,))
        else:
            cur.execute("SELECT * FROM positions ORDER BY id DESC")
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def get_orders_history(limit: int = 50) -> List[Dict]:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM orders
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def close_all_open_positions(exit_reason: str = "AUTO_SQUAREOFF_1515", is_paper: bool = True) -> int:
    """Closes all currently open positions with calculated charges and P&L."""
    from app.services.charges_calculator import calculate_intraday_charges
    conn = get_connection()
    now_str = now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
    closed_count = 0
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM positions WHERE status = 'OPEN' AND is_paper = ?", (1 if is_paper else 0,))
        open_pos = [dict(r) for r in cur.fetchall()]

        for pos in open_pos:
            buy_p = pos["buy_price"]
            curr_p = pos["current_price"]
            qty = pos["quantity"]
            side = pos.get("side", "BUY").upper()
            gross_pnl = round((buy_p - curr_p) * qty, 2) if side == "SELL" else round((curr_p - buy_p) * qty, 2)
            
            # Accurate Indian taxes
            charges = calculate_intraday_charges(buy_price=buy_p, sell_price=curr_p, quantity=qty)
            tot_charges = charges["total_charges"]
            net_pnl = round(gross_pnl - tot_charges, 2)

            cur.execute("""
                UPDATE positions
                SET status = 'CLOSED',
                    exit_price = ?,
                    realized_pnl_inr = ?,
                    total_charges_inr = ?,
                    net_pnl_inr = ?,
                    exit_reason = ?,
                    closed_at = ?
                WHERE position_id = ?
            """, (curr_p, gross_pnl, tot_charges, net_pnl, exit_reason, now_str, pos["position_id"]))
            closed_count += 1

        conn.commit()
        return closed_count
    finally:
        conn.close()

def close_individual_position(position_id: str, exit_reason: str = "MANUAL_EXIT") -> Optional[Dict]:
    """Closes a single position by position_id or id with live price and accurate Indian statutory taxes."""
    from app.services.charges_calculator import calculate_intraday_charges
    from app.services.market_data import get_symbol_candles
    conn = get_connection()
    now_str = now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM positions WHERE (position_id = ? OR CAST(id AS TEXT) = ?) AND status = 'OPEN'", (str(position_id), str(position_id)))
        row = cur.fetchone()
        if not row:
            return None
        pos = dict(row)
        sym = pos["symbol"]
        qty = pos["quantity"]
        buy_p = pos["buy_price"]
        side = pos.get("side", "BUY").upper()

        candles = get_symbol_candles(sym, interval="1m", range_str="1d")
        latest_price = candles[-1]["close"] if candles else pos["current_price"]

        if side == "SELL":
            gross_pnl = round((buy_p - latest_price) * qty, 2)
        else:
            gross_pnl = round((latest_price - buy_p) * qty, 2)

        charges = calculate_intraday_charges(buy_price=buy_p, sell_price=latest_price, quantity=qty)
        tot_charges = charges["total_charges"]
        net_pnl = round(gross_pnl - tot_charges, 2)

        cur.execute("""
            UPDATE positions
            SET status = 'CLOSED',
                current_price = ?,
                exit_price = ?,
                realized_pnl_inr = ?,
                total_charges_inr = ?,
                net_pnl_inr = ?,
                exit_reason = ?,
                closed_at = ?
            WHERE id = ?
        """, (latest_price, latest_price, gross_pnl, tot_charges, net_pnl, exit_reason, now_str, pos["id"]))
        conn.commit()

        pos["status"] = "CLOSED"
        pos["current_price"] = latest_price
        pos["exit_price"] = latest_price
        pos["realized_pnl_inr"] = gross_pnl
        pos["total_charges_inr"] = tot_charges
        pos["net_pnl_inr"] = net_pnl
        pos["exit_reason"] = exit_reason
        pos["closed_at"] = now_str
        pos["charges_breakdown"] = charges
        return pos
    finally:
        conn.close()

def get_position_by_id(position_id: str) -> Optional[Dict]:
    """Retrieves full details of a position by position_id or integer id."""
    from app.services.charges_calculator import calculate_intraday_charges
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM positions WHERE position_id = ? OR CAST(id AS TEXT) = ?", (str(position_id), str(position_id)))
        row = cur.fetchone()
        if not row:
            return None
        pos = dict(row)
        exit_p = pos.get("exit_price") or pos.get("current_price") or pos["buy_price"]
        pos["charges_breakdown"] = calculate_intraday_charges(
            buy_price=pos["buy_price"],
            sell_price=exit_p,
            quantity=pos["quantity"]
        )
        return pos
    finally:
        conn.close()

def get_today_trades_stats(is_paper: bool = True) -> Dict:
    """Returns today's cumulative stats: total trades, total risk, realized P&L."""
    conn = get_connection()
    today_prefix = now_ist().strftime("%Y-%m-%d")
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(realized_pnl_inr), 0.0) as total_realized_pnl,
                COALESCE(SUM(total_charges_inr), 0.0) as total_charges,
                COALESCE(SUM(net_pnl_inr), 0.0) as total_net_pnl
            FROM positions
            WHERE opened_at LIKE ? AND is_paper = ?
        """, (f"{today_prefix}%", 1 if is_paper else 0))
        row = cur.fetchone()
        return dict(row) if row else {
            "count": 0,
            "total_realized_pnl": 0.0,
            "total_charges": 0.0,
            "total_net_pnl": 0.0
        }
    finally:
        conn.close()

# Auto-initialize on import
init_db()
