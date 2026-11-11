export interface MarketStatus {
  status: string;
  message: string;
  is_trading_day: boolean;
  holiday: string | null;
  current_time_ist: string;
  seconds_to_squareoff: number;
}

export interface StockEntry {
  symbol: string;
  name: string;
  sector: string;
  dhan_id: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OpeningRange {
  symbol: string;
  date: string;
  or_high: number;
  or_low: number;
  or_mid: number;
  or_range_points: number;
  or_volume: number;
  current_price: number;
  status: "WAITING" | "TRIGGERED" | "FORMING";
  breakout_price: number | null;
  breakout_time: string | null;
  bars_count: number;
}

export interface ScannerResult {
  symbol: string;
  name: string;
  sector: string;
  dhan_id: string;
  current_price: number;
  prev_close: number;
  pct_change: number;
  volume: number;
  orb_high: number | null;
  orb_low: number | null;
  orb_triggered: boolean;
  setups: string[];
  has_setup: boolean;
  rsi: number;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C';
  reasons: string[];
}

export interface TradePlan {
  symbol: string;
  side?: 'BUY' | 'SELL';
  entry_price: number;
  stop_price: number;
  target_price: number;
  risk_per_share: number;
  reward_per_share: number;
  target_r: number;
  reward_risk_ratio: number;
  orb_high: number | null;
  orb_low: number | null;
  orb_mid: number | null;
  square_off_time: string;
  valid: boolean;
}

export interface TimeMachineSimulation {
  symbol: string;
  replays: number;
  entry_price: number;
  stop_price: number;
  target_price: number;
  target_r: number;
  probabilities: {
    target_first_pct: number;
    stop_first_pct: number;
    neither_pct: number;
  };
  expected_value_r: number;
  expected_value_inr: number;
  verdict: string;
  verdict_badge: string;
  fan_chart: {
    step: number;
    p5: number;
    p25: number;
    median: number;
    p75: number;
    p95: number;
  }[];
  histogram: {
    range: string;
    count: number;
  }[];
}

export interface RiskChecklistResult {
  symbol: string;
  passed: boolean;
  verdict: string;
  checklist: {
    title: string;
    passed: boolean;
    detail: string;
  }[];
  actual_trade_risk_inr: number;
  projected_daily_risk_inr: number;
  charges_breakdown: {
    buy_turnover: number;
    sell_turnover: number;
    total_turnover: number;
    gross_pnl: number;
    brokerage: number;
    stt: number;
    exchange_charges: number;
    sebi_charges: number;
    gst: number;
    stamp_duty: number;
    total_charges: number;
    net_pnl: number;
    breakeven_points: number;
  };
  net_profit_at_target_inr: number;
}

export interface DhanStatus {
  connected: boolean;
  status: string;
  message: string;
  available_margin_inr: number;
  public_ip?: string;
}

export interface Position {
  id?: number;
  position_id: string;
  symbol: string;
  side?: 'BUY' | 'SELL' | string;
  quantity: number;
  buy_price: number;
  current_price: number;
  exit_price?: number | null;
  stop_loss: number;
  take_profit: number;
  unrealized_pnl_inr: number;
  realized_pnl_inr?: number;
  total_charges_inr?: number;
  net_pnl_inr?: number;
  pnl_pct: number;
  opened_at: string;
  closed_at?: string | null;
  status: string;
  exit_reason?: string | null;
  is_paper: boolean | number;
  charges_breakdown?: any;
}

