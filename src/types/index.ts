export type AQISeverity = 'good' | 'moderate' | 'poor' | 'very-poor' | 'severe' | 'hazardous';
export type TelemetryStatus = 'LIVE' | 'STALE' | 'OFFLINE' | 'UNAVAILABLE';

export interface LiveAirQualityTelemetry {
  status: TelemetryStatus;
  aqi: number;
  aqiCategory: AQISeverity;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  timestamp: string;
  source: string;
  isCached?: boolean;
  errorMessage?: string;
  hourlyForecast?: number[];
}

export interface PollutionStation {
  id: string;
  name: string;
  city: string;
  location: [number, number]; // [lat, lng]
  aqi: number;
  pm25: number; // ug/m3
  pm10: number; // ug/m3
  no2: number;  // ppb or ug/m3
  so2: number;  // ppb
  co: number;   // mg/m3
  o3: number;   // ug/m3
  status: 'active' | 'maintenance' | 'offline';
  sensorType: 'CPCB-CAAQMS' | 'Open-Meteo' | 'Industrial-Fence' | 'IoT-Mesh';
  areaType: 'industrial' | 'traffic-hub' | 'residential' | 'commercial';
  lastUpdated: string;
}

export interface HotspotZone {
  id: string;
  name: string;
  city: string;
  center: [number, number];
  radiusMeters: number;
  aqi: number;
  pm25: number;
  severity: AQISeverity;
  cause: string;
  containmentActive: boolean;
  advisory: string;
  reportedAt: string;
}

export type RouteStrategy = 'fastest' | 'cleanest' | 'balanced';
export type TransportMode = 'car' | 'bike' | 'bus' | 'walk';
export type HealthScore = 'Excellent' | 'Moderate' | 'Risky';

export interface RouteSegment {
  coordinates: [number, number][];
  aqi: number;
  condition: string;
  distanceKm: number;
}

export interface NavigationRoute {
  id: RouteStrategy;
  title: string;
  subtitle: string;
  distanceKm: number;
  durationMinutes: number;
  avgAqi: number;
  maxAqi: number;
  pm25Exposure: number; // estimated mcg inhaled
  exposureReductionPct?: number; // relative to fastest route
  timeDeltaMin?: number; // relative to fastest route
  intersectsHotspots: string[];
  coordinates: [number, number][];
  segments: RouteSegment[];
  isRecommended: boolean;
  healthScore: HealthScore;
  healthAdvisory: string;
  summary: string;
}

export interface LiveRouteEvent {
  id: string;
  type: 'aqi_spike' | 'cleaner_route_found' | 'hotspot_ahead';
  title: string;
  message: string;
  suggestedRouteId?: RouteStrategy;
  aqiDelta?: number;
  timeDeltaMin?: number;
  exposureDeltaPct?: number;
  timestamp: string;
}

export interface SavedCommute {
  id: string;
  name: string;
  startName: string;
  destName: string;
  startCoords: [number, number];
  destCoords: [number, number];
  mode: TransportMode;
  exposureSavingsPct: number;
  lastUsed: string;
}

export interface BypassAlert {
  id: string;
  hotspotName: string;
  hotspotCoords: [number, number];
  distanceMeters: number;
  hotspotAqi: number;
  cause: string;
  timePenaltyMin: number;
  exposureReductionPct: number;
  alternateRouteId: RouteStrategy;
  timestamp: string;
}

export interface CityConfig {
  id: string;
  name: string;
  state: string;
  country: string;
  center: [number, number];
  zoom: number;
  stations: PollutionStation[];
  hotspots: HotspotZone[];
  popularPlaces?: { name: string; category: string; coords: [number, number] }[];
  defaultStart?: [number, number];
  defaultDest?: [number, number];
}

export interface IncidentReport {
  id: string;
  title: string;
  category: 'biomass_burning' | 'industrial_violation' | 'construction_dust' | 'heavy_traffic_congestion' | 'sensor_fault';
  locationName: string;
  coords: [number, number];
  aqiImpact: number;
  reportedBy: string;
  reportedAt: string;
  status: 'investigating' | 'action_dispatched' | 'mitigated';
  actionTaken?: string;
  evidenceNotes: string;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  targetZone: string;
  activeUntil: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  operatorName: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
}

export interface SystemHealth {
  uptimePercentage: number;
  activeSensorsCount: number;
  totalSensorsCount: number;
  avgApiLatencyMs: number;
  lastSyncTimestamp: string;
  dbStatus: 'healthy' | 'degraded' | 'reconnecting';
  liveCommutersTracked: number;
  grapStage: 'Stage I (Moderate)' | 'Stage II (Very Poor)' | 'Stage III (Severe)' | 'Stage IV (Severe+)';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'citizen';
  clearanceLevel: string;
  isChiefAdmin?: boolean;
}
