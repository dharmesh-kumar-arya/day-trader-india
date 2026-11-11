import React from 'react';
import { TimeMachineSimulation } from '../types';
import { Play, TrendingUp, AlertTriangle, CheckCircle2, HelpCircle, RotateCw } from 'lucide-react';

interface TimeMachineLabProps {
  symbol?: string;
  simulation: TimeMachineSimulation | null;
  onRunSimulation: () => void;
  isLoading: boolean;
}

export const TimeMachineLab: React.FC<TimeMachineLabProps> = ({
  symbol,
  simulation,
  onRunSimulation,
  isLoading,
}) => {
  if (!simulation) {
    return (
      <div className="h-full bg-[#121722] p-4 flex flex-col items-center justify-center text-center select-none border-t border-[#242e42]">
        <TrendingUp className="w-8 h-8 text-blue-400 mb-2 opacity-80" />
        <h4 className="text-xs font-bold text-slate-200">
          75-Bar Time Machine Simulator {symbol ? `for ${symbol}` : ''}
        </h4>
        <p className="text-[11px] text-slate-400 max-w-xs mt-1 mb-3">
          Replay 10,000 runs using 60 days of NSE 5-minute bars before putting real capital at risk.
        </p>
        <button
          onClick={onRunSimulation}
          disabled={isLoading}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isLoading ? 'Replaying 10,000 Runs...' : `Simulate ${symbol || 'Trade'} (Monte Carlo)`}</span>
        </button>
      </div>
    );
  }

  const { probabilities, expected_value_r, expected_value_inr, verdict, verdict_badge, histogram } = simulation;

  const isFavorable = verdict_badge === 'CLEAR_LEAN' || verdict_badge === 'STRONG_LEAN';
  const isStopLean = verdict_badge === 'LEANS_STOP';

  // SVG Fan Chart parameters
  const fanWidth = 320;
  const fanHeight = 120;
  const maxP = Math.max(...simulation.fan_chart.map((s) => s.p95));
  const minP = Math.min(...simulation.fan_chart.map((s) => s.p5));
  const rangeP = maxP - minP || 1;

  const getPoints = (key: 'p5' | 'p25' | 'median' | 'p75' | 'p95') => {
    return simulation.fan_chart
      .map((item, idx) => {
        const x = (idx / (simulation.fan_chart.length - 1)) * fanWidth;
        const y = fanHeight - ((item[key] - minP) / rangeP) * (fanHeight - 20) - 10;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="flex-1 min-h-0 bg-[#121722] p-2.5 sm:p-4 flex flex-col select-none overflow-y-auto overflow-x-hidden pb-8">
      {/* Header & Verdict */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-2 border-b border-[#242e42] min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-xs font-bold text-white uppercase tracking-wider shrink-0">Time Machine</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/40 shrink-0">
            {simulation.symbol}
          </span>
          <span className="text-[10px] text-slate-400 bg-[#1a2232] px-1.5 py-0.5 rounded border border-[#242e42] shrink-0">
            10,000 Replays
          </span>
          <button
            onClick={onRunSimulation}
            disabled={isLoading}
            className="flex items-center space-x-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded text-[10px] sm:text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer shrink-0"
            title="Re-run 10,000 Monte Carlo replays with fresh draws"
          >
            <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Replaying...' : 'Re-run Simulation'}</span>
          </button>
        </div>

        {/* Verdict Badge */}
        <div
          className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[11px] sm:text-xs font-bold border flex items-center space-x-1.5 shrink-0 ${
            isFavorable
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isStopLean
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}
        >
          {isFavorable ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className="truncate">{verdict}</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5 shrink-0">
        <div className="p-2 rounded bg-[#1a2232] border border-[#242e42] text-center">
          <div className="text-[10px] text-slate-400 font-medium">Target First (Win)</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">{probabilities.target_first_pct}%</div>
        </div>
        <div className="p-2 rounded bg-[#1a2232] border border-[#242e42] text-center">
          <div className="text-[10px] text-slate-400 font-medium">Stop First (Loss)</div>
          <div className="text-base font-bold text-rose-400 mt-0.5">{probabilities.stop_first_pct}%</div>
        </div>
        <div className="p-2 rounded bg-[#1a2232] border border-[#242e42] text-center">
          <div className="text-[10px] text-slate-400 font-medium">Open @ 3:15 PM</div>
          <div className="text-base font-bold text-slate-300 mt-0.5">{probabilities.neither_pct}%</div>
        </div>
        <div className="p-2 rounded bg-[#1a2232] border border-[#242e42] text-center">
          <div className="text-[10px] text-slate-400 font-medium">Expected Value</div>
          <div className={`text-base font-bold mt-0.5 ${expected_value_r >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {expected_value_r >= 0 ? '+' : ''}
            {expected_value_r}R
          </div>
        </div>
      </div>

      {/* Fan Chart & Outcome Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
        {/* Fan Chart Projection */}
        <div className="p-2 sm:p-2.5 rounded bg-[#1a2232] border border-[#242e42] flex flex-col min-w-0 overflow-hidden">
          <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
            <span>Fan Chart Percentiles (p5 - p95)</span>
            <span className="text-[9px] text-slate-500">From Entry @ ₹{simulation.entry_price}</span>
          </div>
          <div className="h-28 sm:h-32 w-full flex items-center justify-center overflow-hidden">
            <svg viewBox={`0 0 ${fanWidth} ${fanHeight}`} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
              {/* Outer band p5 to p95 */}
              <polygon
                points={`${getPoints('p5')} ${getPoints('p95')
                  .split(' ')
                  .reverse()
                  .join(' ')}`}
                fill="rgba(59, 130, 246, 0.12)"
              />
              {/* Inner band p25 to p75 */}
              <polygon
                points={`${getPoints('p25')} ${getPoints('p75')
                  .split(' ')
                  .reverse()
                  .join(' ')}`}
                fill="rgba(59, 130, 246, 0.22)"
              />
              {/* Median Line */}
              <polyline points={getPoints('median')} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Histogram */}
        <div className="p-2 sm:p-2.5 rounded bg-[#1a2232] border border-[#242e42] flex flex-col min-w-0 overflow-hidden">
          <div className="text-[10px] font-bold text-slate-400 mb-1">R-Outcome Distribution</div>
          <div className="h-28 sm:h-32 flex items-end space-x-1 pt-2 w-full min-w-0 overflow-x-auto no-scrollbar">
            {histogram.map((bin, i) => {
              const maxCount = Math.max(...histogram.map((b) => b.count)) || 1;
              const hPct = Math.max(8, (bin.count / maxCount) * 100);
              const isWin = bin.range.includes('Target') || bin.range.includes('+');

              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-7">
                  <div
                    style={{ height: `${hPct}%` }}
                    className={`w-full rounded-t transition ${
                      isWin ? 'bg-emerald-500/60 hover:bg-emerald-400' : 'bg-rose-500/60 hover:bg-rose-400'
                    }`}
                  />
                  <span className="text-[8px] text-slate-400 truncate w-full text-center mt-1 select-none font-mono">{bin.range}</span>
                  {/* Tooltip */}
                  <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-black text-[9px] text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                    {bin.count} runs
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

