import React, { useState, useEffect } from 'react';
import { Position } from '../types';
import { AlertTriangle, BookOpen, Clock, CheckCircle2, History, Database, Download, Eye, LogOut } from 'lucide-react';
import { OrderDetailsModal } from './OrderDetailsModal';

interface PositionsTableProps {
  positions: Position[];
  onFlattenAll: () => void;
  secondsToSquareoff: number;
  onExitPosition?: (positionId: string) => Promise<void>;
  onSelectSymbol?: (symbol: string) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  onFlattenAll,
  secondsToSquareoff,
  onExitPosition,
  onSelectSymbol,
}) => {
  const [subTab, setSubTab] = useState<'active' | 'history'>('active');
  const [history, setHistory] = useState<Position[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedPositionForDetails, setSelectedPositionForDetails] = useState<Position | null>(null);

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/dhan/history').then((r) => r.json());
      if (res.history) setHistory(res.history);
    } catch (err) {
      console.error('Error fetching trade history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'history') {
      fetchHistory();
    }
  }, [subTab]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.unrealized_pnl_inr || 0), 0);
  
  // History calculations
  const totalNetRealizedPnl = history.reduce((acc, h) => acc + (h.net_pnl_inr || 0), 0);
  const totalChargesPaid = history.reduce((acc, h) => acc + (h.total_charges_inr || 0), 0);
  const winCount = history.filter((h) => (h.net_pnl_inr || 0) > 0).length;
  const winRate = history.length > 0 ? Math.round((winCount / history.length) * 100) : 0;

  const exportToCsv = () => {
    if (history.length === 0) return;
    const headers = [
      'Trade ID',
      'Symbol',
      'Side',
      'Mode',
      'Quantity',
      'Entry Price (INR)',
      'Exit Price (INR)',
      'Gross PnL (INR)',
      'Taxes and Charges (INR)',
      'Net Realized PnL (INR)',
      'Exit Reason',
      'Opened At',
      'Closed At',
    ];
    const rows = history.map((h) => [
      h.position_id || h.id,
      h.symbol,
      h.side || 'BUY',
      h.is_paper ? 'PAPER' : 'LIVE',
      h.quantity,
      h.buy_price,
      h.exit_price || h.current_price,
      (h.realized_pnl_inr || 0).toFixed(2),
      (h.total_charges_inr || 0).toFixed(2),
      (h.net_pnl_inr || 0).toFixed(2),
      h.exit_reason || 'CLOSED',
      `"${h.opened_at}"`,
      `"${h.closed_at || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nse_day_trader_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full bg-[#121722] p-3 flex flex-col border-t border-[#242e42] select-none text-xs">
      {/* Header bar with Subtabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#242e42]">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSubTab('active')}
            className={`font-bold uppercase tracking-wider px-2 py-1 rounded transition cursor-pointer text-xs ${
              subTab === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Active Positions ({positions.length})
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`font-bold uppercase tracking-wider px-2 py-1 rounded transition flex items-center space-x-1.5 cursor-pointer text-xs ${
              subTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQLite Journal ({history.length || '•'})</span>
          </button>

          {subTab === 'active' && positions.length > 0 && (
            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                totalUnrealizedPnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              MTM: {totalUnrealizedPnl >= 0 ? '+' : ''}₹{totalUnrealizedPnl.toFixed(2)}
            </span>
          )}

          {subTab === 'history' && history.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded ${
                  totalNetRealizedPnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                Net: {totalNetRealizedPnl >= 0 ? '+' : ''}₹{totalNetRealizedPnl.toFixed(2)}
              </span>
              <span className="text-slate-400 font-mono">
                Taxes: <span className="text-amber-400 font-bold">₹{totalChargesPaid.toFixed(2)}</span>
              </span>
              <span className="text-slate-400 font-mono">
                Win Rate: <span className="text-blue-400 font-bold">{winRate}%</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {subTab === 'history' && history.length > 0 && (
            <button
              onClick={exportToCsv}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition flex items-center space-x-1 cursor-pointer shadow-sm"
              title="Download CA Tax Ready CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Tax CSV</span>
            </button>
          )}

          {subTab === 'history' && (
            <button
              onClick={fetchHistory}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition cursor-pointer"
            >
              Refresh
            </button>
          )}

          {secondsToSquareoff > 0 && subTab === 'active' && (
            <div className="text-[11px] text-amber-400 font-mono font-semibold flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Auto-Squareoff in {formatTime(secondsToSquareoff)}</span>
            </div>
          )}
          {positions.length > 0 && subTab === 'active' && (
            <button
              onClick={onFlattenAll}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition cursor-pointer shadow-sm"
            >
              Flatten All
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto mt-2">
        {subTab === 'active' ? (
          positions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[11px] space-y-1">
              <div>No active open day-trade positions.</div>
              <div className="text-[10px] text-slate-600 text-center max-w-sm">
                Execute a trade from the Order Desk or tap any closed trade in the SQLite Journal tab above to inspect order parameters.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[780px]">
                <thead>
                  <tr className="text-slate-500 text-[10px] border-b border-[#242e42]">
                    <th className="pb-1">SYMBOL</th>
                    <th className="pb-1">SIDE</th>
                    <th className="pb-1">MODE</th>
                    <th className="pb-1">QTY</th>
                    <th className="pb-1">ENTRY PRICE</th>
                    <th className="pb-1">LTP</th>
                    <th className="pb-1">STOP LOSS</th>
                    <th className="pb-1">TARGET</th>
                    <th className="pb-1">OPENED AT</th>
                    <th className="pb-1 text-right">UNREALIZED P&L</th>
                    <th className="pb-1 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2738]">
                  {positions.map((pos) => {
                    const isProfit = (pos.unrealized_pnl_inr || 0) >= 0;
                    const isSell = (pos.side || 'BUY').toUpperCase() === 'SELL';
                    return (
                      <tr
                        key={pos.position_id}
                        onClick={() => setSelectedPositionForDetails(pos)}
                        className="text-[11px] hover:bg-[#1a2232] transition cursor-pointer group"
                      >
                        <td className="py-2 font-bold text-white group-hover:text-blue-400 transition">
                          {pos.symbol}
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isSell ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isSell ? 'SELL (SHORT)' : 'BUY (LONG)'}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              pos.is_paper ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {pos.is_paper ? 'PAPER' : 'LIVE'}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-slate-300">{pos.quantity}</td>
                        <td className="py-2 font-mono text-slate-300">₹{pos.buy_price}</td>
                        <td className="py-2 font-mono text-white font-bold">₹{pos.current_price}</td>
                        <td className="py-2 font-mono text-rose-400">₹{pos.stop_loss || '-'}</td>
                        <td className="py-2 font-mono text-emerald-400">₹{pos.take_profit || '-'}</td>
                        <td className="py-2 font-mono text-slate-400 text-[10px]">{pos.opened_at}</td>
                        <td
                          className={`py-2 font-mono font-bold text-right ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}₹{(pos.unrealized_pnl_inr || 0).toFixed(2)} ({isProfit ? '+' : ''}
                          {pos.pnl_pct || 0}%)
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPositionForDetails(pos);
                              }}
                              className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-semibold transition cursor-pointer"
                              title="View full order & tax details"
                            >
                              Details
                            </button>
                            {onExitPosition && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExitPosition(pos.position_id || String(pos.id));
                                }}
                                className="px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold transition cursor-pointer"
                                title="Exit this position now"
                              >
                                Exit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Database Trade Journal / History */
          isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-[11px]">
              Loading database trade history...
            </div>
          ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[11px] space-y-1">
              <div>No closed trades saved in SQLite database yet.</div>
              <div className="text-[10px] text-slate-600">
                When positions are squared off or flattened, they are automatically archived here with exact Indian statutory taxes (STT, GST, Stamp Duty).
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[780px]">
                <thead>
                  <tr className="text-slate-500 text-[10px] border-b border-[#242e42]">
                    <th className="pb-1">ID</th>
                    <th className="pb-1">SYMBOL</th>
                    <th className="pb-1">SIDE</th>
                    <th className="pb-1">QTY</th>
                    <th className="pb-1">ENTRY PRICE</th>
                    <th className="pb-1">EXIT PRICE</th>
                    <th className="pb-1">GROSS P&L</th>
                    <th className="pb-1">TAXES & CHARGES</th>
                    <th className="pb-1">NET P&L (₹)</th>
                    <th className="pb-1">EXIT REASON</th>
                    <th className="pb-1 text-right">CLOSED AT</th>
                    <th className="pb-1 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2738]">
                  {history.map((h) => {
                    const netProfit = (h.net_pnl_inr || 0) >= 0;
                    const isSell = (h.side || 'BUY').toUpperCase() === 'SELL';
                    return (
                      <tr
                        key={h.position_id || h.id}
                        onClick={() => setSelectedPositionForDetails(h)}
                        className="text-[11px] hover:bg-[#1a2232] transition cursor-pointer group"
                      >
                        <td className="py-2 font-mono text-slate-500 text-[10px]">#{h.id || h.position_id}</td>
                        <td className="py-2 font-bold text-white flex items-center space-x-1.5 group-hover:text-blue-400 transition">
                          <span>{h.symbol}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                              h.is_paper ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {h.is_paper ? 'P' : 'L'}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                              isSell ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isSell ? 'SELL' : 'BUY'}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-slate-300">{h.quantity}</td>
                        <td className="py-2 font-mono text-slate-300">₹{h.buy_price}</td>
                        <td className="py-2 font-mono text-white font-bold">₹{h.exit_price || h.current_price}</td>
                        <td
                          className={`py-2 font-mono font-semibold ${
                            (h.realized_pnl_inr || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {(h.realized_pnl_inr || 0) >= 0 ? '+' : ''}₹{(h.realized_pnl_inr || 0).toFixed(2)}
                        </td>
                        <td className="py-2 font-mono text-amber-400 text-[10px]">
                          -₹{(h.total_charges_inr || 0).toFixed(2)}
                        </td>
                        <td
                          className={`py-2 font-mono font-bold ${
                            netProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {netProfit ? '+' : ''}₹{(h.net_pnl_inr || 0).toFixed(2)}
                        </td>
                        <td className="py-2">
                          <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            {h.exit_reason || 'CLOSED'}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-slate-400 text-[10px] text-right">
                          {h.closed_at || h.opened_at}
                        </td>
                        <td className="py-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPositionForDetails(h);
                            }}
                            className="px-2 py-0.5 rounded bg-[#101520] hover:bg-blue-600 text-slate-300 hover:text-white border border-[#242e42] text-[10px] font-semibold transition cursor-pointer"
                            title="View trade breakdown"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Order Details & Position Exit Modal */}
      <OrderDetailsModal
        isOpen={!!selectedPositionForDetails}
        onClose={() => setSelectedPositionForDetails(null)}
        position={selectedPositionForDetails}
        onExitPosition={onExitPosition}
        onSelectSymbol={onSelectSymbol}
      />
    </div>
  );
};
