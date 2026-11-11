import React, { useState } from 'react';
import { OpeningRange, TradePlan, TimeMachineSimulation, RiskChecklistResult } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, HelpCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface TradeSignalBannerProps {
  symbol: string;
  openingRange: OpeningRange | null;
  tradePlan: TradePlan | null;
  simulation: TimeMachineSimulation | null;
  riskCheck: RiskChecklistResult | null;
}

export const TradeSignalBanner: React.FC<TradeSignalBannerProps> = ({
  symbol,
  openingRange,
  tradePlan,
  simulation,
  riskCheck,
}) => {
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const isOrbBreakout = openingRange?.status === 'TRIGGERED';
  const isTimeMachinePositive = simulation ? simulation.expected_value_r > 0 && simulation.probabilities.target_first_pct >= 40 : false;
  const isTimeMachineNegative = simulation ? simulation.probabilities.stop_first_pct > 50 || simulation.expected_value_r < 0 : false;
  const isRiskPassed = riskCheck?.passed ?? false;

  // Compute Master Trade Call
  let statusColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let badgeColor = 'bg-slate-700 text-white';
  let actionTitle = 'EVALUATING SETUP...';
  let actionDetail = 'Analyzing price action, breakout volume, and Monte Carlo probabilities...';

  if (isOrbBreakout && isTimeMachinePositive && isRiskPassed) {
    statusColor = 'bg-emerald-950/60 text-emerald-200 border-emerald-500/50 shadow-lg shadow-emerald-950/40';
    badgeColor = 'bg-emerald-500 text-black font-extrabold';
    actionTitle = `🟢 HIGH CONVICTION: BUY SIGNAL FOR ${symbol}`;
    actionDetail = `Breakout confirmed above OR High (₹${openingRange?.or_high}). Time Machine EV: +${simulation?.expected_value_r}R (Win Rate ${simulation?.probabilities.target_first_pct}%). All 7 Risk Gates PASSED.`;
  } else if (isTimeMachineNegative) {
    statusColor = 'bg-rose-950/60 text-rose-200 border-rose-500/50';
    badgeColor = 'bg-rose-600 text-white font-extrabold';
    actionTitle = `🔴 LOW CONVICTION: AVOID / PASS ON ${symbol}`;
    actionDetail = `Time Machine replays show high probability of hitting Stop Loss (${simulation?.probabilities.stop_first_pct}%). The math is against this trade. Click "Top Setup" in the scanner to pick a higher conviction stock.`;
  } else if (openingRange?.status === 'WAITING') {
    statusColor = 'bg-amber-950/50 text-amber-200 border-amber-500/40';
    badgeColor = 'bg-amber-500 text-black font-extrabold';
    actionTitle = `🟡 WAITING FOR 5-MIN BREAKOUT CLOSE`;
    actionDetail = `Stock has not closed above 15m OR High (₹${openingRange?.or_high}) yet. Do not enter prematurely. Wait for candle close confirmation.`;
  } else if (openingRange?.status === 'FORMING') {
    statusColor = 'bg-blue-950/50 text-blue-200 border-blue-500/40';
    badgeColor = 'bg-blue-500 text-white font-extrabold';
    actionTitle = `🔵 15-MINUTE OPENING RANGE FORMING`;
    actionDetail = `Range is being established between 09:15 and 09:30 IST. No entries allowed until the 09:30 range high is locked.`;
  }

  return (
    <div className="border-b border-[#242e42] select-none text-xs shrink-0">
      {/* Main Signal Strip */}
      <div className={`px-2.5 sm:px-4 py-1.5 sm:py-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 transition-colors ${statusColor}`}>
        <div
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3 cursor-pointer sm:cursor-default"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[11px] uppercase tracking-wider shrink-0 ${badgeColor}`}>
              TRADE SIGNAL
            </span>
            <div className="font-extrabold tracking-wide text-[11px] sm:text-xs truncate">
              {actionTitle}
            </div>
          </div>

          {/* Mobile expand indicator icon */}
          <div className="sm:hidden shrink-0 text-slate-400 p-0.5">
            {isMobileExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Action Detail: Always visible on desktop (sm:block), collapsible on mobile */}
        <div className={`${isMobileExpanded ? 'block' : 'hidden'} sm:block min-w-0 flex-1 sm:ml-2`}>
          <div className="text-[10px] sm:text-[11px] opacity-90 leading-snug">{actionDetail}</div>
        </div>

        {/* Playbook Guide Toggle */}
        <div className={`${isMobileExpanded ? 'flex' : 'hidden'} sm:flex items-center justify-end shrink-0`}>
          <button
            onClick={() => setShowPlaybook(!showPlaybook)}
            className="flex items-center space-x-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-[#161d2a] hover:bg-[#20293a] text-slate-300 border border-[#242e42] transition cursor-pointer text-[10px] sm:text-[11px] font-semibold shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>How to Trade</span>
            {showPlaybook ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible 4-Step Playbook Guide */}
      {showPlaybook && (
        <div className="bg-[#101520] p-3 sm:p-3.5 border-b border-[#242e42] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded bg-[#161d2a] border border-[#242e42]">
            <div className="flex items-center space-x-1.5 text-blue-400 font-bold mb-1">
              <span className="h-4 w-4 rounded-full bg-blue-500 text-black flex items-center justify-center text-[10px]">1</span>
              <span>Pick Highest Ranked Stock</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Click the <strong className="text-emerald-400">"Top Setup"</strong> button in the left scanner. It automatically selects the #1 stock with the highest conviction score (ORB + 20-day high momentum).
            </p>
          </div>

          <div className="p-2.5 rounded bg-[#161d2a] border border-[#242e42]">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold mb-1">
              <span className="h-4 w-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px]">2</span>
              <span>Confirm Breakout on Chart</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Verify that a 5-minute green candle has <strong>closed above the yellow dotted line (OR HIGH)</strong>. Never enter while the candle is still forming.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[#161d2a] border border-[#242e42]">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold mb-1">
              <span className="h-4 w-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px]">3</span>
              <span>Check Time Machine Odds</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Look at the Time Machine below: Expected Value (EV) must be <strong className="text-emerald-400">positive (+R)</strong> and Verdict must say <em>"Clear Lean"</em> or <em>"Strong Lean"</em>. If it says <em>"Leans Stop"</em>, PASS.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[#161d2a] border border-[#242e42]">
            <div className="flex items-center space-x-1.5 text-purple-400 font-bold mb-1">
              <span className="h-4 w-4 rounded-full bg-purple-500 text-black flex items-center justify-center text-[10px]">4</span>
              <span>Review Checklist & Execute</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              On the right Order Desk: adjust your Max Risk slider (e.g. ₹1,000), confirm all 7 risk gates say <strong className="text-emerald-400">PASS</strong>, then click <strong>Execute Order</strong>. Relax until 3:15 PM auto-squareoff!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

