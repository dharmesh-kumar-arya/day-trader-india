import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { Candle, OpeningRange, TradePlan, TimeMachineSimulation, RiskChecklistResult } from '../types';
import { TrendingUp, Target, Shield, Clock, RotateCw } from 'lucide-react';
import { TradeSignalBanner } from './TradeSignalBanner';

interface ChartStationProps {
  symbol: string;
  candles: Candle[];
  interval: string;
  onChangeInterval: (int: string) => void;
  openingRange: OpeningRange | null;
  tradePlan: TradePlan | null;
  simulation: TimeMachineSimulation | null;
  riskCheck: RiskChecklistResult | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export const ChartStation: React.FC<ChartStationProps> = ({
  symbol,
  candles,
  interval,
  onChangeInterval,
  openingRange,
  tradePlan,
  simulation,
  riskCheck,
  isLoading,
  onRefresh,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Price lines references
  const stopLineRef = useRef<any>(null);
  const targetLineRef = useRef<any>(null);
  const orHighLineRef = useRef<any>(null);
  const orLowLineRef = useRef<any>(null);

  // Zoom & incremental streaming references
  const isFirstLoadForSymbolRef = useRef(true);
  const lastLevelsKeyRef = useRef('');
  const lastCandlesLengthRef = useRef(0);

  // Candle close countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const s = now.getSeconds();
      const m = now.getMinutes();
      let rem = 0;
      if (interval === '1m') {
        rem = 60 - s;
      } else if (interval === '5m') {
        rem = (4 - (m % 5)) * 60 + (60 - s);
      } else if (interval === '15m') {
        rem = (14 - (m % 15)) * 60 + (60 - s);
      } else {
        setSecondsRemaining(null);
        return;
      }
      setSecondsRemaining(rem);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [interval]);

  // Initialize and resize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: '#0b0e14' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#161d2a' },
        horzLines: { color: '#161d2a' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: '#242e42',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#242e42',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candlestickSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Helper to remove all active price lines from the chart series
  const removeAllPriceLines = () => {
    if (candlestickSeriesRef.current) {
      if (orHighLineRef.current) {
        try { candlestickSeriesRef.current.removePriceLine(orHighLineRef.current); } catch (e) {}
        orHighLineRef.current = null;
      }
      if (orLowLineRef.current) {
        try { candlestickSeriesRef.current.removePriceLine(orLowLineRef.current); } catch (e) {}
        orLowLineRef.current = null;
      }
      if (stopLineRef.current) {
        try { candlestickSeriesRef.current.removePriceLine(stopLineRef.current); } catch (e) {}
        stopLineRef.current = null;
      }
      if (targetLineRef.current) {
        try { candlestickSeriesRef.current.removePriceLine(targetLineRef.current); } catch (e) {}
        targetLineRef.current = null;
      }
    }
  };

  // When selected symbol or interval changes: reset zoom flag, clean lines, and clear data
  useEffect(() => {
    isFirstLoadForSymbolRef.current = true;
    lastLevelsKeyRef.current = '';
    lastCandlesLengthRef.current = 0;
    removeAllPriceLines();
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData([]);
    }
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData([]);
    }
    if (chartInstanceRef.current) {
      chartInstanceRef.current.priceScale('right').applyOptions({ autoScale: true });
    }
  }, [symbol, interval]);

  // Update candle data with IST timezone offset (UTC + 5:30 = 19,800 seconds)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;
    if (candles.length === 0) return;

    // Convert timestamps to Indian Standard Time (IST) and deduplicate
    const IST_OFFSET_SECONDS = 19800; // 5 hours 30 minutes in seconds
    const uniqueMap = new Map();
    for (const c of candles) {
      const istTime = (c.time + IST_OFFSET_SECONDS) as any;
      uniqueMap.set(istTime, {
        time: istTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      });
    }

    const sortedList = Array.from(uniqueMap.values()).sort(
      (a: any, b: any) => (a.time as number) - (b.time as number)
    );

    const formattedCandles = sortedList.map((c: any) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedVolumes = sortedList.map((c: any) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    }));

    // Safe full dataset update: Lightweight Charts smoothly updates candles without canvas crash
    try {
      candlestickSeriesRef.current.setData(formattedCandles);
      volumeSeriesRef.current.setData(formattedVolumes);
    } catch (e) {
      console.warn('Lightweight Charts data update skipped:', e);
    }

    // Only update price lines if levels actually change, preventing axis jumps
    const levelsKey = `${symbol}:${openingRange?.or_high}:${openingRange?.or_low}:${tradePlan?.stop_price}:${tradePlan?.target_price}`;
    if (levelsKey !== lastLevelsKeyRef.current) {
      removeAllPriceLines();
      lastLevelsKeyRef.current = levelsKey;

      // Apply Opening Range Lines only if matching the currently selected symbol
      if (openingRange && openingRange.symbol === symbol && openingRange.or_high && openingRange.or_low) {
        orHighLineRef.current = candlestickSeriesRef.current.createPriceLine({
          price: openingRange.or_high,
          color: '#f59e0b',
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'OR HIGH (09:30)',
        });

        orLowLineRef.current = candlestickSeriesRef.current.createPriceLine({
          price: openingRange.or_low,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'OR LOW',
        });
      }

      // Apply Trade Plan Stop Loss & Target Lines only if matching the currently selected symbol
      if (tradePlan && tradePlan.symbol === symbol && tradePlan.stop_price && tradePlan.target_price) {
        stopLineRef.current = candlestickSeriesRef.current.createPriceLine({
          price: tradePlan.stop_price,
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'STOP LOSS',
        });

        targetLineRef.current = candlestickSeriesRef.current.createPriceLine({
          price: tradePlan.target_price,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `TARGET (${tradePlan.target_r}R)`,
        });
      }
    }

    // Auto-scale and set initial zoom ONLY ONCE on first load of the symbol
    // Future 10s background syncs will NEVER reset the user's manual zoom or pan!
    if (chartInstanceRef.current && formattedCandles.length > 0 && isFirstLoadForSymbolRef.current) {
      chartInstanceRef.current.priceScale('right').applyOptions({ autoScale: true });
      const total = formattedCandles.length;
      const visibleBars = 65; // Focus on the latest 65 bars (today's intraday trading session)
      chartInstanceRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, total - visibleBars),
        to: total + 4,
      });
      chartInstanceRef.current.timeScale().scrollToRealTime();
      isFirstLoadForSymbolRef.current = false;
    }
  }, [candles, openingRange, tradePlan, symbol]);

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const isTriggered = openingRange?.status === 'TRIGGERED';

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] relative select-none">
      {/* Chart Header Toolbar */}
      <div className="h-11 px-4 border-b border-[#242e42] bg-[#121722] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-sm text-white">{symbol}</span>
          <span className="font-mono text-sm font-semibold text-emerald-400">
            ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>

          {/* ORB Status Pill */}
          {openingRange && (
            <div
              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                isTriggered
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <Target className="w-3 h-3 inline" />
              <span>
                {isTriggered
                  ? `ORB BREAKOUT @ ₹${openingRange.breakout_price}`
                  : `ORB FORMING (High: ₹${openingRange.or_high})`}
              </span>
            </div>
          )}
        </div>

        {/* Timezone Badge, Live Pulse & Interval Switcher */}
        <div className="flex items-center space-x-2">
          {/* Candle countdown timer */}
          {secondsRemaining !== null && (
            <div
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[10px] text-blue-300 font-mono"
              title="Time remaining until current candle closes"
            >
              <Clock className="w-3 h-3 text-blue-400" />
              <span>
                Bar: {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Live pulsing indicator */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE (3s)</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Refresh candles now"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <span className="text-[10px] text-slate-400 font-mono bg-[#161d2a] px-2 py-0.5 rounded border border-[#242e42]">
            Timezone: IST (UTC+5:30)
          </span>
          <div className="flex items-center space-x-1">
            {['1m', '5m', '15m', '1D'].map((int) => (
              <button
                key={int}
                onClick={() => onChangeInterval(int)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                  interval === int
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a2232]'
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Trade Signal Banner */}
      <TradeSignalBanner
        symbol={symbol}
        openingRange={openingRange}
        tradePlan={tradePlan}
        simulation={simulation}
        riskCheck={riskCheck}
      />

      {/* Main Canvas Container */}
      <div ref={chartContainerRef} className="flex-1 w-full h-full relative" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#0b0e14]/60 backdrop-blur-xs flex items-center justify-center text-xs text-slate-300">
          Loading {symbol} chart...
        </div>
      )}
    </div>
  );
};
