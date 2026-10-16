import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  queuedReportsCount?: number;
  onRefresh?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  queuedReportsCount = 0,
  onRefresh
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[400] max-w-sm flex items-center gap-3 px-3.5 py-2.5 bg-neutral-900/95 border border-amber-500/50 rounded-xl shadow-2xl backdrop-blur-md text-amber-200 text-xs animate-in slide-in-from-bottom-2 duration-300">
      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
        <WifiOff className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-amber-300 flex items-center gap-1.5">
          <span>Offline Operation Active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        </div>
        <div className="text-[11px] text-neutral-300 truncate">
          {queuedReportsCount > 0
            ? `${queuedReportsCount} incident report(s) saved locally`
            : 'Serving cached station telemetry & routes'}
        </div>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors shrink-0"
          title="Retry Network Connection"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
