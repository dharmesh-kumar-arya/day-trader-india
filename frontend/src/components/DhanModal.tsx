import React, { useState } from 'react';
import { DhanStatus } from '../types';
import { Key, ShieldCheck, AlertCircle, X, RotateCw } from 'lucide-react';

interface DhanModalProps {
  isOpen: boolean;
  onClose: () => void;
  dhanStatus: DhanStatus | null;
  onSaveCredentials: (clientId: string, accessToken: string) => Promise<void> | void;
}

export const DhanModal: React.FC<DhanModalProps> = ({
  isOpen,
  onClose,
  dhanStatus,
  onSaveCredentials,
}) => {
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!clientId.trim() || !accessToken.trim()) return;
    setIsSaving(true);
    try {
      await onSaveCredentials(clientId.trim(), accessToken.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 select-none">
      <div className="bg-[#161d2a] border border-[#242e42] rounded-xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">DhanHQ API Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status card */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
            dhanStatus?.connected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {dhanStatus?.connected ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold text-xs uppercase tracking-wide">
              {dhanStatus?.connected ? 'AUTHENTICATED & READY' : (dhanStatus?.status || 'NOT CONNECTED')}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              {dhanStatus?.message || 'Enter your Dhan Client ID and 24-hour Access Token to connect.'}
            </div>
            {dhanStatus?.connected && (
              <div className="font-mono text-[11px] text-emerald-400 font-bold mt-1.5 pt-1 border-t border-emerald-500/20">
                Live Available Margin: ₹{dhanStatus.available_margin_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Dhan Client ID (10 digits)
            </label>
            <input
              type="text"
              placeholder="e.g. 1111583916"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-[#101520] border border-[#242e42] rounded px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Dhan Access Token (JWT String)
            </label>
            <textarea
              rows={4}
              placeholder="Paste the daily Access Token from Dhan Web -> Profile -> DhanHQ & APIs..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full bg-[#101520] border border-[#242e42] rounded px-3 py-2 text-white font-mono text-[11px] placeholder-slate-600 focus:outline-none focus:border-blue-500 leading-tight"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              SEBI Security Rule: Dhan tokens expire every morning at 06:00 AM IST. Generate a fresh token from the Dhan portal daily.
            </p>
          </div>

          {/* IP Whitelist Info Box */}
          <div className="bg-[#101520] border border-[#242e42] rounded-lg p-2.5 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-amber-400">Dhan IP Whitelisting (DH-905 Fix):</span>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white text-[10px]">
                {dhanStatus?.public_ip || 'Detecting IP...'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              If order placement fails with <span className="text-rose-400 font-mono">DH-905: Invalid IP</span>, go to <span className="text-white font-medium">web.dhan.co &gt; Profile &gt; DhanHQ APIs &gt; IP Setup</span> and whitelist your public IP above, or generate the Access Token with IP restriction left blank.
            </p>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!clientId.trim() || !accessToken.trim() || isSaving}
            className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying with Dhan...</span>
              </>
            ) : (
              <span>Authenticate & Save</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
