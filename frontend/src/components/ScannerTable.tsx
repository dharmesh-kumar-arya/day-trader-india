import React, { useState } from 'react';
import { ScannerResult } from '../types';
import { Search, Flame, Target, Filter } from 'lucide-react';

interface ScannerTableProps {
  results: ScannerResult[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  sectors: string[];
  selectedSector: string;
  onSelectSector: (sector: string) => void;
  isLoading: boolean;
}

export const ScannerTable: React.FC<ScannerTableProps> = ({
  results,
  selectedSymbol,
  onSelectSymbol,
  sectors,
  selectedSector,
  onSelectSector,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlySetups, setOnlySetups] = useState(false);

  const filtered = results.filter((item) => {
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || item.sector.toUpperCase() === selectedSector.toUpperCase();
    const matchesSetups = !onlySetups || item.has_setup;
    return matchesSearch && matchesSector && matchesSetups;
  });

  return (
    <div className="flex flex-col h-full bg-[#121722] border-r border-[#242e42] select-none">
      {/* Top Controls */}
      <div className="p-3 border-b border-[#242e42] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>NSE F&O SCANNER</span>
            <span className="text-[10px] text-slate-400 font-normal">({filtered.length})</span>
            {isLoading && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping ml-1" title="Scanning live markets in background..." />
            )}
          </div>
          <button
            onClick={() => setOnlySetups(!onlySetups)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded border transition ${
              onlySetups
                ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                : 'bg-[#1a2232] text-slate-400 border-[#242e42] hover:text-white'
            }`}
          >
            {onlySetups ? 'Setups Only' : 'All Symbols'}
          </button>
        </div>

        {/* Quick Pick Best A+ Trade Button */}
        {results.length > 0 && results[0]?.grade && (
          <button
            onClick={() => onSelectSymbol(results[0].symbol)}
            className="w-full py-1.5 px-2.5 bg-gradient-to-r from-emerald-600/30 to-blue-600/30 hover:from-emerald-600/40 hover:to-blue-600/40 border border-emerald-500/50 rounded flex items-center justify-between text-xs font-bold text-white transition cursor-pointer shadow-sm"
          >
            <div className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Top Setup:</span>
              <span className="font-mono text-emerald-300 font-bold">{results[0].symbol}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
              results[0].grade === 'A+' ? 'bg-emerald-500 text-black' : 'bg-blue-500 text-white'
            }`}>
              {results[0].grade} ({results[0].score} pts)
            </span>
          </button>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search symbol (e.g. RELIANCE, TCS)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a2232] border border-[#242e42] rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Sector Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => onSelectSector(sec)}
              className={`px-2 py-0.5 rounded whitespace-nowrap transition font-medium ${
                selectedSector.toUpperCase() === sec.toUpperCase()
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a2232] text-slate-400 hover:text-white border border-[#242e42]'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Stocks List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e2738]">
        {isLoading && results.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div>Scanning NSE F&O universe...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No matching stocks found.</div>
        ) : (
          filtered.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            const isPositive = stock.pct_change >= 0;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectSymbol(stock.symbol)}
                className={`p-3 cursor-pointer transition hover:bg-[#1a2232] ${
                  isSelected ? 'bg-[#1e2738] border-l-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                      stock.grade === 'A+'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : stock.grade === 'A'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : stock.grade === 'B'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-700/40 text-slate-400'
                    }`}>
                      {stock.grade || 'B'}
                    </span>
                    <span className="font-bold text-xs text-white">{stock.symbol}</span>
                    <span className="text-[10px] text-slate-400 px-1 py-0.2 rounded bg-[#161d2a] border border-[#242e42]">
                      {stock.sector}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-white">
                      ₹{stock.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div
                      className={`font-mono text-[11px] font-medium ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {stock.pct_change}%
                    </div>
                  </div>
                </div>

                {/* Setups Badges */}
                <div className="flex items-center flex-wrap gap-1 mt-1.5">
                  {stock.score !== undefined && stock.score > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {stock.score} pts
                    </span>
                  )}
                  {stock.orb_triggered && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                      <Target className="w-2.5 h-2.5 inline mr-0.5" />
                      15m ORB
                    </span>
                  )}
                  {stock.setups
                    .filter((s) => !s.includes('15m ORB'))
                    .map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      >
                        {s}
                      </span>
                    ))}
                  {stock.rsi && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      RSI {stock.rsi}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

