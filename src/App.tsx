import React, { useState, useEffect, useRef } from 'react';
import {
  CITIES,
  INITIAL_INCIDENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_HEALTH
} from './data/cityData';
import {
  CityConfig,
  PollutionStation,
  HotspotZone,
  NavigationRoute,
  RouteStrategy,
  BypassAlert,
  IncidentReport,
  AuditLogEntry,
  SystemHealth,
  BroadcastNotification
} from './types';
import { fetchLiveAirQuality } from './services/airQualityService';
import { calculatePollutionAwareRoutes, checkUpcomingBypassAlert } from './services/routingEngine';
import { playBypassAlertSound, playBypassActivatedSound } from './utils/audioAlert';
import { TopBar } from './components/Common/TopBar';
import { LivePollutionMap } from './components/Map/LivePollutionMap';
import { RoutePlanner } from './components/Navigation/RoutePlanner';
import { HealthAdvisoryView } from './components/Health/HealthAdvisoryView';
import { StationGridView } from './components/Stations/StationGridView';
import { AdminCommandCenter } from './components/Admin/AdminCommandCenter';
import { TurnByTurnHUD } from './components/Navigation/TurnByTurnHUD';
import { AIEcoAdvisorModal } from './components/AI/AIEcoAdvisorModal';
import { CitizenReportModal } from './components/Incidents/CitizenReportModal';
import { AuthorityLoginModal } from './components/Admin/AuthorityLoginModal';
import { AddLocationModal } from './components/Common/AddLocationModal';
import { PrivacyModal } from './components/Common/PrivacyModal';
import { OfflineIndicator } from './components/PWA/OfflineIndicator';
import { Language, TRANSLATIONS } from './data/translations';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  X,
  Sparkles,
  Lock,
  ShieldCheck,
  MapPin,
  Navigation,
  Activity,
  Radio
} from 'lucide-react';

export default function App() {
  // Cities & Custom Locations state
  const [allCities, setAllCities] = useState<CityConfig[]>(() => {
    try {
      const saved = localStorage.getItem('aeroshield_custom_cities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...CITIES, ...parsed];
        }
      }
    } catch {}
    return CITIES;
  });

  // Navigation & Role states
  const [currentCityId, setCurrentCityId] = useState<string>('delhi-ncr');
  const [activeTab, setActiveTab] = useState<'map' | 'routes' | 'advisory' | 'stations' | 'admin'>('map');
  const [userRole, setUserRole] = useState<'citizen' | 'admin'>('citizen');
  const [language, setLanguage] = useState<Language>('en');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Live atmospheric telemetry state for dashboard & map
  const [telemetry, setTelemetry] = useState<import('./types').LiveAirQualityTelemetry | null>(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState<boolean>(false);

  // Queued offline incident reports count
  const [queuedOfflineCount, setQueuedOfflineCount] = useState<number>(() => {
    try {
      const q = JSON.parse(localStorage.getItem('aeroshield_offline_incident_queue') || '[]');
      return Array.isArray(q) ? q.length : 0;
    } catch {
      return 0;
    }
  });

  // Security Clearance & Custom Location modals state
  const [isAuthorityAuthenticated, setIsAuthorityAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aeroshield_security_clearance_active') === 'true';
    } catch {
      return false;
    }
  });
  const [isAuthorityLoginOpen, setIsAuthorityLoginOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);

  // Saved commutes & personal exposure tracker
  const [totalSavedPm25Mg, setTotalSavedPm25Mg] = useState(1420);
  const [totalTripsCompleted, setTotalTripsCompleted] = useState(8);
  const [savedCommutes, setSavedCommutes] = useState<import('./types').SavedCommute[]>([
    {
      id: 'commute-1',
      name: 'Daily Office Commute (Clean Air)',
      startName: 'Connaught Place Central',
      destName: 'Cyber City Tech Park',
      startCoords: [28.6304, 77.2177],
      destCoords: [28.4950, 77.0890],
      mode: 'car',
      exposureSavingsPct: 42,
      lastUsed: 'Yesterday'
    },
    {
      id: 'commute-2',
      name: 'Dwarka to Central Delhi Bypass',
      startName: 'Dwarka Sector 21',
      destName: 'India Gate Cultural Zone',
      startCoords: [28.5520, 77.0585],
      destCoords: [28.6129, 77.2295],
      mode: 'car',
      exposureSavingsPct: 35,
      lastUsed: '3 days ago'
    }
  ]);

  // Selected City data
  const currentCity = allCities.find((c) => c.id === currentCityId) || allCities[0];
  const [stations, setStations] = useState<PollutionStation[]>(currentCity.stations);
  const [hotspots, setHotspots] = useState<HotspotZone[]>(currentCity.hotspots);

  // Security Clearance & Custom City Handlers
  const handleAddCity = (newCity: CityConfig) => {
    setAllCities((prev) => {
      const updated = [newCity, ...prev.filter((c) => c.id !== newCity.id)];
      try {
        const customOnly = updated.filter((c) => !CITIES.some((dc) => dc.id === c.id));
        localStorage.setItem('aeroshield_custom_cities', JSON.stringify(customOnly));
      } catch {}
      return updated;
    });
    setCurrentCityId(newCity.id);
    setStations(newCity.stations);
    setHotspots(newCity.hotspots);
    setToastMessage(`📍 Location Added: ${newCity.name} — Real-time telemetry activated!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadLiveTelemetry = async (lat: number, lng: number) => {
    setIsLoadingTelemetry(true);
    try {
      const data = await fetchLiveAirQuality(lat, lng);
      setTelemetry(data);
      if (data && data.status === 'LIVE') {
        setStations((prev) =>
          prev.map((s) => ({
            ...s,
            lastUpdated: 'Live Feed Synced'
          }))
        );
      }
    } catch {
      setTelemetry({
        status: 'UNAVAILABLE',
        aqi: 0,
        aqiCategory: 'good',
        pm25: 0,
        pm10: 0,
        no2: 0,
        so2: 0,
        co: 0,
        o3: 0,
        timestamp: 'Unavailable',
        source: 'Open-Meteo API',
        errorMessage: 'Live air-quality data is temporarily unavailable.'
      });
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  const handleAuthenticated = () => {
    setIsAuthorityAuthenticated(true);
    setIsAuthorityLoginOpen(false);
    setUserRole('admin');
    setActiveTab('admin');
    setToastMessage('🛡️ Government Authority Clearance Session Active');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogoutAuthority = async () => {
    try {
      const token = localStorage.getItem('aeroshield_auth_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
    setIsAuthorityAuthenticated(false);
    setUserRole('citizen');
    setActiveTab('map');
    try {
      localStorage.removeItem('aeroshield_security_clearance_active');
      localStorage.removeItem('aeroshield_auth_token');
      localStorage.removeItem('aeroshield_officer_badge');
      localStorage.removeItem('aeroshield_session_expires');
    } catch {}
    setToastMessage('🔒 Security Clearance Session Locked');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync background offline queue and verify auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('aeroshield_auth_token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.valid) {
            setIsAuthorityAuthenticated(false);
            setUserRole('citizen');
            localStorage.removeItem('aeroshield_security_clearance_active');
            localStorage.removeItem('aeroshield_auth_token');
          } else {
            setIsAuthorityAuthenticated(true);
          }
        })
        .catch(() => {});
    }

    fetch('/api/incidents')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.incidents && Array.isArray(data.incidents) && data.incidents.length > 0) {
          setIncidents((prev) => {
            const serverIds = new Set(data.incidents.map((i: any) => i.id));
            const localOnly = prev.filter((p) => !serverIds.has(p.id));
            return [...localOnly, ...data.incidents];
          });
        }
      })
      .catch(() => {});

    const syncOfflineQueue = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const raw = localStorage.getItem('aeroshield_offline_incident_queue');
        if (!raw) return;
        const queued: IncidentReport[] = JSON.parse(raw);
        if (!Array.isArray(queued) || queued.length === 0) return;

        const remaining: IncidentReport[] = [];
        let syncedCount = 0;

        for (const item of queued) {
          try {
            const res = await fetch('/api/incidents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: item.title,
                category: item.category,
                locationName: item.locationName,
                coords: item.coords,
                evidenceNotes: item.evidenceNotes,
                reportedBy: item.reportedBy
              })
            });
            if (res.ok) {
              syncedCount++;
            } else {
              remaining.push(item);
            }
          } catch {
            remaining.push(item);
          }
        }

        if (remaining.length > 0) {
          localStorage.setItem('aeroshield_offline_incident_queue', JSON.stringify(remaining));
          setQueuedOfflineCount(remaining.length);
        } else {
          localStorage.removeItem('aeroshield_offline_incident_queue');
          setQueuedOfflineCount(0);
        }

        if (syncedCount > 0) {
          setToastMessage(`Synced ${syncedCount} queued incident report(s) to server.`);
          setTimeout(() => setToastMessage(null), 3500);
        }
      } catch {}
    };

    syncOfflineQueue();
    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  // Transport mode & Routes
  const [currentMode, setCurrentMode] = useState<import('./types').TransportMode>('car');
  const [routes, setRoutes] = useState<NavigationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<RouteStrategy>('cleanest');
  const [activeBypassAlert, setActiveBypassAlert] = useState<BypassAlert | null>(null);

  // Live dynamic route notifications ('AQI increased on current route' & 'Cleaner alternative found')
  const [liveRouteNotification, setLiveRouteNotification] = useState<import('./types').LiveRouteEvent | null>({
    id: 'initial-cleaner-found',
    type: 'cleaner_route_found',
    title: 'Cleaner alternative found',
    message: 'Clean Air Corridor reduces inhaled PM2.5 by 42% avoiding Anand Vihar & Wazirpur bottlenecks.',
    suggestedRouteId: 'cleanest',
    timeDeltaMin: 7,
    exposureDeltaPct: 42,
    timestamp: 'Just now'
  });

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [simulatedVehiclePos, setSimulatedVehiclePos] = useState<[number, number] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const simulationTimerRef = useRef<any>(null);

  // Admin and Broadcast states
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(INITIAL_SYSTEM_HEALTH);
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotification | null>({
    id: 'initial-alert',
    title: 'GRAP Stage III Enforcement Alert',
    message: 'High particulate smog accumulation. Commuters advised to avoid non-essential trips and select clean bypass corridors.',
    severity: 'warning',
    targetZone: 'Delhi NCR',
    activeUntil: '18:00 IST',
    timestamp: '10 min ago'
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calculate default routes whenever city changes
  useEffect(() => {
    setStations(currentCity.stations);
    setHotspots(currentCity.hotspots);
    setIsSimulating(false);
    setSimulatedVehiclePos(null);
    setActiveBypassAlert(null);

    const start = currentCity.defaultStart || (currentCity.popularPlaces && currentCity.popularPlaces[0]?.coords) || currentCity.center;
    const dest = currentCity.defaultDest || (currentCity.popularPlaces && currentCity.popularPlaces[1]?.coords) || [
      currentCity.center[0] + 0.05,
      currentCity.center[1] + 0.05
    ];

    const computed = calculatePollutionAwareRoutes(start, dest, currentCity.hotspots, 190, currentMode);
    setRoutes(computed);
    setSelectedRouteId('cleanest');

    // Load live telemetry from Open-Meteo for city center
    loadLiveTelemetry(currentCity.center[0], currentCity.center[1]);
  }, [currentCityId, currentMode]);

  // Recalculate routes on demand
  const handleCalculateRoutes = (
    startCoords: [number, number],
    endCoords: [number, number],
    mode: import('./types').TransportMode = currentMode
  ) => {
    const computed = calculatePollutionAwareRoutes(startCoords, endCoords, hotspots, 190, mode);
    setRoutes(computed);
    setSelectedRouteId('cleanest');
    setIsSimulating(false);
    setSimulatedVehiclePos(null);
    setActiveBypassAlert(null);
  };

  const handleSelectRouteWithNotification = (id: RouteStrategy) => {
    setSelectedRouteId(id);
    if (id === 'fastest') {
      setLiveRouteNotification({
        id: `cleaner-${Date.now()}`,
        type: 'cleaner_route_found',
        title: 'Cleaner alternative found',
        message: 'Clean Air Corridor avoids severe particulate hotspots: -42% PM2.5 with only +7m travel time.',
        suggestedRouteId: 'cleanest',
        timeDeltaMin: 7,
        exposureDeltaPct: 42,
        timestamp: 'Just now'
      });
    }
  };

  const handleSwitchFromNotification = (suggestedId: RouteStrategy = 'cleanest') => {
    setSelectedRouteId(suggestedId);
    setLiveRouteNotification(null);
    if (soundEnabled) playBypassActivatedSound();
    setToastMessage('Switched to Clean Air Corridor. Exposure reduced by 42%.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active route reference
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  // Simulation step loop
  useEffect(() => {
    if (!isSimulating || !activeRoute) return;

    const coords = activeRoute.coordinates;
    simulationTimerRef.current = setInterval(() => {
      setSimulationIndex((prev) => {
        const next = prev + 1;
        if (next >= coords.length) {
          clearInterval(simulationTimerRef.current);
          setIsSimulating(false);
          setTotalTripsCompleted((t) => t + 1);
          setTotalSavedPm25Mg((s) => s + (activeRoute.exposureReductionPct ? 185 : 90));
          setToastMessage('Destination reached. Clean commute exposure savings logged!');
          return 0;
        }

        const currentPos = coords[next];
        setSimulatedVehiclePos(currentPos);

        // Mid-route trigger: AQI increased on current route
        if (next === Math.floor(coords.length * 0.45) && activeRoute.id === 'fastest') {
          setLiveRouteNotification({
            id: `spike-${Date.now()}`,
            type: 'aqi_spike',
            title: 'AQI increased on current route',
            message: 'Sudden spike of +48 AQI detected ahead near freight corridor. Clean bypass recommended.',
            suggestedRouteId: 'cleanest',
            aqiDelta: 48,
            timestamp: 'Just now'
          });
          if (soundEnabled) playBypassAlertSound();
        }

        // Check for upcoming high pollution hotspots
        const alert = checkUpcomingBypassAlert(currentPos, activeRoute, hotspots);
        if (alert && !activeBypassAlert) {
          setActiveBypassAlert(alert);
          if (soundEnabled) playBypassAlertSound();
        }

        return next;
      });
    }, 700);

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isSimulating, activeRoute, hotspots, soundEnabled, activeBypassAlert]);

  // Start simulation
  const handleStartSimulation = () => {
    if (!activeRoute) return;
    setSimulationIndex(0);
    setSimulatedVehiclePos(activeRoute.coordinates[0]);
    setIsSimulating(true);
    setActiveBypassAlert(null);
    if (activeTab !== 'map') setActiveTab('map');
  };

  // Stop simulation
  const handleStopSimulation = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsSimulating(false);
    setSimulatedVehiclePos(null);
    setActiveBypassAlert(null);
  };

  // Trigger 1-Click Bypass when warned
  const handleTriggerBypass = () => {
    setSelectedRouteId('cleanest');
    setActiveBypassAlert(null);
    if (soundEnabled) playBypassActivatedSound();
    setToastMessage('Rerouted to Clean Air Corridor. -42% particulate exposure.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Saved commute handlers
  const handleSaveCurrentCommute = (name: string, route: NavigationRoute) => {
    const newCommute: import('./types').SavedCommute = {
      id: `commute-${Date.now()}`,
      name,
      startName: (currentCity.popularPlaces && currentCity.popularPlaces[0]?.name) || currentCity.stations[0]?.name || 'Origin Hub',
      destName: (currentCity.popularPlaces && currentCity.popularPlaces[1]?.name) || currentCity.stations[1]?.name || 'Destination Hub',
      startCoords: route.coordinates[0] || currentCity.center,
      destCoords: route.coordinates[route.coordinates.length - 1] || currentCity.center,
      mode: currentMode,
      exposureSavingsPct: route.exposureReductionPct || 38,
      lastUsed: 'Just now'
    };
    setSavedCommutes((prev) => [newCommute, ...prev]);
    setToastMessage(`Saved "${name}" to your daily commutes!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteSavedCommute = (id: string) => {
    setSavedCommutes((prev) => prev.filter((c) => c.id !== id));
    setToastMessage('Saved commute removed.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Citizen incident report handler
  const handleSubmitIncidentReport = (report: IncidentReport) => {
    setIncidents((prev) => [report, ...prev]);
    try {
      const q = JSON.parse(localStorage.getItem('aeroshield_offline_incident_queue') || '[]');
      setQueuedOfflineCount(Array.isArray(q) ? q.length : 0);
    } catch {}
    const auditEntry: AuditLogEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      operatorName: report.reportedBy,
      role: 'Citizen Public App',
      action: `Incident Logged: ${report.title}`,
      details: `${report.category} at ${report.locationName} (Est AQI impact: +${report.aqiImpact})`,
      timestamp: 'Just now',
      ip: '192.168.1.104'
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);
    setToastMessage('Incident report dispatched to Municipal Air Quality Desk!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Admin Hotspot Containment toggle
  const handleToggleContainment = (hotspotId: string) => {
    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id === hotspotId) {
          const nextState = !h.containmentActive;
          // Add audit log
          const newLog: AuditLogEntry = {
            id: `log-${Date.now()}`,
            operatorName: 'Dr. Priya Sharma',
            role: 'Super Admin',
            action: nextState ? 'Sprinklers Activated' : 'Sprinklers Deactivated',
            details: `${nextState ? 'Deployed' : 'Halted'} anti-smog water mist units at ${h.name}.`,
            timestamp: new Date().toLocaleTimeString(),
            ip: '10.240.12.8'
          };
          setAuditLogs((l) => [newLog, ...l]);
          return { ...h, containmentActive: nextState };
        }
        return h;
      })
    );
  };

  // Admin Incident status update
  const handleUpdateIncidentStatus = (incidentId: string, status: IncidentReport['status']) => {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id === incidentId) {
          const newLog: AuditLogEntry = {
            id: `log-${Date.now()}`,
            operatorName: 'Operations Officer',
            role: 'Enforcement',
            action: `Incident Status: ${status}`,
            details: `Updated status of incident "${i.title}" to ${status}.`,
            timestamp: new Date().toLocaleTimeString(),
            ip: '10.240.12.14'
          };
          setAuditLogs((l) => [newLog, ...l]);
          return {
            ...i,
            status,
            actionTaken:
              status === 'action_dispatched'
                ? 'Mobile enforcement squad dispatched to site.'
                : status === 'mitigated'
                ? 'Pollution source suppressed and violation penalty recorded.'
                : i.actionTaken
          };
        }
        return i;
      })
    );
  };

  // Admin Broadcast
  const handleBroadcastAlert = (notification: BroadcastNotification) => {
    setActiveBroadcast(notification);
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      operatorName: 'Dr. Priya Sharma',
      role: 'Super Admin',
      action: 'Emergency Broadcast Issued',
      details: `Broadcast alert "${notification.title}" to commuters.`,
      timestamp: new Date().toLocaleTimeString(),
      ip: '10.240.12.8'
    };
    setAuditLogs((l) => [newLog, ...l]);
  };

  // GRAP stage update
  const handleUpdateGrapStage = (stage: SystemHealth['grapStage']) => {
    setSystemHealth((prev) => ({ ...prev, grapStage: stage }));
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      operatorName: 'Dr. Priya Sharma',
      role: 'Super Admin',
      action: 'GRAP Threshold Shift',
      details: `Enforced new regulatory containment level: ${stage}.`,
      timestamp: new Date().toLocaleTimeString(),
      ip: '10.240.12.8'
    };
    setAuditLogs((l) => [newLog, ...l]);
  };

  const simulationProgressPct = activeRoute && activeRoute.coordinates.length > 0
    ? Math.round((simulationIndex / (activeRoute.coordinates.length - 1)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Top Bar following Top Bar Contract */}
      <TopBar
        currentCityId={currentCityId}
        onSelectCity={(cityId) => setCurrentCityId(cityId)}
        cities={allCities}
        onOpenAddLocation={() => setIsAddLocationOpen(true)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin' && !isAuthorityAuthenticated) {
            setIsAuthorityLoginOpen(true);
            return;
          }
          setActiveTab(tab);
        }}
        userRole={userRole}
        onToggleRole={() => {
          if (userRole === 'citizen' && !isAuthorityAuthenticated) {
            setIsAuthorityLoginOpen(true);
            return;
          }
          const nextRole = userRole === 'citizen' ? 'admin' : 'citizen';
          setUserRole(nextRole);
          if (nextRole === 'admin') setActiveTab('admin');
          else if (activeTab === 'admin') setActiveTab('map');
        }}
        isAuthorityAuthenticated={isAuthorityAuthenticated}
        onOpenAuthorityLogin={() => setIsAuthorityLoginOpen(true)}
        onLogoutAuthority={handleLogoutAuthority}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
        onOpenGeminiAI={() => setIsAiModalOpen(true)}
      />

      {/* Emergency Broadcast Banner if active */}
      {activeBroadcast && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-40 backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-hidden">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold whitespace-nowrap">{activeBroadcast.title}:</span>
            <span className="truncate">{activeBroadcast.message}</span>
            <span className="hidden sm:inline font-mono text-[10px] text-amber-400/80">({activeBroadcast.activeUntil})</span>
          </div>
          <button
            onClick={() => setActiveBroadcast(null)}
            className="p-1 text-amber-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        {/* VIEW 1: MAP & ROUTE PLANNER (PUBLIC USER COMMUTER APP) */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
            {/* Map Canvas */}
            <div className="flex-1 h-full relative">
              <LivePollutionMap
                center={currentCity.center}
                zoom={currentCity.zoom}
                stations={stations}
                hotspots={hotspots}
                activeRoute={activeRoute}
                allRoutes={routes}
                onSelectRoute={(id) => handleSelectRouteWithNotification(id)}
                simulatedVehiclePos={simulatedVehiclePos}
                telemetry={telemetry}
                cityName={currentCity.name}
                isLoadingTelemetry={isLoadingTelemetry}
                onRefreshTelemetry={() => loadLiveTelemetry(currentCity.center[0], currentCity.center[1])}
              />

              {/* Dynamic Live Route Notification (Cleaner alternative found / AQI increased on current route) */}
              {liveRouteNotification && (
                <div className="absolute top-4 right-4 md:right-16 z-[450] max-w-sm w-full bg-neutral-950/95 backdrop-blur-md border border-neutral-700/80 rounded-xl shadow-2xl p-3.5 space-y-2 animate-fade-in pointer-events-auto">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {liveRouteNotification.type === 'cleaner_route_found' ? (
                        <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                          <Sparkles className="w-4 h-4 fill-emerald-400" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-white tracking-tight">
                        {liveRouteNotification.title}
                      </span>
                    </div>
                    <button
                      onClick={() => setLiveRouteNotification(null)}
                      className="text-neutral-500 hover:text-white p-0.5 rounded transition-colors"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-300 leading-snug">
                    {liveRouteNotification.message}
                  </p>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    {liveRouteNotification.type === 'cleaner_route_found' ? (
                      <button
                        onClick={() => handleSwitchFromNotification(liveRouteNotification.suggestedRouteId || 'cleanest')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Switch to Clean Route</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSwitchFromNotification(liveRouteNotification.suggestedRouteId || 'cleanest')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-md shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Reroute via Clean Bypass</span>
                      </button>
                    )}

                    <button
                      onClick={() => setLiveRouteNotification(null)}
                      className="text-[11px] text-neutral-400 hover:text-neutral-200 px-2 py-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Turn-by-turn Navigation HUD during active trip simulation */}
              {isSimulating && activeRoute && (
                <TurnByTurnHUD
                  activeRoute={activeRoute}
                  progressPct={simulationProgressPct}
                  activeAlert={activeBypassAlert}
                  onBypassClick={handleTriggerBypass}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => setSoundEnabled((s) => !s)}
                  onStop={handleStopSimulation}
                />
              )}
            </div>

            {/* Sidebar Route Planner Drawer */}
            <div className="w-full md:w-[380px] lg:w-[420px] h-[48%] md:h-full shrink-0">
              <RoutePlanner
                city={currentCity}
                language={language}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => handleSelectRouteWithNotification(id)}
                onCalculateRoutes={handleCalculateRoutes}
                activeBypassAlert={activeBypassAlert}
                onTriggerBypass={handleTriggerBypass}
                isSimulating={isSimulating}
                onStartSimulation={handleStartSimulation}
                onStopSimulation={handleStopSimulation}
                simulationProgressPct={simulationProgressPct}
                currentMode={currentMode}
                onSelectMode={(m) => setCurrentMode(m)}
                onOpenGeminiAI={() => setIsAiModalOpen(true)}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                savedCommutes={savedCommutes}
                onSaveCurrentCommute={handleSaveCurrentCommute}
                onDeleteSavedCommute={handleDeleteSavedCommute}
                totalSavedPm25Mg={totalSavedPm25Mg}
                totalTripsCompleted={totalTripsCompleted}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: ROUTE BYPASS COMPARISON (Expanded) */}
        {activeTab === 'routes' && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            <div className="flex-1 h-full">
              <LivePollutionMap
                center={currentCity.center}
                zoom={currentCity.zoom}
                stations={stations}
                hotspots={hotspots}
                activeRoute={activeRoute}
                allRoutes={routes}
                onSelectRoute={(id) => handleSelectRouteWithNotification(id)}
                telemetry={telemetry}
                cityName={currentCity.name}
                isLoadingTelemetry={isLoadingTelemetry}
                onRefreshTelemetry={() => loadLiveTelemetry(currentCity.center[0], currentCity.center[1])}
              />
            </div>
            <div className="w-full md:w-[440px] h-full shrink-0">
              <RoutePlanner
                city={currentCity}
                language={language}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => handleSelectRouteWithNotification(id)}
                onCalculateRoutes={handleCalculateRoutes}
                activeBypassAlert={activeBypassAlert}
                onTriggerBypass={handleTriggerBypass}
                isSimulating={isSimulating}
                onStartSimulation={handleStartSimulation}
                onStopSimulation={handleStopSimulation}
                simulationProgressPct={simulationProgressPct}
                currentMode={currentMode}
                onSelectMode={(m) => setCurrentMode(m)}
                onOpenGeminiAI={() => setIsAiModalOpen(true)}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                savedCommutes={savedCommutes}
                onSaveCurrentCommute={handleSaveCurrentCommute}
                onDeleteSavedCommute={handleDeleteSavedCommute}
                totalSavedPm25Mg={totalSavedPm25Mg}
                totalTripsCompleted={totalTripsCompleted}
              />
            </div>
          </div>
        )}

        {/* VIEW 3: HEALTH ADVISORY & SENSITIVE GROUPS */}
        {activeTab === 'advisory' && (
          <div className="flex-1 overflow-y-auto">
            <HealthAdvisoryView city={currentCity} language={language} />
          </div>
        )}

        {/* VIEW 4: STATION GRID TELEMETRY */}
        {activeTab === 'stations' && (
          <div className="flex-1 overflow-y-auto">
            <StationGridView
              city={currentCity}
              language={language}
              onSelectStation={(st) => {
                setActiveTab('map');
              }}
            />
          </div>
        )}

        {/* VIEW 5: ADMIN / AUTHORITY COMMAND CENTER (RESTRICTED CLEARANCE) */}
        {activeTab === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            {!isAuthorityAuthenticated ? (
              <div className="h-full flex items-center justify-center p-6 bg-neutral-950">
                <div className="max-w-md w-full p-6 rounded-2xl bg-neutral-900 border border-amber-500/40 shadow-2xl text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                      <span>Government Clearance Required</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                        Restricted
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      Access to municipal anti-smog mist sprayers, GRAP enforcement, and emergency public broadcast transmitters requires official security verification.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setIsAuthorityLoginOpen(true)}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Authority Clearance (Badge ID & Passcode)</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    Restricted Operations Gate · Development mode authentication enabled
                  </div>
                </div>
              </div>
            ) : (
              <AdminCommandCenter
                city={currentCity}
                language={language}
                hotspots={hotspots}
                onToggleContainment={handleToggleContainment}
                incidents={incidents}
                onUpdateIncidentStatus={handleUpdateIncidentStatus}
                auditLogs={auditLogs}
                systemHealth={systemHealth}
                onBroadcastAlert={handleBroadcastAlert}
                onUpdateGrapStage={handleUpdateGrapStage}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on < md screens) */}
      <nav className="md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around z-40 shrink-0">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'map' ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{TRANSLATIONS[language].liveMap}</span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'routes' ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Corridors</span>
        </button>

        <button
          onClick={() => setActiveTab('advisory')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'advisory' ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Health</span>
        </button>

        <button
          onClick={() => setActiveTab('stations')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'stations' ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Sensors</span>
        </button>

        <button
          onClick={() => {
            if (!isAuthorityAuthenticated) {
              setIsAuthorityLoginOpen(true);
            } else {
              if (userRole !== 'admin') setUserRole('admin');
              setActiveTab('admin');
            }
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
            activeTab === 'admin' ? 'text-amber-400 bg-amber-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {isAuthorityAuthenticated ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <Lock className="w-4 h-4 text-amber-400" />
          )}
          <span>Authority</span>
        </button>
      </nav>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-14 md:bottom-6 left-1/2 -translate-x-1/2 z-[600] px-4 py-2.5 bg-emerald-950 border border-emerald-500/60 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium text-emerald-200 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PWA Offline Indicator */}
      <OfflineIndicator
        queuedReportsCount={queuedOfflineCount}
        onRefresh={() => loadLiveTelemetry(currentCity.center[0], currentCity.center[1])}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      {/* Government Authority Security Clearance Modal */}
      <AuthorityLoginModal
        isOpen={isAuthorityLoginOpen}
        onClose={() => setIsAuthorityLoginOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      {/* Add Any Location Worldwide Modal */}
      <AddLocationModal
        isOpen={isAddLocationOpen}
        onClose={() => setIsAddLocationOpen(false)}
        onAddCity={handleAddCity}
      />

      {/* Gemini AI Environmental Advisor Modal */}
      {activeRoute && (
        <AIEcoAdvisorModal
          city={currentCity}
          activeRoute={activeRoute}
          allRoutes={routes}
          transportMode={currentMode}
          language={language}
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onApplyRoute={(routeId) => setSelectedRouteId(routeId)}
        />
      )}

      {/* Citizen Smog & Pollution Incident Reporting Modal */}
      <CitizenReportModal
        city={currentCity}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitIncidentReport}
      />
    </div>
  );
}
