import React from 'react';
import { MarketStatus, DhanStatus } from '../types';
import { Activity, ShieldCheck, AlertCircle, Clock, Volume2, VolumeX, Key, PanelLeft, PanelRight, PanelBottom, BellRing } from 'lucide-react';

interface HeaderProps {
  marketStatus: MarketStatus | null;
  dhanStatus: DhanStatus | null;
  isPaper: boolean;
  onTogglePaper: () => void;
  onOpenDhanModal: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenAlertModal?: () => void;
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
  onOpenAlertModal,
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

  return (
    <header className="h-12 sm:h-14 border-b border-[#242e42] bg-[#121722] px-2.5 sm:px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Desktop Panel Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Desktop Panel Toggle */}
        {onToggleScanner && (
          <button
            onClick={onToggleScanner}
            className={`hidden lg:flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer ${
              isScannerOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-[#1a2232] text-slate-400 border-[#242e42] hover:text-white'
            }`}
            title={isScannerOpen ? 'Hide Scanner Panel' : 'Show Scanner Panel'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Brand Logo */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white shadow-md shadow-blue-600/30 text-[10px] sm:text-xs">
            DT
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-extrabold text-xs sm:text-sm tracking-wide text-white whitespace-nowrap">
              DAY TRADER
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold text-blue-400 px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-800/40">
              INDIA
            </span>
          </div>
        </div>

        {/* NIFTY 50 & BANKNIFTY Tickers (Visible on Extra Large Screens) */}
        <div className="hidden xl:flex items-center space-x-4 border-l border-[#242e42] pl-3 text-xs shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium text-[11px]">NIFTY 50:</span>
            <span className="font-mono font-bold text-white text-[11px]">25,366.50</span>
            <span className="text-emerald-400 font-medium text-[10px]">+0.42%</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium text-[11px]">BANKNIFTY:</span>
            <span className="font-mono font-bold text-white text-[11px]">52,120.80</span>
            <span className="text-emerald-400 font-medium text-[10px]">+0.58%</span>
          </div>
        </div>
      </div>

      {/* Clock, Status & Controls Cluster */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Market Clock & Square-off Timer (Desktop/Tablet) */}
        {marketStatus && (
          <div className="hidden md:flex items-center space-x-2 bg-[#1a2232] px-2.5 py-1 rounded-lg border border-[#242e42] text-xs">
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
          className="flex items-center space-x-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#242e42] bg-[#1a2232] hover:bg-[#242e42] transition cursor-pointer"
          title="Click to configure Dhan API credentials"
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              dhanStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-200 hidden sm:inline text-xs font-semibold">
            {dhanStatus?.connected ? 'DHAN LIVE' : 'DHAN (CONFIG)'}
          </span>
          <span className="text-slate-200 sm:hidden font-bold text-[10px] tracking-wide">
            DHAN
          </span>
          {dhanStatus?.connected ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline shrink-0" />
          ) : (
            <Key className="w-3.5 h-3.5 text-amber-400 hidden sm:inline shrink-0" />
          )}
        </button>

        {/* Mode Toggle: Paper vs Live */}
        <button
          onClick={onTogglePaper}
          className={`flex items-center space-x-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider transition cursor-pointer ${
            isPaper
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30'
              : 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 shadow-md shadow-emerald-600/20'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isPaper ? 'bg-blue-400' : 'bg-white animate-pulse'
            }`}
          />
          <span className="hidden sm:inline">{isPaper ? 'PAPER TRADING' : 'LIVE CAPITAL'}</span>
          <span className="sm:hidden">{isPaper ? 'PAPER' : 'LIVE'}</span>
        </button>

        {/* Audio Alert Toggle */}
        <button
          onClick={onToggleAudio}
          className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-lg border border-[#242e42] hover:bg-[#1a2232] transition cursor-pointer"
          title={audioEnabled ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
        >
          {audioEnabled ? (
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
          )}
        </button>

        {/* Native Notification & Background Alerts Modal */}
        {onOpenAlertModal && (
          <button
            onClick={onOpenAlertModal}
            className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-lg border border-[#242e42] hover:bg-[#1a2232] transition cursor-pointer relative"
            title="Native Trade Alerts & Background Service"
          >
            <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
          </button>
        )}

        {/* Desktop Layout Toggles */}
        {onToggleBottom && (
          <button
            onClick={onToggleBottom}
            className={`hidden lg:flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer ${
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
            className={`hidden lg:flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer ${
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
