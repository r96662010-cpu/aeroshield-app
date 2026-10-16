import React from 'react';
import { NavigationRoute, BypassAlert } from '../../types';
import { getAQIColor } from '../../services/airQualityService';
import { Volume2, VolumeX, ShieldCheck, AlertTriangle, Navigation, ArrowUpRight } from 'lucide-react';

interface TurnByTurnHUDProps {
  activeRoute: NavigationRoute;
  progressPct: number;
  activeAlert: BypassAlert | null;
  onBypassClick: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStop: () => void;
}

export const TurnByTurnHUD: React.FC<TurnByTurnHUDProps> = ({
  activeRoute,
  progressPct,
  activeAlert,
  onBypassClick,
  soundEnabled,
  onToggleSound,
  onStop
}) => {
  const currentDistKm = Math.max(
    0,
    Number((activeRoute.distanceKm * (1 - progressPct / 100)).toFixed(1))
  );
  const currentMins = Math.max(
    1,
    Math.round(activeRoute.durationMinutes * (1 - progressPct / 100))
  );
  const inhaledSoFar = Math.round(activeRoute.pm25Exposure * (progressPct / 100));

  return (
    <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-[500] space-y-2 pointer-events-auto">
      {/* Main HUD Card */}
      <div className="p-3.5 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-xl shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Navigation className="w-4 h-4 fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white block">{activeRoute.title}</span>
                <span
                  className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${
                    activeRoute.healthScore === 'Excellent'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : activeRoute.healthScore === 'Moderate'
                      ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {activeRoute.healthScore}
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">Turn-by-turn Guidance</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Proximity Chimes' : 'Enable Proximity Chimes'}
              className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onStop}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2.5 py-1 bg-rose-950/70 rounded border border-rose-500/40"
            >
              End
            </button>
          </div>
        </div>

        {/* Speed, Distance, Inhaled metrics */}
        <div className="grid grid-cols-3 gap-2 bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800 font-mono">
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Speed</span>
            <span className="font-bold text-white text-sm">38 km/h</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Remaining</span>
            <span className="font-bold text-white text-sm">{currentDistKm} km</span>
            <span className="text-[10px] text-neutral-400 block font-sans">({currentMins} min)</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Inhaled PM2.5</span>
            <span className="font-bold text-emerald-400 text-sm">{inhaledSoFar} µg</span>
          </div>
        </div>

        {/* Next step instruction */}
        <div className="flex items-center gap-2 text-xs text-neutral-200">
          <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">
            {progressPct < 40
              ? 'Continue straight along Green Ring Corridor'
              : progressPct < 80
              ? 'Keep right to avoid industrial bottleneck'
              : 'Approaching destination terminal'}
          </span>
        </div>
      </div>

      {/* Dynamic Proactive Warning Banner if near hotspot */}
      {activeAlert && (
        <div className="p-3 bg-red-950/95 backdrop-blur-md border border-red-500/80 rounded-xl shadow-2xl animate-bounce-subtle space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-red-200 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Severe Smog Zone in {(activeAlert.distanceMeters / 1000).toFixed(1)} km</span>
            </div>
            <span className="font-mono text-xs font-bold text-white bg-red-800 px-1.5 py-0.5 rounded">
              AQI {activeAlert.hotspotAqi}
            </span>
          </div>

          <p className="text-[11px] text-red-200 leading-tight">
            {activeAlert.hotspotName}: {activeAlert.cause}
          </p>

          <button
            onClick={onBypassClick}
            className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-md shadow-md flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Switch to Clean Bypass Route (+{activeAlert.timePenaltyMin}m)</span>
          </button>
        </div>
      )}
    </div>
  );
};
