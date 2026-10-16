import React, { useState } from 'react';
import { MapPin, Search, Navigation, Globe, Plus, Loader2, X, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { searchAnyLocation, GeocodedPlace } from '../../services/geocodingService';
import { createCustomCityLocation } from '../../services/airQualityService';
import { CityConfig } from '../../types';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCity: (city: CityConfig) => void;
}

const POPULAR_GLOBAL_HUBS: { name: string; country: string; coords: [number, number] }[] = [
  { name: 'Tokyo', country: 'Japan', coords: [35.6762, 139.6503] },
  { name: 'New York City', country: 'United States', coords: [40.7128, -74.006] },
  { name: 'London', country: 'United Kingdom', coords: [51.5074, -0.1278] },
  { name: 'Dubai', country: 'United Arab Emirates', coords: [25.2048, 55.2708] },
  { name: 'Paris', country: 'France', coords: [48.8566, 2.3522] },
  { name: 'Beijing', country: 'China', coords: [39.9042, 116.4074] },
  { name: 'Lucknow', country: 'India', coords: [26.8467, 80.9462] },
  { name: 'Patna', country: 'India', coords: [25.5941, 85.1376] }
];

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  isOpen,
  onClose,
  onAddCity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const results = await searchAnyLocation(searchQuery);
      if (results.length === 0) {
        setError('No locations found matching that query. Try a different city or enter "Latitude, Longitude" directly.');
      }
      setSearchResults(results);
    } catch {
      setError('Unable to reach geocoding service. Please check your connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = async (placeName: string, coords: [number, number], country = 'Global') => {
    setIsLoadingCity(true);
    setError(null);
    try {
      const newCity = await createCustomCityLocation(placeName, 'Custom Location', country, coords);
      onAddCity(newCity);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize air quality sensors for this location.');
    } finally {
      setIsLoadingCity(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsDetectingGps(false);
        const { latitude, longitude } = pos.coords;
        await handleSelectLocation('My Current Location', [latitude, longitude], 'GPS');
      },
      (err) => {
        setIsDetectingGps(false);
        setError(`GPS Location access denied or timed out (${err.message}). Enter location manually above.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Add Any Location Worldwide</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Global Live Telemetry
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Type any city, street address, or coordinates to monitor live air quality & plan clean routes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any city, neighborhood, or 'lat, lng'..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </form>

          {/* Quick GPS Action */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isDetectingGps || isLoadingCity}
            className="w-full py-2 px-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-emerald-500/40 rounded-lg text-emerald-400 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isDetectingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Use My Exact GPS Location</span>
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                <span>Search Results:</span>
                <span className="text-[10px] text-neutral-500">{searchResults.length} places found</span>
              </div>
              {searchResults.map((place, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectLocation(place.name, place.coords)}
                  className="p-2.5 bg-neutral-950/70 hover:bg-emerald-950/40 border border-neutral-800/80 hover:border-emerald-500/40 rounded-lg flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-white truncate text-xs group-hover:text-emerald-300">
                        {place.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {place.coords[0].toFixed(4)}, {place.coords[1].toFixed(4)} · {place.category}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded shrink-0 font-medium">
                    + Add
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Popular Global Hubs Chips */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2">
            <div className="text-[11px] font-semibold text-neutral-400">
              Popular Global Metros:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {POPULAR_GLOBAL_HUBS.map((hub) => (
                <button
                  key={hub.name}
                  type="button"
                  onClick={() => handleSelectLocation(hub.name, hub.coords, hub.country)}
                  disabled={isLoadingCity}
                  className="p-2 text-left bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="font-semibold text-white truncate text-[11px] group-hover:text-emerald-400">
                    {hub.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {hub.country}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingCity && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="font-semibold text-xs">Connecting Real-Time Air Quality Sensors...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
