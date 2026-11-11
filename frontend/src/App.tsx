import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ScannerTable } from './components/ScannerTable';
import { ChartStation } from './components/ChartStation';
import { TimeMachineLab } from './components/TimeMachineLab';
import { OrderDesk } from './components/OrderDesk';
import { PositionsTable } from './components/PositionsTable';
import { SmartMoneyBoard } from './components/SmartMoneyBoard';
import { CatalystFeed } from './components/CatalystFeed';
import { DhanModal } from './components/DhanModal';
import { NativeAlertsModal } from './components/NativeAlertsModal';
import {
  initNativeFeatures,
  notifyTradeSignal,
  onTradeNotificationTapped,
} from './services/nativeService';
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
import { TrendingUp, Briefcase, Landmark, Newspaper, CheckCircle2, AlertTriangle, X, Zap, Flame } from 'lucide-react';

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
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'timemachine' | 'positions' | 'smartmoney' | 'catalysts'>('timemachine');
  
  // Responsive mobile navigation tab & desktop panel visibility
  const [mobileTab, setMobileTab] = useState<'chart' | 'scanner' | 'order' | 'positions' | 'analytics'>('chart');
  const [isScannerOpen, setIsScannerOpen] = useState(true);
  const [isOrderDeskOpen, setIsOrderDeskOpen] = useState(true);
  const [isBottomOpen, setIsBottomOpen] = useState(true);

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

  // Real-Time WebSocket Streaming State
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

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
  }, []);

  // Initialize Native Android Notifications & Background Foreground Service
  useEffect(() => {
    initNativeFeatures();

    const unsubscribeTap = onTradeNotificationTapped(({ symbol }) => {
      if (symbol) {
        setSelectedSymbol(symbol);
        try {
          localStorage.setItem('dt_selected_symbol', symbol);
        } catch {}
        setMobileTab('order');
        setIsOrderDeskOpen(true);
      }
    });

    return () => {
      unsubscribeTap();
    };
  }, []);

  // 2. Fetch Scanner Results (Instant cache display + parallel background refresh)
  useEffect(() => {
    let isCancelled = false;
    const fetchScanner = async () => {
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
          // Audio chime & native notification on new watchlist ORB Breakouts
          for (const item of res.results) {
            if (item.orb_triggered && !triggeredSymbolsRef.current.has(item.symbol)) {
              triggeredSymbolsRef.current.add(item.symbol);
              playAlertSound(880, 0.4);
              notifyTradeSignal({
                symbol: item.symbol,
                signal: 'BUY',
                price: item.current_price,
                setup: '15m ORB Breakout',
                conviction: item.conviction_score || 80,
              });
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

  // 5. Pre-Flight Risk Check (Debounced by 150ms for smooth risk budget seek bar sliding)
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

  // Keep current active selections in refs for WebSocket handlers
  const selectedSymbolRef = useRef(selectedSymbol);
  selectedSymbolRef.current = selectedSymbol;
  const selectedIntervalRef = useRef(selectedInterval);
  selectedIntervalRef.current = selectedInterval;
  const isPaperRef = useRef(isPaper);
  isPaperRef.current = isPaper;

  // Persistent WebSocket Connection for zero-latency live market ticks, positions, and alerts
  useEffect(() => {
    let isMounted = true;
    let reconnectDelay = 1000;

    const connectWs = () => {
      const isCap =
        (window as any).Capacitor !== undefined ||
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'file:' ||
        (window.location.hostname === 'localhost' && window.location.port !== '8000' && window.location.port !== '5173');
      const backendHost = localStorage.getItem('dt_backend_url') || (isCap ? 'http://localhost:8000' : '');
      let wsUrl = '';
      if (backendHost) {
        const wsProtocol = backendHost.startsWith('https') ? 'wss:' : 'ws:';
        const hostWithoutProto = backendHost.replace(/^https?:\/\//, '');
        wsUrl = `${wsProtocol}//${hostWithoutProto}/ws/market`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws/market`;
      }

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsWsConnected(true);
          reconnectDelay = 1000;

          // Subscribe to currently selected symbol and interval
          ws.send(
            JSON.stringify({
              action: 'subscribe',
              symbol: selectedSymbolRef.current,
              interval: selectedIntervalRef.current,
              is_paper: isPaperRef.current,
            })
          );

          // 20-second heartbeat ping to keep connection alive
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (!data || !data.type) return;

            switch (data.type) {
              case 'TICK':
                if (
                  data.symbol === selectedSymbolRef.current &&
                  data.interval === selectedIntervalRef.current &&
                  data.candle
                ) {
                  const tickCandle: Candle = data.candle;
                  setCandles((prev) => {
                    if (!prev || prev.length === 0) return [tickCandle];
                    const last = prev[prev.length - 1];
                    if (last.time === tickCandle.time) {
                      // Fast delta update to the forming candle
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                        ...last,
                        high: Math.max(last.high, tickCandle.high, tickCandle.close),
                        low: Math.min(last.low, tickCandle.low, tickCandle.close),
                        close: tickCandle.close,
                        volume: tickCandle.volume ?? last.volume,
                      };
                      return updated;
                    } else if (tickCandle.time > last.time) {
                      // Append newly closed bar
                      return [...prev.slice(-299), tickCandle];
                    }
                    return prev;
                  });
                }
                break;

              case 'POSITIONS':
                if (data.is_paper === undefined || data.is_paper === isPaperRef.current) {
                  if (Array.isArray(data.positions)) {
                    setPositions(data.positions);
                  }
                }
                break;

              case 'MARKET_STATUS':
                if (data.status) {
                  setMarketStatus(data.status);
                }
                break;

              case 'ORB_BREAKOUT':
                if (data.symbol) {
                  const p = data.breakout_price || 0;
                  notifyTradeSignal({
                    symbol: data.symbol,
                    signal: 'BUY',
                    price: p,
                    target: Math.round(p * 1.015 * 100) / 100,
                    stopLoss: Math.round(p * 0.992 * 100) / 100,
                    setup: '15m ORB Breakout',
                    conviction: 85,
                  });
                  setOrderToast({
                    type: 'success',
                    title: `⚡ ORB Breakout: ${data.symbol}`,
                    message: `${data.symbol} broke out of Opening Range @ ₹${p}!`,
                  });
                  playAlertSound(1100, 0.4);
                }
                break;

              case 'TRADE_SIGNAL':
                if (data.symbol) {
                  notifyTradeSignal({
                    symbol: data.symbol,
                    signal: data.signal || 'BUY',
                    price: data.price || 0,
                    target: data.target,
                    stopLoss: data.stop_loss,
                    setup: data.setup,
                    conviction: data.conviction,
                  });
                  setOrderToast({
                    type: 'success',
                    title: `🚨 ${data.signal || 'BUY'} Signal: ${data.symbol}`,
                    message: `${data.setup || 'Breakout'} @ ₹${data.price} • Tap to trade!`,
                  });
                  playAlertSound(1200, 0.4);
                }
                break;

              case 'PONG':
                break;

              default:
                break;
            }
          } catch (e) {
            console.error('[WS] Error processing frame:', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsWsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
            connectWs();
          }, reconnectDelay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Update WebSocket subscription when symbol, interval, or paper mode changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'subscribe',
          symbol: selectedSymbol,
          interval: selectedInterval,
          is_paper: isPaper,
        })
      );
    }
  }, [selectedSymbol, selectedInterval, isPaper]);

  // Tab visibility change handler
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
      playAlertSound(1046, 0.3);
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
        playAlertSound(1318, 0.4);
        setOrderToast({
          type: 'success',
          title: isPaper ? `Paper ${side} Executed` : `Live Dhan ${side} Placed`,
          message: res.message || `${shares} shares of ${selectedSymbol} @ ₹${price}`
        });
        const posRes = await fetch(`/api/dhan/positions?is_paper=${isPaper}`).then((r) => r.json());
        if (posRes.positions) setPositions(posRes.positions);
        setActiveBottomTab('positions');
        setMobileTab('positions');
      } else {
        playAlertSound(300, 0.35);
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
      playAlertSound(440, 0.5);
      setPositions([]);
    } catch (err) {
      console.error('Flatten error:', err);
    }
  };

  // Exit Individual Position
  const handleExitPosition = async (positionId: string) => {
    try {
      const res = await fetch(`/api/dhan/positions/${positionId}/exit?is_paper=${isPaper}`, {
        method: 'POST',
      }).then((r) => r.json());

      if (res.status === 'SUCCESS') {
        playAlertSound(440, 0.4);
        setOrderToast({
          type: 'success',
          title: 'Position Squared Off',
          message: res.message || `Position #${positionId} closed successfully.`
        });
        const posRes = await fetch(`/api/dhan/positions?is_paper=${isPaper}`).then((r) => r.json());
        if (posRes?.positions) setPositions(posRes.positions);
      } else {
        playAlertSound(300, 0.35);
        setOrderToast({
          type: 'error',
          title: 'Exit Failed',
          message: res.message || 'Could not close position.'
        });
      }
    } catch (err: any) {
      setOrderToast({
        type: 'error',
        title: 'Network Error',
        message: err?.message || 'Failed to reach trading backend.'
      });
    }
  };

  // Auto-dismiss toast notification after 4.5 seconds
  useEffect(() => {
    if (!orderToast) return;
    const timer = setTimeout(() => {
      setOrderToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [orderToast]);

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
    // Seamless UX on mobile/tablet: auto-switch to chart when a stock is clicked
    setMobileTab('chart');
  };

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-screen bg-[#0b0e14] text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        marketStatus={marketStatus}
        dhanStatus={dhanStatus}
        isPaper={isPaper}
        onTogglePaper={() => setIsPaper(!isPaper)}
        onOpenDhanModal={() => setIsDhanModalOpen(true)}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
        isScannerOpen={isScannerOpen}
        onToggleScanner={() => setIsScannerOpen(!isScannerOpen)}
        isOrderDeskOpen={isOrderDeskOpen}
        onToggleOrderDesk={() => setIsOrderDeskOpen(!isOrderDeskOpen)}
        isBottomOpen={isBottomOpen}
        onToggleBottom={() => setIsBottomOpen(!isBottomOpen)}
      />

      {/* Toast Notification for Orders & Breakouts */}
      {orderToast && (
        <div className="fixed bottom-16 sm:bottom-auto sm:top-16 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-sm w-auto animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-3 duration-200 pointer-events-auto">
          <div
            className={`p-3 rounded-xl border shadow-2xl flex items-start space-x-2.5 backdrop-blur-md ${
              orderToast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                : 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/50'
            }`}
          >
            {orderToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-bold flex items-center justify-between">
                <span>{orderToast.title}</span>
              </div>
              <div className="text-slate-300 mt-0.5 leading-snug text-[11px]">{orderToast.message}</div>
            </div>
            <button
              onClick={() => setOrderToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer p-0.5 shrink-0 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DESKTOP WORKSPACE LAYOUT (Visible on lg: and larger screens) */}
      {/* ======================================================== */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left Panel: Scanner (Collapsible) */}
        {isScannerOpen && (
          <div className="w-72 xl:w-80 shrink-0 h-full">
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
        )}

        {/* Center Panel: Chart & Bottom Analytics */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Main Chart Station */}
          <div className={`${isBottomOpen ? 'h-[62%]' : 'h-full'} w-full transition-all duration-150`}>
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
              isWsConnected={isWsConnected}
            />
          </div>

          {/* Bottom Analytics Tabs (Collapsible) */}
          {isBottomOpen && (
            <div className="h-[38%] flex flex-col bg-[#121722] border-t border-[#242e42] overflow-hidden">
              {/* Tabs Header */}
              <div className="h-9 px-3 bg-[#0f131a] border-b border-[#242e42] flex items-center space-x-1 select-none overflow-x-auto no-scrollbar shrink-0">
                <button
                  onClick={() => setActiveBottomTab('timemachine')}
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition whitespace-nowrap cursor-pointer ${
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
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition whitespace-nowrap cursor-pointer ${
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
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition whitespace-nowrap cursor-pointer ${
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
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-t transition whitespace-nowrap cursor-pointer ${
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
                    onExitPosition={handleExitPosition}
                    onSelectSymbol={handleSelectSymbol}
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
          )}
        </div>

        {/* Right Panel: Order Desk & Pre-Flight Risk (Collapsible) */}
        {isOrderDeskOpen && (
          <div className="w-[320px] xl:w-[340px] shrink-0 h-full">
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
        )}
      </div>

      {/* ======================================================== */}
      {/* MOBILE / TABLET WORKSPACE LAYOUT (Visible on < lg screens) */}
      {/* ======================================================== */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Mobile Tab: Scanner */}
        {mobileTab === 'scanner' && (
          <div className="flex-1 min-h-0 overflow-hidden">
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
        )}

        {/* Mobile Tab: Chart (with quick buy/sell action bar) */}
        {mobileTab === 'chart' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            <div className="flex-1 min-h-0 w-full overflow-hidden">
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
                isWsConnected={isWsConnected}
              />
            </div>

            {/* Floating Quick Action Bar for Instant Trading on Mobile */}
            <div className="bg-[#121722]/95 backdrop-blur-md border-t border-[#242e42] px-3.5 py-1.5 flex items-center justify-between z-20 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-white">{selectedSymbol}</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  ₹{candles.length > 0 ? candles[candles.length - 1].close.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSide('BUY');
                    setMobileTab('order');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center space-x-1 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition"
                >
                  <span>BUY</span>
                </button>
                <button
                  onClick={() => {
                    setSide('SELL');
                    setMobileTab('order');
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs flex items-center space-x-1 shadow-md shadow-rose-600/20 cursor-pointer active:scale-95 transition"
                >
                  <span>SELL</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Tab: Order Desk */}
        {mobileTab === 'order' && (
          <div className="flex-1 min-h-0 overflow-hidden">
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
        )}

        {/* Mobile Tab: Positions & Journal */}
        {mobileTab === 'positions' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <PositionsTable
              positions={positions}
              onFlattenAll={handleFlattenAll}
              secondsToSquareoff={marketStatus?.seconds_to_squareoff || 0}
              onExitPosition={handleExitPosition}
              onSelectSymbol={handleSelectSymbol}
            />
          </div>
        )}

        {/* Mobile Tab: Analytics (Time Machine, Smart Money, Announcements) */}
        {mobileTab === 'analytics' && (
          <div className="flex-1 min-h-0 flex flex-col bg-[#121722] overflow-hidden">
            {/* Analytics Tab Switcher */}
            <div className="p-2 bg-[#0f131a] border-b border-[#242e42] shrink-0 select-none">
              <div className="flex bg-[#121722] p-1 rounded-lg border border-[#242e42] overflow-x-auto no-scrollbar gap-1">
                <button
                  onClick={() => setActiveBottomTab('timemachine')}
                  className={`flex-1 flex items-center justify-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer transition ${
                    activeBottomTab === 'timemachine'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Time Machine</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('smartmoney')}
                  className={`flex-1 flex items-center justify-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer transition ${
                    activeBottomTab === 'smartmoney'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Smart Money</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('catalysts')}
                  className={`flex-1 flex items-center justify-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer transition ${
                    activeBottomTab === 'catalysts'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>Catalysts</span>
                </button>
              </div>
            </div>

            {/* Analytics Tab Content */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {activeBottomTab === 'timemachine' && (
                <TimeMachineLab
                  symbol={selectedSymbol}
                  simulation={simulation}
                  onRunSimulation={handleRunSimulation}
                  isLoading={isSimLoading}
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
        )}

        {/* Mobile Bottom Navigation Bar */}
        <nav className="h-14 bg-[#0f131a] border-t border-[#242e42] grid grid-cols-5 items-center px-1 shrink-0 z-30 select-none pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => setMobileTab('scanner')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              mobileTab === 'scanner' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Scanner</span>
          </button>
          <button
            onClick={() => setMobileTab('chart')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              mobileTab === 'chart' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Chart</span>
          </button>
          <button
            onClick={() => setMobileTab('order')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              mobileTab === 'order' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Trade</span>
          </button>
          <button
            onClick={() => setMobileTab('positions')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer relative ${
              mobileTab === 'positions' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Briefcase className="w-4 h-4 mb-0.5" />
              {positions.length > 0 && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-[#0f131a]" />
              )}
            </div>
            <span className="text-[10px]">Positions</span>
          </button>
          <button
            onClick={() => setMobileTab('analytics')}
            className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
              mobileTab === 'analytics' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Analytics</span>
          </button>
        </nav>
      </div>

      {/* Dhan Credentials Configuration Modal */}
      <DhanModal
        isOpen={isDhanModalOpen}
        onClose={() => setIsDhanModalOpen(false)}
        dhanStatus={dhanStatus}
        onSaveCredentials={handleSaveCredentials}
      />

      {/* Native Alerts & Android Background Engine Modal */}
      <NativeAlertsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        selectedSymbol={selectedSymbol}
        currentPrice={candles[candles.length - 1]?.close || 1335.40}
      />
    </div>
  );
};

export default App;
