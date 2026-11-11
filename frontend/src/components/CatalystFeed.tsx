import React from 'react';
import { Newspaper, BellRing } from 'lucide-react';

interface CatalystFeedProps {
  announcements: {
    symbol: string;
    title: string;
    category: string;
    time: string;
    impact: string;
  }[];
}

export const CatalystFeed: React.FC<CatalystFeedProps> = ({ announcements }) => {
  return (
    <div className="h-full bg-[#121722] p-3 flex flex-col border-t border-[#242e42] select-none text-xs">
      <div className="flex items-center space-x-2 pb-2 border-b border-[#242e42]">
        <Newspaper className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-white uppercase tracking-wider">Corporate Announcements & Catalysts</span>
      </div>

      <div className="flex-1 overflow-y-auto mt-2 space-y-2">
        {announcements.map((item, idx) => (
          <div key={idx} className="p-2 rounded bg-[#1a2232] border border-[#242e42] hover:border-slate-600 transition">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white">{item.symbol}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                  {item.category}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

