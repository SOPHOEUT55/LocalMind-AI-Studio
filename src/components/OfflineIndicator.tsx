import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-2 text-xs font-medium shadow-xl">
      {!isOnline ? (
        <div className="flex items-center gap-2 text-amber-400">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Offline Mode Active · Operating 100% on Local Hardware</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Air-Gapped Privacy · Zero Outbound Telemetry</span>
        </div>
      )}
    </div>
  );
};
