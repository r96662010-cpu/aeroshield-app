import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PollutionStation, HotspotZone, NavigationRoute, LiveAirQualityTelemetry } from '../../types';
import { getAQIColor, getAQISeverity, getAQILabel } from '../../services/airQualityService';
import { LiveAQIWidget } from './LiveAQIWidget';
import { Layers, Locate, AlertTriangle, ShieldCheck, Moon, Sun } from 'lucide-react';

interface LivePollutionMapProps {
  center: [number, number];
  zoom: number;
  stations: PollutionStation[];
  hotspots: HotspotZone[];
  activeRoute: NavigationRoute | null;
  allRoutes?: NavigationRoute[];
  onSelectRoute?: (routeId: 'fastest' | 'cleanest' | 'balanced') => void;
  simulatedVehiclePos?: [number, number] | null;
  onStationClick?: (station: PollutionStation) => void;
  telemetry?: LiveAirQualityTelemetry | null;
  cityName?: string;
  isLoadingTelemetry?: boolean;
  onRefreshTelemetry?: () => void;
}

export const LivePollutionMap: React.FC<LivePollutionMapProps> = ({
  center,
  zoom,
  stations,
  hotspots,
  activeRoute,
  allRoutes = [],
  onSelectRoute,
  simulatedVehiclePos,
  onStationClick,
  telemetry,
  cityName,
  isLoadingTelemetry = false,
  onRefreshTelemetry
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups to manage rendering
  const stationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const hotspotsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const routesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const vehicleLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Toggles
  const [showStations, setShowStations] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showHeatBuffer, setShowHeatBuffer] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true
      });

      // Free OpenStreetMap Tile Layer (100% Free, No API Key Required, Zero Watermarks)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add our layer groups
      stationsLayerRef.current.addTo(map);
      hotspotsLayerRef.current.addTo(map);
      routesLayerRef.current.addTo(map);
      vehicleLayerRef.current.addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(center, zoom);
    }

    return () => {
      // Keep instance alive during fast re-renders
    };
  }, [center, zoom]);

  // Update Stations
  useEffect(() => {
    const layer = stationsLayerRef.current;
    layer.clearLayers();

    if (!showStations) return;

    stations.forEach((st) => {
      const color = getAQIColor(st.aqi);
      const isSevere = st.aqi >= 300;

      // Custom HTML Marker showing AQI figure directly
      const html = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          ${isSevere ? `<div class="absolute w-8 h-8 rounded-full animate-ping opacity-30" style="background-color: ${color}"></div>` : ''}
          <div class="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-white shadow-lg border border-white/20 transition-transform group-hover:scale-125" style="background-color: ${color};">
            ${st.aqi}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: 'aqi-station-marker',
        iconSize: [24, 24]
      });

      const marker = L.marker(st.location, { icon: customIcon });

      const popupHtml = `
        <div class="p-2 text-xs text-neutral-100 min-w-[210px]">
          <div class="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1.5 mb-2">
            <span class="font-bold text-neutral-100 text-sm truncate">${st.name}</span>
            <span class="font-mono px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${color}">
              AQI ${st.aqi}
            </span>
          </div>
          <div class="text-[11px] text-neutral-400 mb-2">
            ${st.sensorType} · ${st.areaType} · <span class="text-neutral-500">${st.lastUpdated}</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5 bg-neutral-900/80 p-2 rounded border border-neutral-800 font-mono text-[10px]">
            <div><span class="text-neutral-500 block">PM2.5</span><span class="font-semibold text-neutral-200">${st.pm25} µg</span></div>
            <div><span class="text-neutral-500 block">PM10</span><span class="font-semibold text-neutral-200">${st.pm10} µg</span></div>
            <div><span class="text-neutral-500 block">NO2</span><span class="font-semibold text-neutral-200">${st.no2} ppb</span></div>
            <div><span class="text-neutral-500 block">SO2</span><span class="font-semibold text-neutral-200">${st.so2} ppb</span></div>
            <div><span class="text-neutral-500 block">CO</span><span class="font-semibold text-neutral-200">${st.co} mg</span></div>
            <div><span class="text-neutral-500 block">O3</span><span class="font-semibold text-neutral-200">${st.o3} µg</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        if (onStationClick) onStationClick(st);
      });

      layer.addLayer(marker);
    });
  }, [stations, showStations, onStationClick]);

  // Update Hotspots
  useEffect(() => {
    const layer = hotspotsLayerRef.current;
    layer.clearLayers();

    if (!showHotspots) return;

    hotspots.forEach((hs) => {
      const color = getAQIColor(hs.aqi);

      // Core Hotspot Circle
      const circle = L.circle(hs.center, {
        radius: hs.radiusMeters,
        color: color,
        weight: 1.5,
        dashArray: hs.containmentActive ? '4, 4' : undefined,
        fillColor: color,
        fillOpacity: showHeatBuffer ? 0.22 : 0.12
      });

      // Inner intense core
      const innerCore = L.circle(hs.center, {
        radius: hs.radiusMeters * 0.4,
        color: color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.35
      });

      const popupHtml = `
        <div class="p-2 text-xs text-neutral-100 min-w-[230px]">
          <div class="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
            <span class="font-bold text-neutral-100 truncate">${hs.name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded text-white font-bold" style="background-color: ${color}">
              AQI ${hs.aqi}
            </span>
          </div>
          <div class="space-y-1.5 text-neutral-300 text-[11px]">
            <p><span class="text-neutral-500">Severity:</span> <span class="capitalize text-white font-medium">${getAQILabel(hs.severity)}</span></p>
            <p><span class="text-neutral-500">Cause:</span> ${hs.cause}</p>
            <p class="text-amber-400 font-medium">⚠ ${hs.advisory}</p>
            <div class="pt-1 flex items-center justify-between text-[10px] text-neutral-400 border-t border-neutral-800/60">
              <span>Containment: ${hs.containmentActive ? 'Active Water Spraying' : 'Normal'}</span>
              <span>${hs.reportedAt}</span>
            </div>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      layer.addLayer(circle);
      layer.addLayer(innerCore);
    });
  }, [hotspots, showHotspots, showHeatBuffer]);

  // Update Routes
  useEffect(() => {
    const layer = routesLayerRef.current;
    layer.clearLayers();

    if (!activeRoute && allRoutes.length === 0) return;

    // Render inactive routes with subtle dashed lines
    allRoutes.forEach((route) => {
      if (activeRoute && route.id === activeRoute.id) return; // will render active with full colors

      // Inactive route base
      const inactivePolyline = L.polyline(route.coordinates, {
        color: '#525252',
        weight: 4,
        dashArray: '5, 8',
        opacity: 0.6
      });

      inactivePolyline.bindTooltip(`${route.title} (AQI ${route.avgAqi}) · Click to select`, {
        sticky: true,
        className: 'route-segment-tooltip'
      });

      inactivePolyline.on('click', () => {
        if (onSelectRoute) onSelectRoute(route.id);
      });

      layer.addLayer(inactivePolyline);
    });

    // Render active route with striking Green/Yellow/Red pollution overlay segments
    if (activeRoute) {
      activeRoute.segments.forEach((seg) => {
        const segColor = getAQIColor(seg.aqi);

        // 1. Broad soft ambient glow underlay showing pollution corridor footprint
        const glowUnderlay = L.polyline(seg.coordinates, {
          color: segColor,
          weight: 14,
          opacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round'
        });

        // 2. High-contrast crisp colored foreground polyline
        const corePolyline = L.polyline(seg.coordinates, {
          color: segColor,
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        });

        const tooltipContent = `
          <div style="font-family: system-ui, sans-serif; padding: 2px 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${segColor};"></span>
              <strong style="color: #ffffff;">AQI ${seg.aqi}</strong>
              <span style="color: #a3a3a3;">· ${seg.condition}</span>
            </div>
            <div style="font-size: 10px; color: #737373; margin-top: 2px;">
              Segment: ${seg.distanceKm} km
            </div>
          </div>
        `;

        corePolyline.bindTooltip(tooltipContent, {
          sticky: true,
          className: 'route-segment-tooltip'
        });

        layer.addLayer(glowUnderlay);
        layer.addLayer(corePolyline);
      });

      // Start & End markers with pulsing badge styling
      const startCoord = activeRoute.coordinates[0];
      const endCoord = activeRoute.coordinates[activeRoute.coordinates.length - 1];

      if (startCoord && endCoord) {
        const startIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
              <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
              <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                A
              </div>
            </div>
          `,
          className: '',
          iconSize: [24, 24]
        });
        const endIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
              <div class="w-6 h-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                B
              </div>
            </div>
          `,
          className: '',
          iconSize: [24, 24]
        });

        layer.addLayer(L.marker(startCoord, { icon: startIcon, zIndexOffset: 800 }).bindTooltip('Trip Origin (A)'));
        layer.addLayer(L.marker(endCoord, { icon: endIcon, zIndexOffset: 800 }).bindTooltip('Destination (B)'));
      }

      // Smoothly fit map bounds to route if valid
      if (mapInstanceRef.current && activeRoute.coordinates.length > 1) {
        try {
          const bounds = L.latLngBounds(activeRoute.coordinates);
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 14,
            animate: true
          });
        } catch {
          // ignore
        }
      }
    }
  }, [activeRoute, allRoutes, onSelectRoute]);

  // Update Vehicle Simulation Position
  useEffect(() => {
    const layer = vehicleLayerRef.current;
    layer.clearLayers();

    if (!simulatedVehiclePos) return;

    // Vehicle icon with pulsing radar wave
    const vehicleHtml = `
      <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
        <div class="absolute w-12 h-12 rounded-full border border-emerald-400/40 animate-ping"></div>
        <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-2xl">
          <svg class="w-4 h-4 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      html: vehicleHtml,
      className: 'vehicle-marker',
      iconSize: [28, 28]
    });

    const marker = L.marker(simulatedVehiclePos, { icon: vehicleIcon, zIndexOffset: 1000 });
    layer.addLayer(marker);

    // Keep vehicle roughly in view if map instance is valid
    if (mapInstanceRef.current) {
      const bounds = mapInstanceRef.current.getBounds();
      if (!bounds.contains(simulatedVehiclePos)) {
        mapInstanceRef.current.panTo(simulatedVehiclePos, { animate: true });
      }
    }
  }, [simulatedVehiclePos]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-neutral-950 overflow-hidden">
      {/* Map Container - OpenStreetMap with Dark Theme Filter (Zero Watermarks, 100% Free) */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full z-0 transition-opacity duration-300 ${isDarkMode ? 'dark-map-tiles' : ''}`}
      />

      {/* Floating Main Telemetry Widget (Top Left) */}
      <div className="absolute top-3 left-3 z-[400] max-w-[280px] xs:max-w-xs sm:max-w-sm">
        <LiveAQIWidget
          locationName={cityName || 'Monitored Region'}
          telemetry={telemetry || null}
          isLoading={isLoadingTelemetry}
          onRefresh={onRefreshTelemetry || (() => {})}
        />
      </div>

      {/* Floating Active Route Information Pill (Top Left, below telemetry widget) */}
      {activeRoute && (
        <div className="absolute top-64 xs:top-72 left-3 z-[400] bg-neutral-950/90 backdrop-blur-md border border-neutral-800 rounded-lg p-2.5 shadow-xl max-w-xs space-y-1.5 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white truncate">{activeRoute.title}</span>
            <span
              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                activeRoute.healthScore === 'Excellent'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  : activeRoute.healthScore === 'Moderate'
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
              }`}
            >
              Health: {activeRoute.healthScore}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-300">
            <span>{activeRoute.distanceKm} km</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>{activeRoute.durationMinutes} min</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="font-bold text-emerald-400">Avg AQI {activeRoute.avgAqi}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 pt-0.5 border-t border-neutral-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Green/Red exposure overlay mapped</span>
          </div>
        </div>
      )}

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        {/* Layer Toggles */}
        <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-lg p-2 shadow-xl flex flex-col gap-1.5 text-xs text-neutral-300">
          <div className="flex items-center gap-1.5 text-neutral-400 font-semibold px-1 pb-1 border-b border-neutral-800 text-[11px]">
            <Layers className="w-3.5 h-3.5" />
            <span>Map Layers</span>
          </div>
          <label className="flex items-center gap-2 px-1 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showStations}
              onChange={(e) => setShowStations(e.target.checked)}
              className="rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-0"
            />
            <span>AQI Stations ({stations.length})</span>
          </label>
          <label className="flex items-center gap-2 px-1 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              className="rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-0"
            />
            <span>Hotspot Zones ({hotspots.length})</span>
          </label>
          <label className="flex items-center gap-2 px-1 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showHeatBuffer}
              onChange={(e) => setShowHeatBuffer(e.target.checked)}
              className="rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-0"
            />
            <span>Pollution Dispersion Buffer</span>
          </label>
          <label className="flex items-center gap-2 px-1 cursor-pointer hover:text-white transition-colors border-t border-neutral-800/80 pt-1.5 mt-0.5">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={(e) => setIsDarkMode(e.target.checked)}
              className="rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-0"
            />
            <span className="flex items-center gap-1.5">
              {isDarkMode ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>Dark Theme Basemap</span>
            </span>
          </label>
        </div>

        {/* Recenter Button */}
        <button
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView(center, zoom, { animate: true });
            }
          }}
          title="Recenter Map"
          className="p-2 bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md border border-neutral-800 rounded-lg text-neutral-300 hover:text-white shadow-xl flex items-center justify-center transition-colors"
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>

      {/* AQI Scale Legend Bar (Bottom Center/Left) */}
      <div className="absolute bottom-3 left-3 z-[400] bg-neutral-950/90 backdrop-blur-md border border-neutral-800 rounded-lg p-2.5 shadow-xl max-w-sm">
        <div className="text-[10px] text-neutral-400 font-semibold mb-1.5 flex items-center justify-between">
          <span>Real-Time Air Quality Index (AQI)</span>
          <span className="text-emerald-400 font-mono">CPCB & Open-Meteo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex-1 text-center py-0.5 rounded text-[9px] font-mono font-bold text-white bg-emerald-600">
            0-50
          </div>
          <div className="flex-1 text-center py-0.5 rounded text-[9px] font-mono font-bold text-neutral-900 bg-amber-400">
            51-100
          </div>
          <div className="flex-1 text-center py-0.5 rounded text-[9px] font-mono font-bold text-white bg-orange-500">
            101-200
          </div>
          <div className="flex-1 text-center py-0.5 rounded text-[9px] font-mono font-bold text-white bg-red-600">
            201-300
          </div>
          <div className="flex-1 text-center py-0.5 rounded text-[9px] font-mono font-bold text-white bg-purple-600">
            301-400
          </div>
          <div className="flex-1 text-center py-0.5 rounded text-[9px] font-mono font-bold text-white bg-rose-900">
            400+
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-neutral-400 mt-1">
          <span>Good</span>
          <span>Moderate</span>
          <span>Poor</span>
          <span>Very Poor</span>
          <span>Severe</span>
          <span>Hazardous</span>
        </div>
      </div>
    </div>
  );
};
