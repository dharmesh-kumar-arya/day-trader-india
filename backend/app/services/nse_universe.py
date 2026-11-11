"""NSE F&O Universe, Symbol Resolvers, Sector Classification, and Dhan Security IDs."""

from typing import List, Dict, Optional

# Curated high-liquidity NSE F&O day-trading universe
# F&O stocks do not have 5%/10% circuit freezes, making them the safest day-trading instruments in India.
NSE_FO_UNIVERSE = [
    # Banking & Financials
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy", "dhan_id": "2885"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Banking", "dhan_id": "1333"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Banking", "dhan_id": "4963"},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking", "dhan_id": "3045"},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "sector": "Banking", "dhan_id": "5900"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Banking", "dhan_id": "1922"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "sector": "Financials", "dhan_id": "317"},
    {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Ltd", "sector": "Financials", "dhan_id": "16675"},
    {"symbol": "INDUSINDBK", "name": "IndusInd Bank Ltd", "sector": "Banking", "dhan_id": "5258"},
    
    # IT & Tech
    {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "IT", "dhan_id": "11536"},
    {"symbol": "INFY", "name": "Infosys Ltd", "sector": "IT", "dhan_id": "1594"},
    {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "sector": "IT", "dhan_id": "7229"},
    {"symbol": "WIPRO", "name": "Wipro Ltd", "sector": "IT", "dhan_id": "3787"},
    {"symbol": "TECHM", "name": "Tech Mahindra Ltd", "sector": "IT", "dhan_id": "13538"},
    {"symbol": "LTIM", "name": "LTIMindtree Ltd", "sector": "IT", "dhan_id": "17818"},
    
    # Auto
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "sector": "Auto", "dhan_id": "3456"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India", "sector": "Auto", "dhan_id": "10999"},
    {"symbol": "M&M", "name": "Mahindra & Mahindra", "sector": "Auto", "dhan_id": "2031"},
    {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto Ltd", "sector": "Auto", "dhan_id": "16669"},
    {"symbol": "EICHERMOT", "name": "Eicher Motors Ltd", "sector": "Auto", "dhan_id": "910"},
    {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp Ltd", "sector": "Auto", "dhan_id": "1348"},
    
    # Metals & Mining
    {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "sector": "Metals", "dhan_id": "3499"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd", "sector": "Metals", "dhan_id": "11723"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries", "sector": "Metals", "dhan_id": "1363"},
    {"symbol": "VEDL", "name": "Vedanta Ltd", "sector": "Metals", "dhan_id": "3063"},
    {"symbol": "COALINDIA", "name": "Coal India Ltd", "sector": "Metals", "dhan_id": "20374"},
    
    # Energy, Oil & Power
    {"symbol": "NTPC", "name": "NTPC Ltd", "sector": "Energy", "dhan_id": "11630"},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation", "sector": "Energy", "dhan_id": "14977"},
    {"symbol": "ONGC", "name": "Oil & Natural Gas Corp", "sector": "Energy", "dhan_id": "2475"},
    {"symbol": "BPCL", "name": "Bharat Petroleum Corp", "sector": "Energy", "dhan_id": "526"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "sector": "Infra", "dhan_id": "25"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports & SEZ", "sector": "Infra", "dhan_id": "15083"},
    
    # Pharma & Healthcare
    {"symbol": "SUNPHARMA", "name": "Sun Pharma Industries", "sector": "Pharma", "dhan_id": "3351"},
    {"symbol": "DRREDDY", "name": "Dr Reddy's Laboratories", "sector": "Pharma", "dhan_id": "881"},
    {"symbol": "CIPLA", "name": "Cipla Ltd", "sector": "Pharma", "dhan_id": "694"},
    {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals Ltd", "sector": "Pharma", "dhan_id": "157"},
    
    # FMCG & Consumer
    {"symbol": "ITC", "name": "ITC Ltd", "sector": "FMCG", "dhan_id": "1660"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "sector": "FMCG", "dhan_id": "1394"},
    {"symbol": "TITAN", "name": "Titan Company Ltd", "sector": "Consumer", "dhan_id": "3506"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "sector": "Consumer", "dhan_id": "236"},
    {"symbol": "NESTLEIND", "name": "Nestle India Ltd", "sector": "FMCG", "dhan_id": "17963"},
    
    # Telecom & Infra
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "Telecom", "dhan_id": "10604"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd", "sector": "Infra", "dhan_id": "11483"},
]

SYMBOL_MAP = {item["symbol"]: item for item in NSE_FO_UNIVERSE}

def to_yahoo_ticker(symbol: str) -> str:
    """Converts plain NSE symbol into Yahoo Finance .NS ticker format."""
    clean = symbol.strip().upper()
    if clean.endswith(".NS") or clean.endswith(".BO"):
        return clean
    if clean == "NIFTY":
        return "^NSEI"
    if clean == "BANKNIFTY":
        return "^NSEBANK"
    return f"{clean}.NS"

def to_dhan_security_id(symbol: str) -> Optional[str]:
    """Retrieves Dhan Security ID for a symbol."""
    clean = symbol.replace(".NS", "").strip().upper()
    entry = SYMBOL_MAP.get(clean)
    return entry["dhan_id"] if entry else None

def get_universe(sector: Optional[str] = None) -> List[Dict]:
    """Returns the list of stocks, optionally filtered by sector."""
    if not sector or sector == "ALL":
        return NSE_FO_UNIVERSE
    return [s for s in NSE_FO_UNIVERSE if s["sector"].upper() == sector.upper()]

def get_sectors() -> List[str]:
    """Returns list of distinct sectors."""
    sectors = sorted(list(set(s["sector"] for s in NSE_FO_UNIVERSE)))
    return ["ALL"] + sectors

