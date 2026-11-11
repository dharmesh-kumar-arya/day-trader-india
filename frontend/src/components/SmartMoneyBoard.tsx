import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SmartMoneyBoardProps {
  flows: {
    fii_net_flow_cr: number;
    dii_net_flow_cr: number;
    total_institutional_net_cr: number;
    sentiment: string;
  } | null;
  bulkDeals: {
    symbol: string;
    client_name: string;
    deal_type: string;
    quantity: number;
    trade_price: number;
    equity_pct: number;
    time: string;
  }[];
}

export const SmartMoneyBoard: React.FC<SmartMoneyBoardProps> = ({ flows, bulkDeals }) => {
  return (
    <div className="h-full bg-[#121722] p-3 flex flex-col border-t border-[#242e42] select-none text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#242e42]">
        <div className="flex items-center space-x-2">
          <Landmark className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white uppercase tracking-wider">Smart Money & Bulk Deals</span>
        </div>
        {flows && (
          <div className="flex items-center space-x-3 text-[11px]">
            <div>
              <span className="text-slate-400">FII Net: </span>
              <span className={`font-mono font-bold ${flows.fii_net_flow_cr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {flows.fii_net_flow_cr >= 0 ? '+' : ''}₹{flows.fii_net_flow_cr.toLocaleString('en-IN')} Cr
              </span>
            </div>
            <div>
              <span className="text-slate-400">DII Net: </span>
              <span className={`font-mono font-bold ${flows.dii_net_flow_cr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {flows.dii_net_flow_cr >= 0 ? '+' : ''}₹{flows.dii_net_flow_cr.toLocaleString('en-IN')} Cr
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 text-[10px] border-b border-[#242e42]">
              <th className="pb-1">STOCK</th>
              <th className="pb-1">INSTITUTION</th>
              <th className="pb-1">ACTION</th>
              <th className="pb-1">QTY</th>
              <th className="pb-1">PRICE</th>
              <th className="pb-1 text-right">% EQUITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2738]">
            {bulkDeals.map((deal, idx) => (
              <tr key={idx} className="text-[11px] hover:bg-[#1a2232] transition">
                <td className="py-1.5 font-bold text-white">{deal.symbol}</td>
                <td className="py-1.5 text-slate-300 truncate max-w-[150px]">{deal.client_name}</td>
                <td className="py-1.5 font-bold">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      deal.deal_type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {deal.deal_type}
                  </span>
                </td>
                <td className="py-1.5 font-mono text-slate-300">{deal.quantity.toLocaleString('en-IN')}</td>
                <td className="py-1.5 font-mono text-white">₹{deal.trade_price}</td>
                <td className="py-1.5 font-mono text-right text-blue-400 font-semibold">{deal.equity_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

