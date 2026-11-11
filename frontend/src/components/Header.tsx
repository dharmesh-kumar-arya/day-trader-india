import React from 'react';
import { MarketStatus, DhanStatus } from '../types';
import { Activity, ShieldCheck, AlertCircle, Clock, Volume2, VolumeX, Key, PanelLeft, PanelRight, PanelBottom } from 'lucide-react';

interface HeaderProps {
  marketStatus: MarketStatus | null;
  dhanStatus: DhanStatus | null;
  isPaper: boolean;
  onTogglePaper: () => void;
  onOpenDhanModal: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  isScannerOpen?: boolean;
  onToggleScanner?: () => void;
  isOrderDeskOpen?: boolean;
  onToggleOrderDesk?: () => void;
  isBottomOpen?: boolean;
  onToggleBottom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  marketStatus,
  dhanStatus,
  isPaper,
  onTogglePaper,
  onOpenDhanModal,
  audioEnabled,
  onToggleAudio,
  isScannerOpen = true,
  onToggleScanner,
  isOrderDeskOpen = true,
  onToggleOrderDesk,
  isBottomOpen = true,
  onToggleBottom,
}) => {
  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatSecondsShort = (sec: number) => {
    const m = Math.floor(sec / 60);
    return `${m}m`;
  };

  return (
    <header className="h-13 sm:h-14 border-b border-[#242e42] bg-[#121722] px-2.5 sm:px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Market Tickers */}
      <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0">
        {/* Desktop Panel Toggles */}
        {onToggleScanner && (
          <button
            onClick={onToggleScanner}
            className={`hidden lg:flex items-center justify-center p-1.5 rounded border transition cursor-pointer ${
              isScannerOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-[#1a2232] text-slate-400 border-[#242e42] hover:text-white'
            }`}
            title={isScannerOpen ? 'Hide Scanner Panel' : 'Show Scanner Panel'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-2 shrink-0">
          <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-xs">
            DT
          </div>
          <div className="flex items-center">
            <span className="font-bold text-xs sm:text-sm tracking-wide text-white whitespace-nowrap">DAY TRADER</span>
            <span className="text-[10px] sm:text-xs font-semibold text-blue-400 ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40">
              INDIA
            </span>
          </div>
        </div>

        {/* NIFTY 50 & BANKNIFTY Tickers (Visible on Large screens) */}
        <div className="hidden xl:flex items-center space-x-4 border-l border-[#242e42] pl-4 text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">NIFTY 50:</span>
            <span className="font-mono font-bold text-white">25,366.50</span>
            <span className="text-emerald-400 font-medium">+106.20 (+0.42%)</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">BANKNIFTY:</span>
            <span className="font-mono font-bold text-white">52,120.80</span>
            <span className="text-emerald-400 font-medium">+298.40 (+0.58%)</span>
          </div>
        </div>
      </div>

      {/* Clock, Status & Dhan Connection */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Market Clock & Square-off Timer */}
        {marketStatus && (
          <div className="hidden md:flex items-center space-x-2 bg-[#1a2232] px-2.5 py-1 rounded-md border border-[#242e42] text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-300 font-mono text-[11px]">{marketStatus.current_time_ist}</span>
            {marketStatus.seconds_to_squareoff > 0 && (
              <>
                <div className="h-3 w-px bg-slate-700" />
                <span className="text-amber-400 font-medium text-[11px] whitespace-nowrap">
                  Sq-off: {formatSeconds(marketStatus.seconds_to_squareoff)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Dhan Connection Status Badge */}
        <button
          onClick={onOpenDhanModal}
          className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-md border border-[#242e42] bg-[#1a2232] hover:bg-[#242e42] transition text-xs font-medium cursor-pointer"
          title="Click to configure Dhan API credentials"
        >
          {dhanStatus?.connected ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-200 hidden sm:inline text-xs">DHAN LIVE</span>
              <span className="text-slate-200 sm:hidden text-[11px] font-semibold">DHAN</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline ml-0.5 shrink-0" />
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-slate-300 hidden sm:inline text-xs">DHAN (CONFIG)</span>
              <span className="text-slate-300 sm:hidden text-[11px] font-semibold">DHAN</span>
              <Key className="w-3.5 h-3.5 text-amber-400 hidden sm:inline ml-0.5 shrink-0" />
            </>
          )}
        </button>

        {/* Mode Toggle: Paper vs Live */}
        <button
          onClick={onTogglePaper}
          className={`flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider transition cursor-pointer ${
            isPaper
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30'
              : 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 shadow-md shadow-emerald-600/20'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isPaper ? 'bg-blue-400' : 'bg-white animate-pulse'}`} />
          <span className="hidden sm:inline">{isPaper ? 'PAPER TRADING' : 'LIVE CAPITAL'}</span>
          <span className="sm:hidden">{isPaper ? 'PAPER' : 'LIVE'}</span>
        </button>

        {/* Audio Alert Toggle */}
        <button
          onClick={onToggleAudio}
          className="p-1.5 text-slate-400 hover:text-white rounded border border-[#242e42] hover:bg-[#1a2232] transition cursor-pointer"
          title={audioEnabled ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Desktop Layout Toggles */}
        {onToggleBottom && (
          <button
            onClick={onToggleBottom}
            className={`hidden lg:flex items-center justify-center p-1.5 rounded border transition cursor-pointer ${
              isBottomOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-[#1a2232] text-slate-400 border-[#242e42] hover:text-white'
            }`}
            title={isBottomOpen ? 'Hide Bottom Analytics' : 'Show Bottom Analytics'}
          >
            <PanelBottom className="w-4 h-4" />
          </button>
        )}

        {onToggleOrderDesk && (
          <button
            onClick={onToggleOrderDesk}
            className={`hidden lg:flex items-center justify-center p-1.5 rounded border transition cursor-pointer ${
              isOrderDeskOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-[#1a2232] text-slate-400 border-[#242e42] hover:text-white'
            }`}
            title={isOrderDeskOpen ? 'Hide Order Desk' : 'Show Order Desk'}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
