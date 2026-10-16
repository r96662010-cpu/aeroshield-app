import React, { useState } from 'react';
import { PollutionStation, CityConfig } from '../../types';
import { getAQIColor, getAQISeverity, getAQILabel } from '../../services/airQualityService';
import { Language, TRANSLATIONS } from '../../data/translations';
import { Search, Filter, ArrowUpDown, MapPin, Radio, Activity } from 'lucide-react';

interface StationGridViewProps {
  city: CityConfig;
  language: Language;
  onSelectStation: (station: PollutionStation) => void;
}

export const StationGridView: React.FC<StationGridViewProps> = ({
  city,
  language,
  onSelectStation
}) => {
  const t = TRANSLATIONS[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'aqi_desc' | 'aqi_asc' | 'name'>('aqi_desc');

  const filteredStations = city.stations
    .filter((st) => {
      const matchSearch =
        st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.areaType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchArea = areaFilter === 'all' || st.areaType === areaFilter;
      return matchSearch && matchArea;
    })
    .sort((a, b) => {
      if (sortBy === 'aqi_desc') return b.aqi - a.aqi;
      if (sortBy === 'aqi_asc') return a.aqi - b.aqi;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {t.allStations}
          </h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
            <span>{city.name}</span>
            <span aria-hidden="true">·</span>
            <span>{city.stations.length} Monitored Points</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Sensor Telemetry</span>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 w-52"
            />
          </div>

          <select
            value={areaFilter}
            aria-label="Filter by Area Type"
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none"
          >
            <option value="all">All Area Types</option>
            <option value="industrial">Industrial</option>
            <option value="traffic-hub">Traffic Hub</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
          </select>

          <select
            value={sortBy}
            aria-label="Sort Stations By"
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none"
          >
            <option value="aqi_desc">Sort: Highest AQI</option>
            <option value="aqi_asc">Sort: Lowest AQI</option>
            <option value="name">Sort: Station Name</option>
          </select>
        </div>
      </div>

      {/* High-density Station Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStations.map((station) => {
          const color = getAQIColor(station.aqi);
          const sev = getAQISeverity(station.aqi);

          return (
            <div
              key={station.id}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                {/* Station Title & AQI Badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {station.name}
                    </h3>
                    {/* Zero-pill metadata */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                      <span className="capitalize">{station.areaType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{station.sensorType}</span>
                    </div>
                  </div>

                  <div
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded text-white shadow-sm shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    AQI {station.aqi}
                  </div>
                </div>

                {/* Pollutant Matrix */}
                <div className="grid grid-cols-3 gap-2 bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80 font-mono text-[10px] mt-3">
                  <div>
                    <span className="text-neutral-500 block text-[9px]">PM2.5</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{station.pm25} µg</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">PM10</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{station.pm10} µg</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">NO2</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{station.no2} ppb</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">SO2</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{station.so2} ppb</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">CO</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{station.co} mg</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">O3</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{station.o3} µg</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Online · {station.lastUpdated}</span>
                </div>

                <button
                  onClick={() => onSelectStation(station)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View Map</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStations.length === 0 && (
        <div className="p-8 text-center bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
          <p className="text-sm text-neutral-300">No monitoring stations match your search filters.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setAreaFilter('all');
            }}
            className="text-xs text-emerald-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
