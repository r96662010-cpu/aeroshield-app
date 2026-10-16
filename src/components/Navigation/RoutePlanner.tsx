import React, { useState, useMemo, useEffect } from 'react';
import {
  NavigationRoute,
  RouteStrategy,
  CityConfig,
  BypassAlert,
  HotspotZone,
  TransportMode,
  SavedCommute
} from '../../types';
import { getAQIColor, getAQIBadgeBg } from '../../services/airQualityService';
import { searchAnyLocation, GeocodedPlace } from '../../services/geocodingService';
import { Language, TRANSLATIONS } from '../../data/translations';
import {
  Navigation,
  Compass,
  Wind,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
  Zap,
  Repeat,
  Car,
  Bike,
  Bus,
  Footprints,
  Shield,
  HeartPulse,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Plus,
  Flame,
  Search,
  MapPin,
  TrendingDown
} from 'lucide-react';

interface RoutePlannerProps {
  city: CityConfig;
  language: Language;
  routes: NavigationRoute[];
  selectedRouteId: RouteStrategy;
  onSelectRoute: (id: RouteStrategy) => void;
  onCalculateRoutes: (startCoords: [number, number], endCoords: [number, number], mode?: TransportMode) => void;
  activeBypassAlert: BypassAlert | null;
  onTriggerBypass: () => void;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  simulationProgressPct: number;
  currentMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  onOpenGeminiAI?: () => void;
  onOpenReportModal?: () => void;
  savedCommutes?: SavedCommute[];
  onSaveCurrentCommute?: (name: string, route: NavigationRoute) => void;
  onDeleteSavedCommute?: (id: string) => void;
  totalSavedPm25Mg?: number;
  totalTripsCompleted?: number;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  city,
  language,
  routes,
  selectedRouteId,
  onSelectRoute,
  onCalculateRoutes,
  activeBypassAlert,
  onTriggerBypass,
  isSimulating,
  onStartSimulation,
  onStopSimulation,
  simulationProgressPct,
  currentMode,
  onSelectMode,
  onOpenGeminiAI,
  onOpenReportModal,
  savedCommutes = [],
  onSaveCurrentCommute,
  onDeleteSavedCommute,
  totalSavedPm25Mg = 1420,
  totalTripsCompleted = 8
}) => {
  const t = TRANSLATIONS[language];

  const [activeSubTab, setActiveSubTab] = useState<'routes' | 'saved'>('routes');

  // Start & Dest search & coordinates
  const initialStartName = (city.popularPlaces && city.popularPlaces[0]?.name) || city.stations[0]?.name || 'Origin';
  const initialDestName = (city.popularPlaces && city.popularPlaces[1]?.name) || city.stations[1]?.name || 'Destination';
  const initialStartCoords: [number, number] = city.defaultStart || (city.popularPlaces && city.popularPlaces[0]?.coords) || city.center;
  const initialDestCoords: [number, number] = city.defaultDest || (city.popularPlaces && city.popularPlaces[1]?.coords) || [city.center[0] + 0.03, city.center[1] + 0.03];

  const [startPlaceName, setStartPlaceName] = useState(initialStartName);
  const [destPlaceName, setDestPlaceName] = useState(initialDestName);
  const [startCoords, setStartCoords] = useState<[number, number]>(initialStartCoords);
  const [destCoords, setDestCoords] = useState<[number, number]>(initialDestCoords);

  const [showSearchModal, setShowSearchModal] = useState<'start' | 'dest' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [externalResults, setExternalResults] = useState<GeocodedPlace[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);

  // Sync when active city changes
  useEffect(() => {
    const sName = (city.popularPlaces && city.popularPlaces[0]?.name) || city.stations[0]?.name || `${city.name} Central`;
    const dName = (city.popularPlaces && city.popularPlaces[1]?.name) || city.stations[1]?.name || `${city.name} Corridor`;
    const sCoords: [number, number] = city.defaultStart || (city.popularPlaces && city.popularPlaces[0]?.coords) || city.center;
    const dCoords: [number, number] = city.defaultDest || (city.popularPlaces && city.popularPlaces[1]?.coords) || [city.center[0] + 0.03, city.center[1] + 0.03];

    setStartPlaceName(sName);
    setDestPlaceName(dName);
    setStartCoords(sCoords);
    setDestCoords(dCoords);
    onCalculateRoutes(sCoords, dCoords, currentMode);
  }, [city.id]);

  // Live geocoding search for ANY custom location or address
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setExternalResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingExternal(true);
      try {
        const res = await searchAnyLocation(searchQuery, city.name);
        setExternalResults(res);
      } catch {
        setExternalResults([]);
      } finally {
        setIsSearchingExternal(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, city.name]);

  // Save commute state
  const [isSavingCommute, setIsSavingCommute] = useState(false);
  const [saveCommuteName, setSaveCommuteName] = useState('');

  // Combined searchable places (popular landmarks + AQI monitoring stations)
  const allSearchablePlaces = useMemo(() => {
    const fromPopular = (city.popularPlaces || []).map((p) => ({
      name: p.name,
      category: p.category,
      coords: p.coords,
      isStation: false,
      aqi: undefined
    }));

    const fromStations = (city.stations || []).map((s) => ({
      name: s.name,
      category: `${s.sensorType} Monitoring Station`,
      coords: s.location,
      isStation: true,
      aqi: s.aqi
    }));

    return [...fromPopular, ...fromStations];
  }, [city]);

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return allSearchablePlaces.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return allSearchablePlaces.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [allSearchablePlaces, searchQuery]);

  const handleSelectPlace = (place: { name: string; coords: [number, number] }) => {
    if (showSearchModal === 'start') {
      setStartPlaceName(place.name);
      setStartCoords(place.coords);
      onCalculateRoutes(place.coords, destCoords, currentMode);
    } else if (showSearchModal === 'dest') {
      setDestPlaceName(place.name);
      setDestCoords(place.coords);
      onCalculateRoutes(startCoords, place.coords, currentMode);
    }
    setShowSearchModal(null);
    setSearchQuery('');
    setExternalResults([]);
  };

  const handleRecalculate = (modeToUse = currentMode) => {
    onCalculateRoutes(startCoords, destCoords, modeToUse);
  };

  const handleModeChange = (newMode: TransportMode) => {
    onSelectMode(newMode);
    onCalculateRoutes(startCoords, destCoords, newMode);
  };

  const handleSwap = () => {
    const tempName = startPlaceName;
    const tempCoords = startCoords;
    setStartPlaceName(destPlaceName);
    setStartCoords(destCoords);
    setDestPlaceName(tempName);
    setDestCoords(tempCoords);
    onCalculateRoutes(destCoords, tempCoords, currentMode);
  };

  const handleSaveCurrentCommute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveCommuteName.trim() || !onSaveCurrentCommute) return;
    const currentSelected = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (currentSelected) {
      onSaveCurrentCommute(saveCommuteName.trim(), currentSelected);
      setSaveCommuteName('');
      setIsSavingCommute(false);
      setActiveSubTab('saved');
    }
  };

  const handleLoadSavedCommute = (commute: SavedCommute) => {
    setStartPlaceName(commute.startName);
    setDestPlaceName(commute.destName);
    onSelectMode(commute.mode);
    onCalculateRoutes(commute.startCoords, commute.destCoords, commute.mode);
    setActiveSubTab('routes');
  };

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 overflow-y-auto">
      {/* Header & Quick Action Buttons */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-950/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">{t.routePlanner}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Citizen Smog Report Trigger */}
            {onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-300 bg-red-950/80 border border-red-500/40 rounded hover:bg-red-900/90 transition-colors"
                title="Report open waste burning, construction dust, or smog violation"
              >
                <Flame className="w-3 h-3 text-red-400" />
                <span className="hidden sm:inline">Report Smog</span>
              </button>
            )}

            {/* Smart Eco Advisor Trigger */}
            {onOpenGeminiAI && (
              <button
                onClick={onOpenGeminiAI}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 rounded hover:bg-emerald-900 transition-colors"
                title="AeroShield Smart Route & Health Advisor"
              >
                <Sparkles className="w-3 h-3 fill-emerald-400" />
                <span>Eco Advisor</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tabs: Route Corridors vs Saved Commutes */}
        <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2">
          <button
            onClick={() => setActiveSubTab('routes')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'routes'
                ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Corridors</span>
          </button>

          <button
            onClick={() => setActiveSubTab('saved')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'saved'
                ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Commutes ({savedCommutes.length})</span>
          </button>
        </div>

        {activeSubTab === 'routes' && (
          <>
            {/* Transport Mode Selector (Car, Bike, Bus, Walk) */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-400 font-medium block">Travel Mode</span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
                <button
                  onClick={() => handleModeChange('car')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    currentMode === 'car'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Automobile (Cabin filtered air)"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Car</span>
                </button>
                <button
                  onClick={() => handleModeChange('bike')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    currentMode === 'bike'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Two-Wheeler / Motorcycle (Direct ambient air)"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Bike</span>
                </button>
                <button
                  onClick={() => handleModeChange('bus')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    currentMode === 'bus'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Public Transit Bus"
                >
                  <Bus className="w-3.5 h-3.5" />
                  <span>Bus</span>
                </button>
                <button
                  onClick={() => handleModeChange('walk')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    currentMode === 'walk'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Walking / Pedestrian"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Walk</span>
                </button>
              </div>
            </div>

            {/* Origin & Destination pickers with Search trigger */}
            <div className="space-y-2 relative pt-1">
              <div>
                <label className="text-[10px] text-neutral-400 font-medium block mb-1">
                  {t.origin}
                </label>
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => setShowSearchModal('start')}
                    className="flex-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">{startPlaceName}</span>
                    <Search className="w-3 h-3 text-neutral-500 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Swap icon */}
              <button
                onClick={handleSwap}
                title="Swap Origin and Destination"
                className="absolute right-2 top-10 p-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition-colors z-10"
              >
                <Repeat className="w-3 h-3" />
              </button>

              <div>
                <label className="text-[10px] text-neutral-400 font-medium block mb-1">
                  {t.destination}
                </label>
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => setShowSearchModal('dest')}
                    className="flex-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">{destPlaceName}</span>
                    <Search className="w-3 h-3 text-neutral-500 shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* SEARCH OVERLAY MODAL */}
      {showSearchModal && (
        <div className="p-3 bg-neutral-950 border-b border-neutral-800 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200">
              Select {showSearchModal === 'start' ? 'Origin' : 'Destination'} Point
            </span>
            <button
              onClick={() => {
                setShowSearchModal(null);
                setSearchQuery('');
              }}
              className="text-[11px] text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any landmark, street, city or 'lat, lng'..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {/* External / Global live geocoding results */}
            {externalResults.length > 0 && (
              <div className="pb-1 border-b border-neutral-800 mb-1">
                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 block">
                  Global Locations Found ({externalResults.length})
                </span>
                {externalResults.map((place, idx) => (
                  <div
                    key={`ext-${idx}`}
                    onClick={() => handleSelectPlace(place)}
                    className="p-2 rounded hover:bg-emerald-950/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-white font-medium block truncate">{place.name}</span>
                        <span className="text-[10px] text-neutral-400">{place.category} · {place.coords[0].toFixed(3)}, {place.coords[1].toFixed(3)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 shrink-0 font-medium">Select</span>
                  </div>
                ))}
              </div>
            )}

            {/* Local landmark / station results */}
            <span className="text-[10px] text-neutral-400 font-semibold px-2 py-0.5 block">
              Regional Stations & Landmarks:
            </span>
            {filteredPlaces.map((place) => (
              <div
                key={place.name}
                onClick={() => handleSelectPlace(place)}
                className="p-2 rounded hover:bg-neutral-800/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-neutral-200 font-medium block truncate">{place.name}</span>
                    <span className="text-[10px] text-neutral-500">{place.category}</span>
                  </div>
                </div>
                {place.isStation && place.aqi && (
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0"
                    style={{ backgroundColor: getAQIColor(place.aqi) }}
                  >
                    AQI {place.aqi}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SAVED COMMUTES & PERSONAL EXPOSURE DASHBOARD */}
      {activeSubTab === 'saved' && (
        <div className="p-4 space-y-4 flex-1">
          {/* Cumulative Savings Summary Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 fill-emerald-400" />
                <span>Personal Exposure Savings</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                AeroShield Commuter
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">PM2.5 Inhalation Avoided</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums">
                  {totalSavedPm25Mg} µg
                </span>
              </div>
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block">Clean Bypass Trips</span>
                <span className="text-base font-bold text-white tabular-nums">
                  {totalTripsCompleted}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              By selecting clean air bypass corridors, your average respiratory exposure is 38% lower than standard arterial traffic routes.
            </p>
          </div>

          {/* Saved Commutes List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold px-0.5">
              <span>Saved Daily Routes</span>
              <span className="text-[10px] text-neutral-500">1-Click Fast Navigation</span>
            </div>

            {savedCommutes.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl space-y-1.5">
                <Bookmark className="w-6 h-6 text-neutral-600 mx-auto" />
                <p className="font-semibold text-neutral-400">No saved routes yet</p>
                <p className="text-[11px]">Save frequent commutes like Home ➔ Work to track exposure and bypass smog hotspots.</p>
              </div>
            ) : (
              savedCommutes.map((commute) => (
                <div
                  key={commute.id}
                  className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{commute.name}</span>
                      <span className="text-[10px] text-neutral-400">
                        {commute.startName} ➔ {commute.destName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {onDeleteSavedCommute && (
                        <button
                          onClick={() => onDeleteSavedCommute(commute.id)}
                          className="p-1 text-neutral-500 hover:text-red-400 transition-colors rounded"
                          title="Delete saved route"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px]">
                    <span className="text-emerald-400 font-mono font-semibold">
                      -{commute.exposureSavingsPct}% Exposure
                    </span>
                    <button
                      onClick={() => handleLoadSavedCommute(commute)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Start Route</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CORRIDOR EXPLORER VIEW */}
      {activeSubTab === 'routes' && (
        <>
          {/* Proactive Real-Time Bypass Alert Banner */}
          {activeBypassAlert && (
            <div className="m-3 p-3.5 rounded-lg bg-red-950/80 border border-red-500/60 shadow-lg animate-pulse-subtle">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-red-900/70 text-red-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-red-200">
                      {t.warningAhead}
                    </span>
                    <span className="font-mono text-sm font-bold text-red-300">
                      {(activeBypassAlert.distanceMeters / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <p className="text-xs text-red-300 leading-snug">
                    Approaching <span className="font-semibold text-white">{activeBypassAlert.hotspotName}</span>. Current AQI is{' '}
                    <span className="font-mono font-bold text-white bg-red-900 px-1.5 py-0.5 rounded text-xs">
                      {activeBypassAlert.hotspotAqi}
                    </span>.
                  </p>
                  <div className="text-[11px] text-red-400 font-medium">
                    {t.reasonForWarning}: {activeBypassAlert.cause}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-neutral-300">
                      Alternative bypass: +{activeBypassAlert.timePenaltyMin} min · -{activeBypassAlert.exposureReductionPct}% exposure
                    </span>
                    <button
                      onClick={onTriggerBypass}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-md shadow-md transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.bypassAreaButton}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route Options Comparison Cards */}
          <div className="p-4 space-y-3 flex-1">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold px-0.5">
              <span>Evaluated Navigation Corridors</span>
              {/* Quick Save current route button */}
              {onSaveCurrentCommute && (
                <button
                  onClick={() => setIsSavingCommute(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Save Route</span>
                </button>
              )}
            </div>

            {/* Save commute inline input if open */}
            {isSavingCommute && (
              <form onSubmit={handleSaveCurrentCommute} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-white block">Save Route to Daily Commutes</span>
                <input
                  type="text"
                  autoFocus
                  required
                  value={saveCommuteName}
                  onChange={(e) => setSaveCommuteName(e.target.value)}
                  placeholder="e.g. Daily Office Clean Commute"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSavingCommute(false)}
                    className="text-[11px] text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const aqiColor = getAQIColor(route.avgAqi);
                const isRecommended = route.isRecommended;

                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRoute(route.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${
                      isRecommended
                        ? isSelected
                          ? 'border-2 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.22)] bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900'
                          : 'border-2 border-emerald-600/70 bg-gradient-to-br from-emerald-950/25 via-neutral-900 to-neutral-900 hover:border-emerald-500'
                        : isSelected
                        ? 'bg-neutral-850 border-neutral-600 shadow-md'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                    }`}
                  >
                    {/* Prominent Recommended Banner */}
                    {isRecommended && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-emerald-500/25">
                        <span className="bg-emerald-500 text-neutral-950 font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-neutral-950" />
                          <span>Recommended Route</span>
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-400">
                          Lowest Inhaled Particulates
                        </span>
                      </div>
                    )}

                    {/* Header row: Title + Health Score + AQI badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-tight">{route.title}</span>
                          {/* Health Score Badge */}
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                              route.healthScore === 'Excellent'
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                                : route.healthScore === 'Moderate'
                                ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50'
                                : 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                            }`}
                          >
                            <HeartPulse className="w-3 h-3" />
                            <span>Health: {route.healthScore}</span>
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-snug">
                          {route.subtitle}
                        </p>
                      </div>

                      {/* Enlarged Average AQI Badge */}
                      <div
                        className="font-mono text-sm font-bold px-2.5 py-1 rounded-md text-white shadow-md shrink-0 flex flex-col items-center leading-tight"
                        style={{ backgroundColor: aqiColor }}
                      >
                        <span className="text-[9px] uppercase tracking-wider opacity-80">Avg</span>
                        <span>AQI {route.avgAqi}</span>
                      </div>
                    </div>

                    {/* Metrics Grid with Increased Text Size */}
                    <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-neutral-800 font-mono">
                      <div className="bg-neutral-950/50 p-1.5 rounded border border-neutral-800/60">
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Distance</span>
                        <span className="text-sm font-bold text-white tabular-nums">{route.distanceKm} km</span>
                      </div>
                      <div className="bg-neutral-950/50 p-1.5 rounded border border-neutral-800/60">
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Duration</span>
                        <span className="text-sm font-bold text-white tabular-nums">{route.durationMinutes} min</span>
                      </div>
                      <div className="bg-neutral-950/50 p-1.5 rounded border border-neutral-800/60">
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Peak AQI</span>
                        <span className="text-sm font-bold text-rose-400 tabular-nums">{route.maxAqi}</span>
                      </div>
                      <div className="bg-neutral-950/50 p-1.5 rounded border border-neutral-800/60">
                        <span className="text-neutral-500 block text-[9px] uppercase tracking-wide">Est. PM2.5 Inhaled</span>
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">{route.pm25Exposure} µg</span>
                      </div>
                    </div>

                    {/* Exposure Reduction Highlight */}
                    {route.exposureReductionPct && route.exposureReductionPct > 0 ? (
                      <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 fill-emerald-400" />
                          <span>-{route.exposureReductionPct}% PM2.5 Inhaled Exposure</span>
                        </span>
                        <span className="text-neutral-400 font-mono text-[11px]">
                          +{route.timeDeltaMin} min trade-off
                        </span>
                      </div>
                    ) : null}

                    {/* Hotspot warning if applicable */}
                    {route.intersectsHotspots.length > 0 && (
                      <div className="mt-2 text-xs text-amber-400/90 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          Passes near: {route.intersectsHotspots.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scientific calculation estimate notice */}
            <p className="text-[10px] text-neutral-500 text-center italic pt-1">
              * Pollution exposure and inhalation reductions are modeled estimates based on local sensor density and transit speed.
            </p>
          </div>

          {/* Live Simulation & Navigation Footer */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 space-y-3">
            {isSimulating ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Active Journey Simulation</span>
                  </span>
                  <span className="font-mono text-neutral-400">{simulationProgressPct}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${simulationProgressPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onStopSimulation}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-md border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t.stopNavigation}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onStartSimulation}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{t.startNavigation}</span>
              </button>
            )}

            <div className="text-[10px] text-neutral-500 text-center leading-relaxed">
              Air quality data aggregated continuously from open CAAQMS sensor telemetry.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
