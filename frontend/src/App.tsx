import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ScannerTable } from './components/ScannerTable';
import { ChartStation } from './components/ChartStation';
import { TimeMachineLab } from './components/TimeMachineLab';
import { OrderDesk } from './components/OrderDesk';
import { PositionsTable } from './components/PositionsTable';
import { SmartMoneyBoard } from './components/SmartMoneyBoard';
import { CatalystFeed } from './components/CatalystFeed';
import { DhanModal } from './components/DhanModal';
import {
  MarketStatus,
  DhanStatus,
  ScannerResult,
  Candle,
  OpeningRange,
  TradePlan,
  TimeMachineSimulation,
  RiskChecklistResult,
  Position,
} from './types';
import { TrendingUp, Briefcase, Landmark, Newspaper, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
  // App State with persistence
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    try {
      return localStorage.getItem('dt_selected_symbol') || 'RELIANCE';
    } catch {
      return 'RELIANCE';
    }
  });
  const [selectedInterval, setSelectedInterval] = useState('5m');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [sectors, setSectors] = useState<string[]>(['ALL']);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isPaper, setIsPaper] = useState(true);
  const [maxRiskInr, setMaxRiskInr] = useState(1000);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isDhanModalOpen, setIsDhanModalOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'timemachine' | 'positions' | 'smartmoney' | 'catalysts'>('timemachine');
  const [orderToast, setOrderToast] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const triggeredSymbolsRef = React.useRef<Set<string>>(new Set());

  // Server Data State with instant persistence for scanner
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [dhanStatus, setDhanStatus] = useState<DhanStatus | null>(null);
  const [scannerResults, setScannerResults] = useState<ScannerResult[]>(() => {
    try {
      const cached = localStorage.getItem('dt_scanner_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [candles, setCandles] = useState<Candle[]>([]);
  const [openingRange, setOpeningRange] = useState<OpeningRange | null>(null);
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);
  const [simulation, setSimulation] = useState<TimeMachineSimulation | null>(null);
  const [riskCheck, setRiskCheck] = useState<RiskChecklistResult | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [fiiDiiFlows, setFiiDiiFlows] = useState<any>(null);
  const [bulkDeals, setBulkDeals] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Loading States
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [isScannerLoading, setIsScannerLoading] = useState(false);

  // Sound chime synthesizer
  const playAlertSound = (freq = 880, duration = 0.25) => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext blocked before interaction
    }
  };

  // 1. Initial Load: Market status, Universe, Dhan status, Feeds
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [mStatusRes, dhanRes, univRes, feedsCorpRes, feedsInstRes, posRes] = await Promise.all([
          fetch('/api/market/status').then((r) => r.json()),
          fetch('/api/dhan/status').then((r) => r.json()),
          fetch('/api/market/universe').then((r) => r.json()),
          fetch('/api/feeds/corporate').then((r) => r.json()),
          fetch('/api/feeds/institutional').then((r) => r.json()),
          fetch(`/api/dhan/positions?is_paper=${isPaper}`).then((r) => r.json()),
        ]);

        setMarketStatus(mStatusRes);
        setDhanStatus(dhanRes);
        if (univRes.sectors) setSectors(univRes.sectors);
        if (feedsCorpRes.announcements) setAnnouncements(feedsCorpRes.announcements);
        if (feedsInstRes.flows) setFiiDiiFlows(feedsInstRes.flows);
        if (feedsInstRes.bulk_deals) setBulkDeals(feedsInstRes.bulk_deals);
        if (posRes?.positions) setPositions(posRes.positions);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };

    fetchInitialData();
    const intervalId = setInterval(() => {
      if (document.hidden) return; // Inactive tab: pause polling
      fetch('/api/market/status')
        .then((r) => r.json())
        .then(setMarketStatus)
        .catch(() => {});
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  // 2. Fetch Scanner Results (Instant cache display + parallel background refresh)
  useEffect(() => {
    let isCancelled = false;
    const fetchScanner = async () => {
      // Only show full scanning state if we have literally 0 cached results
      if (scannerResults.length === 0) {
        setIsScannerLoading(true);
      }
      try {
        const sectorParam = selectedSector !== 'ALL' ? `?sector=${selectedSector}` : '';
        const res = await fetch(`/api/scanner/run${sectorParam}`).then((r) => r.json());
        if (!isCancelled && res.results) {
          setScannerResults(res.results);
          try {
            localStorage.setItem('dt_scanner_cache', JSON.stringify(res.results));
          } catch {}
          // Audio chime on new watchlist ORB Breakouts
          for (const item of res.results) {
            if (item.orb_triggered && !triggeredSymbolsRef.current.has(item.symbol)) {
              triggeredSymbolsRef.current.add(item.symbol);
              playAlertSound(880, 0.4);
              setOrderToast({
                type: 'success',
                title: `⚡ ORB Breakout: ${item.symbol}`,
                message: `${item.symbol} broke out of Opening Range @ ₹${item.current_price}!`
              });
              break;
            }
          }
        }
      } catch (err) {
        console.error('Scanner error:', err);
      } finally {
        if (!isCancelled) setIsScannerLoading(false);
      }
    };

    fetchScanner();
    return () => {
      isCancelled = true;
    };
  }, [selectedSector]);

  // 3. When Selected Symbol or Interval Changes: Fetch Chart Candles & ORB
  useEffect(() => {
    let isCancelled = false;
    const loadSymbolChart = async () => {
      setIsChartLoading(true);
      try {
        const [chartRes, orbRes] = await Promise.all([
          fetch(`/api/market/chart/${selectedSymbol}?interval=${selectedInterval}&range_str=5d`).then((r) => r.json()),
          fetch(`/api/market/orb/${selectedSymbol}`).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (!isCancelled) {
          if (chartRes.candles) setCandles(chartRes.candles);
          if (orbRes) setOpeningRange(orbRes);
        }
      } catch (err) {
        console.error('Symbol chart load error:', err);
      } finally {
        if (!isCancelled) setIsChartLoading(false);
      }
    };

    loadSymbolChart();
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol, selectedInterval]);

  // 4. When Symbol or Side Changes: Generate Trade Plan & Run Monte Carlo Simulation
  useEffect(() => {
    let isCancelled = false;
    const loadPlanAndSimulation = async () => {
      try {
        const planRes = await fetch('/api/plan/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: selectedSymbol,
            stop_mode: 'or_mid',
            target_multiple: 2.0,
            side: side,
          }),
        }).then((r) => (r.ok ? r.json() : null));

        if (!isCancelled && planRes) {
          setTradePlan(planRes);

          // Auto-run 10,000 Monte Carlo simulation for the selected symbol
          try {
            const simRes = await fetch('/api/plan/timemachine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                symbol: planRes.symbol,
                entry_price: planRes.entry_price,
                stop_price: planRes.stop_price,
                target_price: planRes.target_price,
                replays: 10000,
              }),
            }).then((r) => r.json());
            if (!isCancelled && simRes && simRes.verdict) {
              setSimulation(simRes);
            }
          } catch (e) {
            console.error('Auto sim error:', e);
          }
        }
      } catch (err) {
        console.error('Plan & sim load error:', err);
      }
    };

    loadPlanAndSimulation();
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol, side]);

  // 5. Pre-Flight Risk Check (Debounced by 150ms for buttery-smooth risk budget seek bar sliding)
  useEffect(() => {
    if (!tradePlan || tradePlan.symbol !== selectedSymbol) return;

    const timer = setTimeout(async () => {
      try {
        const riskRes = await fetch('/api/plan/risk_check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: selectedSymbol,
            entry_price: tradePlan.entry_price,
            stop_price: tradePlan.stop_price,
            target_price: tradePlan.target_price,
            shares: Math.max(1, Math.floor(maxRiskInr / Math.max(0.01, tradePlan.risk_per_share))),
            max_risk_per_trade_inr: maxRiskInr,
            dhan_token_valid: isPaper || (dhanStatus?.connected ?? false),
            side: side,
          }),
        }).then((r) => (r.ok ? r.json() : null));

        if (riskRes) setRiskCheck(riskRes);
      } catch (e) {
        console.error('Risk check debounce error:', e);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedSymbol, tradePlan, maxRiskInr, isPaper, dhanStatus, side]);

  // Live Chart Poller & Manual Refresh
  const handleRefreshChart = async () => {
    if (!selectedSymbol) return;
    try {
      const range = selectedInterval === '1D' ? '1mo' : '5d';
      const chartRes = await fetch(`/api/market/chart/${selectedSymbol}?interval=${selectedInterval}&range_str=${range}`).then((r) => r.json());
      if (chartRes.candles && chartRes.candles.length > 0) {
        setCandles(chartRes.candles);
      }
    } catch (e) {
      console.error('Chart live refresh error:', e);
    }
  };

  // Ultra-fast auto-refresh chart candles every 3.5 seconds for real-time live trading (pauses when tab inactive)
  useEffect(() => {
    const liveChartInterval = setInterval(() => {
      if (document.hidden) return; // Inactive tab: pause polling to save battery and network
      handleRefreshChart();
    }, 3500);
    return () => clearInterval(liveChartInterval);
  }, [selectedSymbol, selectedInterval]);

  // Auto-refresh active positions every 5 seconds for live MTM P&L (pauses when tab inactive)
  useEffect(() => {
    const livePosInterval = setInterval(async () => {
      if (document.hidden) return; // Inactive tab: pause polling
      try {
        const posRes = await fetch(`/api/dhan/positions?is_paper=${isPaper}`).then((r) => r.json());
        if (posRes?.positions) setPositions(posRes.positions);
      } catch (e) {}
    }, 5000);
    return () => clearInterval(livePosInterval);
  }, [isPaper]);

  // Tab visibility change handler: when waking up from background, sync without full reload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleRefreshChart();
        fetch(`/api/dhan/positions?is_paper=${isPaper}`)
          .then((r) => r.json())
          .then((res) => {
            if (res?.positions) setPositions(res.positions);
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedSymbol, selectedInterval, isPaper]);

  // Run Time Machine Simulation
  const handleRunSimulation = async () => {
    if (!tradePlan) return;
    setIsSimLoading(true);
    try {
      const res = await fetch('/api/plan/timemachine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: tradePlan.symbol,
          entry_price: tradePlan.entry_price,
          stop_price: tradePlan.stop_price,
          target_price: tradePlan.target_price,
          replays: 10000,
        }),
      }).then((r) => r.json());

      setSimulation(res);
      playAlertSound(1046, 0.3); // High C chime
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimLoading(false);
    }
  };

  // Order Execution Handler (Supports Long & Short)
  const handleExecuteOrder = async (
    shares: number,
    price: number,
    stop: number,
    target: number,
    side: 'BUY' | 'SELL' = 'BUY'
  ) => {
    try {
      const res = await fetch('/api/dhan/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: side,
          quantity: shares,
          price: price,
          stop_loss_price: stop,
          take_profit_price: target,
          is_paper: isPaper,
        }),
      }).then((r) => r.json());

      if (res.status === 'SUCCESS') {
        playAlertSound(1318, 0.4); // E chime for order execution
        setOrderToast({
          type: 'success',
          title: isPaper ? `Paper ${side} Executed` : `Live Dhan ${side} Placed`,
          message: res.message || `${shares} shares of ${selectedSymbol} @ ₹${price}`
        });
        // Refresh positions
        const posRes = await fetch(`/api/dhan/positions?is_paper=${isPaper}`).then((r) => r.json());
        if (posRes.positions) setPositions(posRes.positions);
        setActiveBottomTab('positions');
      } else {
        playAlertSound(300, 0.35); // Low chime for failure
        setOrderToast({
          type: 'error',
          title: isPaper ? 'Paper Order Rejected' : 'Dhan Order Rejected',
          message: res.message || 'The broker or risk engine rejected this order.'
        });
      }
    } catch (err: any) {
      console.error('Order error:', err);
      setOrderToast({
        type: 'error',
        title: 'Network / Server Error',
        message: err?.message || 'Could not reach trading API backend.'
      });
    }
  };

  // Emergency Flatten All Positions
  const handleFlattenAll = async () => {
    try {
      await fetch(`/api/dhan/flatten?is_paper=${isPaper}`, { method: 'POST' });
      playAlertSound(440, 0.5); // A chime for flatten
      setPositions([]);
    } catch (err) {
      console.error('Flatten error:', err);
    }
  };

  // Save Dhan Credentials
  const handleSaveCredentials = async (cId: string, aToken: string) => {
    try {
      const res = await fetch('/api/dhan/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: cId, access_token: aToken }),
      }).then((r) => r.json());
      setDhanStatus(res);
    } catch (err) {
      console.error('Dhan credentials error:', err);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    try {
      localStorage.setItem('dt_selected_symbol', sym);
    } catch {}
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0e14] text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        marketStatus={marketStatus}
        dhanStatus={dhanStatus}
        isPaper={isPaper}
        onTogglePaper={() => setIsPaper(!isPaper)}
        onOpenDhanModal={() => setIsDhanModalOpen(true)}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
      />

      {/* Toast Notification for Orders */}
      {orderToast && (
        <div className="fixed top-12 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`p-3.5 rounded-xl border shadow-2xl flex items-start space-x-3 backdrop-blur-md ${
              orderToast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-100'
            }`}
          >
            {orderToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-bold">{orderToast.title}</div>
              <div className="text-slate-300 mt-0.5 leading-relaxed">{orderToast.message}</div>
            </div>
            <button
              onClick={() => setOrderToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Scanner (width: 320px) */}
        <div className="w-80 shrink-0 h-full">
          <ScannerTable
            results={scannerResults}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={handleSelectSymbol}
            sectors={sectors}
            selectedSector={selectedSector}
            onSelectSector={setSelectedSector}
            isLoading={isScannerLoading}
          />
        </div>

        {/* Center Panel: Chart & Bottom Analytics */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Main Chart Station (62% height) */}
          <div className="h-[62%] w-full">
            <ChartStation
              symbol={selectedSymbol}
              candles={candles}
              interval={selectedInterval}
              onChangeInterval={setSelectedInterval}
              openingRange={openingRange}
              tradePlan={tradePlan}
              simulation={simulation}
              riskCheck={riskCheck}
              isLoading={isChartLoading}
              onRefresh={handleRefreshChart}
            />
          </div>

          {/* Bottom Analytics Tabs (38% height) */}
          <div className="h-[38%] flex flex-col bg-[#121722] border-t border-[#242e42] overflow-hidden">
            {/* Tabs Header */}
            <div className="h-9 px-3 bg-[#0f131a] border-b border-[#242e42] flex items-center space-x-1 select-none">
              <button
                onClick={() => setActiveBottomTab('timemachine')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition ${
                  activeBottomTab === 'timemachine'
                    ? 'bg-[#121722] text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Time Machine (Monte Carlo)</span>
              </button>
              <button
                onClick={() => setActiveBottomTab('positions')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition ${
                  activeBottomTab === 'positions'
                    ? 'bg-[#121722] text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Positions & Journal ({positions.length})</span>
              </button>
              <button
                onClick={() => setActiveBottomTab('smartmoney')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition ${
                  activeBottomTab === 'smartmoney'
                    ? 'bg-[#121722] text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Smart Money & Bulk Deals</span>
              </button>
              <button
                onClick={() => setActiveBottomTab('catalysts')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition ${
                  activeBottomTab === 'catalysts'
                    ? 'bg-[#121722] text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Corporate Announcements</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-hidden">
              {activeBottomTab === 'timemachine' && (
                <TimeMachineLab
                  symbol={selectedSymbol}
                  simulation={simulation}
                  onRunSimulation={handleRunSimulation}
                  isLoading={isSimLoading}
                />
              )}
              {activeBottomTab === 'positions' && (
                <PositionsTable
                  positions={positions}
                  onFlattenAll={handleFlattenAll}
                  secondsToSquareoff={marketStatus?.seconds_to_squareoff || 0}
                />
              )}
              {activeBottomTab === 'smartmoney' && (
                <SmartMoneyBoard flows={fiiDiiFlows} bulkDeals={bulkDeals} />
              )}
              {activeBottomTab === 'catalysts' && (
                <CatalystFeed announcements={announcements} />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Order Desk & Pre-Flight Risk (width: 340px) */}
        <div className="w-[340px] shrink-0 h-full">
          <OrderDesk
            tradePlan={tradePlan}
            riskCheck={riskCheck}
            dhanStatus={dhanStatus}
            isPaper={isPaper}
            side={side}
            onChangeSide={setSide}
            onExecuteOrder={handleExecuteOrder}
            isLoading={isChartLoading}
            maxRiskInr={maxRiskInr}
            onChangeMaxRisk={setMaxRiskInr}
          />
        </div>
      </div>

      {/* Dhan Credentials Configuration Modal */}
      <DhanModal
        isOpen={isDhanModalOpen}
        onClose={() => setIsDhanModalOpen(false)}
        dhanStatus={dhanStatus}
        onSaveCredentials={handleSaveCredentials}
      />
    </div>
  );
};
export default App;

