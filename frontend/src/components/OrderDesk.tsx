import React, { useState, useEffect } from 'react';
import { TradePlan, RiskChecklistResult, DhanStatus } from '../types';
import { ShieldCheck, AlertTriangle, Zap, CheckCircle2, XCircle, RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface OrderDeskProps {
  tradePlan: TradePlan | null;
  riskCheck: RiskChecklistResult | null;
  maxRiskInr: number;
  onChangeMaxRisk: (val: number) => void;
  isPaper: boolean;
  dhanStatus: DhanStatus | null;
  side: 'BUY' | 'SELL';
  onChangeSide: (s: 'BUY' | 'SELL') => void;
  onExecuteOrder: (shares: number, price: number, stop: number, target: number, side: 'BUY' | 'SELL') => void;
  isLoading: boolean;
}

export const OrderDesk: React.FC<OrderDeskProps> = ({
  tradePlan,
  riskCheck,
  maxRiskInr,
  onChangeMaxRisk,
  isPaper,
  dhanStatus,
  side,
  onChangeSide,
  onExecuteOrder,
  isLoading,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [manualQty, setManualQty] = useState<string>('');
  const [editableStop, setEditableStop] = useState<string>('');
  const [editableTarget, setEditableTarget] = useState<string>('');

  // Sync with tradePlan defaults whenever stock or plan changes
  useEffect(() => {
    if (tradePlan) {
      setEditableStop(tradePlan.stop_price.toString());
      setEditableTarget(tradePlan.target_price.toString());
      setManualQty('');
    }
  }, [tradePlan?.symbol, tradePlan?.entry_price, tradePlan?.side]);

  if (!tradePlan) {
    return (
      <div className="h-full bg-[#121722] p-4 flex flex-col items-center justify-center text-center select-none text-slate-500 text-xs">
        Select a stock to open the Execution Desk.
      </div>
    );
  }

  const currentStop = parseFloat(editableStop) || tradePlan.stop_price;
  const currentTarget = parseFloat(editableTarget) || tradePlan.target_price;
  const entryPrice = tradePlan.entry_price;

  // Sizing
  const riskPerShare = Math.max(0.1, Math.abs(entryPrice - currentStop));
  const autoShares = Math.max(1, Math.floor(maxRiskInr / riskPerShare));
  const activeShares = manualQty.trim() ? Math.max(1, parseInt(manualQty) || 1) : autoShares;

  const orderValue = activeShares * entryPrice;
  const marginRequired = Math.round(orderValue / 5); // 5x MIS leverage
  const actualRiskInr = roundTo2(activeShares * riskPerShare);

  const rewardPerShare = Math.max(0.01, Math.abs(currentTarget - entryPrice));
  const customRR = (rewardPerShare / riskPerShare).toFixed(2);

  function roundTo2(num: number) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  const canExecute = riskCheck?.passed ?? false;

  const handleResetDefaults = () => {
    setEditableStop(tradePlan.stop_price.toString());
    setEditableTarget(tradePlan.target_price.toString());
    setManualQty('');
    onChangeSide('BUY');
  };

  return (
    <div className="h-full bg-[#121722] flex flex-col border-l border-[#242e42] select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-[#242e42] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white uppercase tracking-wider">Order Desk</span>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isPaper
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isPaper ? 'PAPER EXECUTION' : 'LIVE DHAN'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Long / Short Action Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#101520] rounded-lg border border-[#242e42]">
          <button
            onClick={() => onChangeSide('BUY')}
            className={`py-1.5 rounded flex items-center justify-center space-x-1.5 font-bold transition cursor-pointer text-xs ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>BUY (LONG)</span>
          </button>
          <button
            onClick={() => onChangeSide('SELL')}
            className={`py-1.5 rounded flex items-center justify-center space-x-1.5 font-bold transition cursor-pointer text-xs ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>SELL (SHORT)</span>
          </button>
        </div>

        {/* Risk Budget Slider */}
        <div className="bg-[#1a2232] p-2.5 rounded-lg border border-[#242e42]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400 font-medium">Risk Budget / Trade</span>
            <span className="font-mono font-bold text-white text-xs">₹{maxRiskInr.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min="200"
            max="10000"
            step="100"
            value={maxRiskInr}
            onChange={(e) => onChangeMaxRisk(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#0f131a] rounded-lg"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>₹200</span>
            <span>₹5,000</span>
            <span>₹10,000</span>
          </div>
        </div>

        {/* Calculated Sizing & Custom Quantity */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded bg-[#1a2232] border border-[#242e42]">
            <div className="text-[10px] text-slate-400">Order Quantity</div>
            <div className="flex items-center justify-center space-x-1 mt-0.5">
              <input
                type="number"
                placeholder={autoShares.toString()}
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                className="w-16 bg-[#101520] border border-[#242e42] rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-400 font-mono">Qty</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Val: ₹{orderValue.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-2 rounded bg-[#1a2232] border border-[#242e42]">
            <div className="text-[10px] text-slate-400">MIS Margin (5x)</div>
            <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
              ₹{marginRequired.toLocaleString('en-IN')}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Risk: <span className="text-amber-400 font-mono">₹{actualRiskInr}</span>
            </div>
          </div>
        </div>

        {/* Editable Bracket Levels (Entry, SL, Target) */}
        <div className="bg-[#1a2232] p-2.5 rounded border border-[#242e42] space-y-2">
          <div className="flex items-center justify-between border-b border-[#242e42] pb-1">
            <span className="text-[10px] uppercase font-bold text-slate-300">Bracket Order Levels</span>
            <button
              onClick={handleResetDefaults}
              className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Reset to Setup</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Entry Limit Price:</span>
            <span className="font-mono font-bold text-white">₹{entryPrice}</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-400 font-medium">Stop Loss Price:</span>
            <input
              type="number"
              step="0.05"
              value={editableStop}
              onChange={(e) => setEditableStop(e.target.value)}
              className="w-24 bg-[#101520] border border-rose-500/40 rounded px-2 py-0.5 text-right font-mono font-bold text-rose-400 text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-medium">Take Profit Target:</span>
            <input
              type="number"
              step="0.05"
              value={editableTarget}
              onChange={(e) => setEditableTarget(e.target.value)}
              className="w-24 bg-[#101520] border border-emerald-500/40 rounded px-2 py-0.5 text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-between border-t border-[#242e42] pt-1.5 text-[11px]">
            <span className="text-slate-400">Calculated R:R Ratio:</span>
            <span className="font-mono font-bold text-blue-400">{customRR}:1</span>
          </div>
        </div>

        {/* Pre-Flight Risk Checklist */}
        {riskCheck && (
          <div className="bg-[#1a2232] p-2.5 rounded border border-[#242e42]">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Risk Gatekeeper Checklist</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  riskCheck.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {riskCheck.passed ? 'ALL PASSED' : 'BLOCKED'}
              </span>
            </div>
            <div className="space-y-1.5">
              {riskCheck.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-1.5 text-[11px]">
                  {item.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="text-slate-200">{item.title}</span>
                    <p className="text-[10px] text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statutory Charges Breakdown */}
        {riskCheck?.charges_breakdown && (
          <div className="bg-[#101520] p-2 rounded border border-[#242e42] space-y-1 text-[11px]">
            <div className="text-[10px] text-slate-400 font-semibold mb-1">Estimated Indian Taxes & Charges:</div>
            <div className="flex justify-between text-slate-400">
              <span>Brokerage (Dhan flat ₹20/leg):</span>
              <span className="font-mono text-slate-300">₹{riskCheck.charges_breakdown.brokerage}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>STT (0.025% on sell):</span>
              <span className="font-mono text-slate-300">₹{riskCheck.charges_breakdown.stt}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Exchange + GST + Stamp Duty:</span>
              <span className="font-mono text-slate-300">
                ₹{roundTo2(riskCheck.charges_breakdown.exchange_charges + riskCheck.charges_breakdown.gst + riskCheck.charges_breakdown.stamp_duty)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#242e42] pt-1 font-bold">
              <span className="text-slate-300">Total Statutory Friction:</span>
              <span className="font-mono text-amber-400">₹{riskCheck.charges_breakdown.total_charges}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="p-3 border-t border-[#242e42] bg-[#121722]">
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={!canExecute || isLoading}
          className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer ${
            canExecute
              ? side === 'BUY'
                ? isPaper
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {canExecute
            ? isPaper
              ? `Execute Paper ${side} (${activeShares} Qty)`
              : `Submit Dhan ${side} (${activeShares} Qty)`
            : 'Order Blocked by Risk Gatekeeper'}
        </button>
      </div>

      {/* Explicit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161d2a] border border-[#242e42] rounded-xl max-w-sm w-full p-4 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Confirm {isPaper ? 'Paper' : 'Live Dhan'} Order</span>
            </div>

            <div className="bg-[#101520] p-3 rounded-lg border border-[#242e42] space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">Stock & Action:</span>
                <span className={`font-bold ${side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {side} {activeShares} shares of {tradePlan.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order Type:</span>
                <span className="text-white">INTRADAY (MIS) Bracket</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Limit Entry Price:</span>
                <span className="font-mono font-bold text-white">₹{entryPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400 font-medium">Stop Loss Price:</span>
                <span className="font-mono font-bold text-rose-400">₹{currentStop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400 font-medium">Take Profit Target:</span>
                <span className="font-mono font-bold text-emerald-400">₹{currentTarget}</span>
              </div>
              <div className="flex justify-between border-t border-[#242e42] pt-1">
                <span className="text-slate-400">Auto-Squareoff:</span>
                <span className="text-amber-400 font-bold">15:15 IST (Hard Exit)</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  onExecuteOrder(activeShares, entryPrice, currentStop, currentTarget, side);
                }}
                className={`flex-1 py-2 rounded text-white text-xs font-bold transition cursor-pointer ${
                  side === 'BUY'
                    ? isPaper ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
