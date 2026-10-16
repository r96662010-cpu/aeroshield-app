import React from 'react';
import { LiveAirQualityTelemetry } from '../../types';
import { getAQIColor, getAQILabel } from '../../services/airQualityService';
import { Wind, Droplets, Thermometer, RefreshCw, AlertCircle, Radio, Clock, ShieldCheck } from 'lucide-react';

interface LiveAQIWidgetProps {
  locationName: string;
  telemetry: LiveAirQualityTelemetry | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const LiveAQIWidget: React.FC<LiveAQIWidgetProps> = ({
  locationName,
  telemetry,
  isLoading,
  onRefresh
}) => {
  if (!telemetry && !isLoading) {
    return (
      <div className="bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-xl p-3 shadow-2xl max-w-xs text-xs text-neutral-300 space-y-2">
        <div className="flex items-center gap-2 text-rose-400 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Live air-quality data is temporarily unavailable.</span>
        </div>
        <p className="text-[11px] text-neutral-400">
          Telemetry network connection is pending or unreachable.
        </p>
        <button
          onClick={onRefresh}
          className="w-full py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const status = telemetry?.status || 'LIVE';
  const aqi = telemetry?.aqi ?? 0;
  const aqiColor = getAQIColor(aqi);

  return (
    <div className="bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-xl p-3.5 shadow-2xl w-full max-w-sm text-neutral-200 space-y-2.5 animate-fade-in pointer-events-auto">
      {/* Top Header: Location & Telemetry Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="truncate">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Atmospheric Telemetry
            </span>
          </div>
          <h3 className="text-sm font-bold text-white truncate max-w-[200px]" title={locationName}>
            {locationName}
          </h3>
        </div>

        {/* Status Pill: LIVE / STALE / OFFLINE / UNAVAILABLE */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'LIVE' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : status === 'STALE' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40">
              <Clock className="w-3 h-3" />
              STALE
            </span>
          ) : status === 'OFFLINE' ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-500/40">
              <Radio className="w-3 h-3" />
              CACHED
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/40">
              <AlertCircle className="w-3 h-3" />
              UNAVAILABLE
            </span>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Live Atmospheric Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main AQI Score Display */}
      {status === 'UNAVAILABLE' ? (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          Live air-quality data is temporarily unavailable. Atmospheric telemetry sensors could not be reached.
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-bold text-white shrink-0 shadow-lg"
            style={{ backgroundColor: aqiColor }}
          >
            <span className="text-xl leading-none">{aqi}</span>
            <span className="text-[9px] uppercase opacity-90">AQI</span>
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {getAQILabel(telemetry?.aqiCategory || 'moderate')}
            </div>
            <div className="text-[11px] text-neutral-400 leading-tight mt-0.5">
              {aqi <= 50 ? 'Clean, breathable air with minimal particulate risk.' :
               aqi <= 100 ? 'Moderate air; acceptable for most healthy adults.' :
               aqi <= 200 ? 'Unhealthy for sensitive individuals; mask recommended.' :
               aqi <= 300 ? 'Very unhealthy; high fine-dust accumulation.' :
               'Hazardous emergency; prioritize clean bypass corridors.'}
            </div>
          </div>
        </div>
      )}

      {/* Pollutants Matrix */}
      {status !== 'UNAVAILABLE' && telemetry && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1 border-t border-neutral-800/80 font-mono text-[10px]">
          <div className="bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
            <span className="text-neutral-500 block text-[9px]">PM2.5</span>
            <span className="font-bold text-neutral-200">{telemetry.pm25} µg/m³</span>
          </div>
          <div className="bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
            <span className="text-neutral-500 block text-[9px]">PM10</span>
            <span className="font-bold text-neutral-200">{telemetry.pm10} µg/m³</span>
          </div>
          <div className="bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
            <span className="text-neutral-500 block text-[9px]">NO2</span>
            <span className="font-bold text-neutral-200">{telemetry.no2} ppb</span>
          </div>
          <div className="bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
            <span className="text-neutral-500 block text-[9px]">O3</span>
            <span className="font-bold text-neutral-200">{telemetry.o3} µg/m³</span>
          </div>
          <div className="bg-neutral-900/80 p-1.5 rounded border border-neutral-800">
            <span className="text-neutral-500 block text-[9px]">CO</span>
            <span className="font-bold text-neutral-200">{telemetry.co ?? 0.8} mg/m³</span>
          </div>
        </div>
      )}

      {/* Meteorology row (Temp, Humidity, Wind) */}
      {status !== 'UNAVAILABLE' && telemetry && (
        <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 pt-1 font-mono">
          {telemetry.temperature !== undefined && (
            <div className="flex items-center gap-1" title="Ambient Temperature">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span>{telemetry.temperature}°C</span>
            </div>
          )}
          {telemetry.humidity !== undefined && (
            <div className="flex items-center gap-1" title="Relative Humidity">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>{telemetry.humidity}%</span>
            </div>
          )}
          {telemetry.windSpeed !== undefined && (
            <div className="flex items-center gap-1" title="Wind Velocity">
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
              <span>{telemetry.windSpeed} km/h</span>
            </div>
          )}
        </div>
      )}

      {/* Footer: Source & Timestamp */}
      <div className="text-[10px] text-neutral-500 flex items-center justify-between border-t border-neutral-800/80 pt-1.5">
        <span className="truncate max-w-[170px]" title={telemetry?.source || 'Open-Meteo'}>
          {telemetry?.source || 'Open-Meteo Atmospheric Feed'}
        </span>
        <span className="shrink-0 font-mono">
          {telemetry?.timestamp || 'Just now'}
        </span>
      </div>
    </div>
  );
};
