import React, { useState } from 'react';
import { Position } from '../types';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldAlert,
  RotateCw,
  LogOut,
  ExternalLink,
} from 'lucide-react';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: Position | null;
  onExitPosition?: (positionId: string) => Promise<void>;
  onSelectSymbol?: (symbol: string) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  position,
  onExitPosition,
  onSelectSymbol,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  if (!isOpen || !position) return null;

  const isClosed = position.status === 'CLOSED';
  const isSell = (position.side || 'BUY').toUpperCase() === 'SELL';
  const qty = position.quantity || 1;
  const entryPrice = position.buy_price || 0;
  const exitPrice = position.exit_price || position.current_price || entryPrice;
  const entryValue = Math.round(entryPrice * qty * 100) / 100;
  const currentValue = Math.round(exitPrice * qty * 100) / 100;

  // Gross P&L
  const grossPnl = isClosed
    ? (position.realized_pnl_inr ?? (isSell ? (entryPrice - exitPrice) * qty : (exitPrice - entryPrice) * qty))
    : (position.unrealized_pnl_inr ?? (isSell ? (entryPrice - exitPrice) * qty : (exitPrice - entryPrice) * qty));
  const isProfitable = grossPnl >= 0;

  // Indian statutory charges breakdown
  const buyTurnover = isSell ? currentValue : entryValue;
  const sellTurnover = isSell ? entryValue : currentValue;
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = position.charges_breakdown?.brokerage ?? Math.min(40.0, totalTurnover * 0.0003);
  const stt = position.charges_breakdown?.stt ?? Math.round(sellTurnover * 0.00025 * 100) / 100;
  const exchange = position.charges_breakdown?.exchange_charges ?? Math.round(totalTurnover * 0.0000345 * 100) / 100;
  const sebi = position.charges_breakdown?.sebi_charges ?? Math.round(totalTurnover * 0.000001 * 100) / 100;
  const gst = position.charges_breakdown?.gst ?? Math.round((brokerage + exchange + sebi) * 0.18 * 100) / 100;
  const stampDuty = position.charges_breakdown?.stamp_duty ?? Math.round(buyTurnover * 0.00003 * 100) / 100;
  const totalCharges = position.total_charges_inr ?? (position.charges_breakdown?.total_charges ?? Math.round((brokerage + stt + exchange + sebi + gst + stampDuty) * 100) / 100);
  const netPnl = position.net_pnl_inr ?? Math.round((grossPnl - totalCharges) * 100) / 100;

  const handleConfirmExit = async () => {
    if (!onExitPosition) return;
    setIsExiting(true);
    try {
      await onExitPosition(position.position_id || String(position.id));
      setShowExitConfirm(false);
      onClose();
    } finally {
      setIsExiting(false);
    }
  };

  const handleInspectChart = () => {
    if (onSelectSymbol) {
      onSelectSymbol(position.symbol);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 select-none animate-in fade-in duration-150">
      <div className="bg-[#121722] border border-[#242e42] rounded-xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#242e42] flex items-center justify-between bg-[#161d2a] shrink-0">
          <div className="flex items-center space-x-2.5">
            {isSell ? (
              <ArrowDownCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <ArrowUpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-white">{position.symbol}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSell ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isSell ? 'SELL (SHORT)' : 'BUY (LONG)'}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    position.is_paper ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {position.is_paper ? 'PAPER' : 'LIVE'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Trade #{position.id || position.position_id} • {isClosed ? 'Closed Position' : 'Active Open Intraday Position'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-xs">
          {/* Main Profit / Loss Hero Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isProfitable
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium opacity-80 uppercase tracking-wider">
                {isClosed ? 'Net Realized P&L' : 'Unrealized MTM P&L'}
              </span>
              <div className="text-2xl font-black font-mono mt-0.5">
                {isProfitable ? '+' : ''}₹{(isClosed ? netPnl : grossPnl).toFixed(2)}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Gross P&L: <span className="font-mono font-bold">{grossPnl >= 0 ? '+' : ''}₹{grossPnl.toFixed(2)}</span>
                {isClosed && (
                  <span className="ml-2">
                    • Taxes: <span className="font-mono text-amber-400">-₹{totalCharges.toFixed(2)}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isClosed
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                }`}
              >
                {!isClosed && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                <span>{isClosed ? (position.exit_reason || 'CLOSED') : 'LIVE ACTIVE'}</span>
              </span>
            </div>
          </div>

          {/* Pricing & Order Execution Grid */}
          <div className="bg-[#1a2232] rounded-xl border border-[#242e42] p-3 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Order Execution Parameters</span>
              <span className="font-mono text-blue-400 font-semibold">{qty} Shares</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-[#101520] border border-[#242e42]">
                <div className="text-slate-400 text-[10px]">Entry Price</div>
                <div className="font-mono font-bold text-white text-xs mt-0.5">₹{entryPrice.toFixed(2)}</div>
                <div className="text-slate-500 text-[9px]">Val: ₹{entryValue.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-2 rounded bg-[#101520] border border-[#242e42]">
                <div className="text-slate-400 text-[10px]">{isClosed ? 'Exit Price' : 'Last Traded Price (LTP)'}</div>
                <div className="font-mono font-bold text-white text-xs mt-0.5">₹{exitPrice.toFixed(2)}</div>
                <div className="text-slate-500 text-[9px]">Val: ₹{currentValue.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-[#101520] border border-[#242e42]">
                <div className="text-rose-400 text-[10px] font-medium">Stop Loss Level</div>
                <div className="font-mono font-bold text-rose-400 text-xs mt-0.5">
                  {position.stop_loss ? `₹${Number(position.stop_loss).toFixed(2)}` : 'None'}
                </div>
              </div>
              <div className="p-2 rounded bg-[#101520] border border-[#242e42]">
                <div className="text-emerald-400 text-[10px] font-medium">Take Profit Target</div>
                <div className="font-mono font-bold text-emerald-400 text-xs mt-0.5">
                  {position.take_profit ? `₹${Number(position.take_profit).toFixed(2)}` : 'None'}
                </div>
              </div>
            </div>

            <div className="border-t border-[#242e42] pt-2 space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Opened At:</span>
                <span className="font-mono">{position.opened_at}</span>
              </div>
              {position.closed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Closed At:</span>
                  <span className="font-mono">{position.closed_at}</span>
                </div>
              )}
              {position.exit_reason && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Exit Trigger:</span>
                  <span className="font-mono font-bold text-amber-400">{position.exit_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Accurate Statutory Friction Breakdown (Indian Markets) */}
          <div className="bg-[#1a2232] rounded-xl border border-[#242e42] p-3 space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              <span>Statutory Taxes & Brokerage Breakdown</span>
            </div>

            <div className="divide-y divide-[#242e42] text-[11px]">
              <div className="py-1 flex justify-between text-slate-300">
                <span className="text-slate-400">Brokerage (Flat / 0.03%):</span>
                <span className="font-mono">₹{brokerage.toFixed(2)}</span>
              </div>
              <div className="py-1 flex justify-between text-slate-300">
                <span className="text-slate-400">Securities Transaction Tax (STT 0.025%):</span>
                <span className="font-mono">₹{stt.toFixed(2)}</span>
              </div>
              <div className="py-1 flex justify-between text-slate-300">
                <span className="text-slate-400">NSE Exchange Turnover Charge (0.00345%):</span>
                <span className="font-mono">₹{exchange.toFixed(2)}</span>
              </div>
              <div className="py-1 flex justify-between text-slate-300">
                <span className="text-slate-400">GST (18% on Brokerage & Exchange):</span>
                <span className="font-mono">₹{gst.toFixed(2)}</span>
              </div>
              <div className="py-1 flex justify-between text-slate-300">
                <span className="text-slate-400">SEBI Turnover Fee + Stamp Duty:</span>
                <span className="font-mono">₹{(sebi + stampDuty).toFixed(2)}</span>
              </div>
              <div className="pt-1.5 flex justify-between font-bold text-xs">
                <span className="text-white">Total Government & Broker Charges:</span>
                <span className="font-mono text-amber-400">₹{totalCharges.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#242e42] bg-[#161d2a] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleInspectChart}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-[#20293a] hover:bg-[#28354c] text-slate-200 border border-[#324058] text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Open {position.symbol} Chart</span>
          </button>

          {!isClosed && onExitPosition && (
            <>
              {showExitConfirm ? (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    disabled={isExiting}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                  >
                    {isExiting ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5" />
                    )}
                    <span>{isExiting ? 'Exiting...' : 'Confirm Market Exit'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Position Now</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

