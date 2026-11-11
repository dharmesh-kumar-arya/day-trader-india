import React, { useState } from 'react';
import { Bell, BellRing, Shield, Zap, X, CheckCircle2, Play, Radio } from 'lucide-react';
import { testNativeTradeNotification, startBackgroundMonitoring, stopBackgroundMonitoring } from '../services/nativeService';
import { Capacitor } from '@capacitor/core';

interface NativeAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  currentPrice?: number;
}

export const NativeAlertsModal: React.FC<NativeAlertsModalProps> = ({
  isOpen,
  onClose,
  selectedSymbol,
  currentPrice = 1335.40,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  if (!isOpen) return null;

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await testNativeTradeNotification(selectedSymbol, currentPrice);
      setTestResult('Native trade notification triggered! Check your notification bar.');
      setTimeout(() => setTestResult(null), 4000);
    } catch (err: any) {
      setTestResult(`Error: ${err.message || 'Failed to send alert'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleBackground = async () => {
    if (isAndroid) {
      await startBackgroundMonitoring();
      setTestResult('Background monitoring service refreshed.');
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#121722] border border-[#242e42] rounded-2xl w-full max-w-md p-5 text-slate-100 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              Native Alerts & Background Engine
            </h2>
            <p className="text-xs text-slate-400">
              {isAndroid ? 'Android Background Process Active' : 'Native Notification Engine'}
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3 mb-5">
          <div className="bg-[#1a2232] border border-[#242e42] rounded-xl p-3 flex items-start space-x-3">
            <Radio className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 animate-pulse" />
            <div className="text-xs">
              <span className="font-semibold text-white block">24/7 Foreground Service</span>
              <span className="text-slate-400 leading-relaxed">
                Prevents Android from freezing WebSockets or killing background processes when the app is minimized or screen is locked.
              </span>
            </div>
          </div>

          <div className="bg-[#1a2232] border border-[#242e42] rounded-xl p-3 flex items-start space-x-3">
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-white block">Heads-up Trade Signals</span>
              <span className="text-slate-400 leading-relaxed">
                Sends high-priority notifications with vibration whenever an ORB breakout or top conviction setup triggers. Tapping takes you straight to the trade desk.
              </span>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {testResult && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleTestAlert}
            disabled={isTesting}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isTesting ? 'Sending Alert...' : `Test Native Alert (${selectedSymbol})`}</span>
          </button>

          {isAndroid && (
            <button
              onClick={handleToggleBackground}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-[#1a2232] hover:bg-[#242e42] text-slate-300 border border-[#242e42] transition cursor-pointer"
            >
              Restart Background Service
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

