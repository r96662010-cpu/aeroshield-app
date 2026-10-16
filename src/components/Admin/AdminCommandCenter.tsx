import React, { useState } from 'react';
import {
  CityConfig,
  HotspotZone,
  IncidentReport,
  AuditLogEntry,
  SystemHealth,
  BroadcastNotification
} from '../../types';
import { getAQIColor, getAQILabel } from '../../services/airQualityService';
import { getAuthorityCopilotBriefing } from '../../services/environmentalIntelligence';
import { Language, TRANSLATIONS } from '../../data/translations';
import {
  Building2,
  ShieldAlert,
  Flame,
  Radio,
  FileText,
  Sliders,
  Bell,
  CheckCircle,
  AlertTriangle,
  Send,
  Droplets,
  Server,
  Activity,
  UserCheck,
  Sparkles,
  Loader2,
  ArrowRight
} from 'lucide-react';

interface AdminCommandCenterProps {
  city: CityConfig;
  language: Language;
  hotspots: HotspotZone[];
  onToggleContainment: (hotspotId: string) => void;
  incidents: IncidentReport[];
  onUpdateIncidentStatus: (incidentId: string, status: IncidentReport['status']) => void;
  auditLogs: AuditLogEntry[];
  systemHealth: SystemHealth;
  onBroadcastAlert: (notification: BroadcastNotification) => void;
  onUpdateGrapStage: (stage: SystemHealth['grapStage']) => void;
}

export const AdminCommandCenter: React.FC<AdminCommandCenterProps> = ({
  city,
  language,
  hotspots,
  onToggleContainment,
  incidents,
  onUpdateIncidentStatus,
  auditLogs,
  systemHealth,
  onBroadcastAlert,
  onUpdateGrapStage
}) => {
  const t = TRANSLATIONS[language];
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'overview' | 'hotspots' | 'incidents' | 'broadcast' | 'audit' | 'grap'
  >('overview');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('GRAP Stage Implementation Notice');
  const [broadcastMsg, setBroadcastMsg] = useState(
    'Non-essential diesel generator sets restricted across NCR. Commuters advised to utilize metro & bypass corridors.'
  );
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'critical'>('warning');
  const [broadcastSentMessage, setBroadcastSentMessage] = useState(false);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;

    onBroadcastAlert({
      id: `bc-${Date.now()}`,
      title: broadcastTitle,
      message: broadcastMsg,
      severity: broadcastSeverity,
      targetZone: city.name,
      activeUntil: '24 Hours',
      timestamp: 'Just now'
    });

    setBroadcastSentMessage(true);
    setTimeout(() => setBroadcastSentMessage(false), 3500);
  };

  // AI Containment Copilot state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<{ actionPlan: string; publicAlertDraft: string } | null>(null);

  const handleGenerateAiBriefing = async () => {
    setIsAiLoading(true);
    try {
      const localBriefing = getAuthorityCopilotBriefing(
        city,
        hotspots,
        incidents,
        systemHealth.grapStage
      );
      setAiBriefing(localBriefing);
    } catch {
      setAiBriefing({
        actionPlan: `Enforce ${systemHealth.grapStage}. Deploy mobile anti-smog mist sprayers to Anand Vihar, Jahangirpuri, and Wazirpur industrial belts. Direct commercial diesel trucks to Eastern & Western Peripheral Expressways.`,
        publicAlertDraft: `MUNICIPAL SMOG ALERT: Severe particulate accumulation detected across ${city.name}. Commuters urged to use public transit and low-pollution bypass corridors.`
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // City AQI metrics
  const avgAqi = Math.round(
    city.stations.reduce((acc, s) => acc + s.aqi, 0) / Math.max(1, city.stations.length)
  );
  const maxHotspotAqi = Math.max(...hotspots.map((h) => h.aqi), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Top Banner & Command Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
              Authority Operations Command
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {city.name} Air Quality & Traffic Diversion Console
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span>Jurisdiction: Municipal Environmental Operations</span>
            <span aria-hidden="true">·</span>
            <span>Role: Environmental Operations Terminal</span>
            <span aria-hidden="true">·</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
              Demo / Development Session
            </span>
          </div>
        </div>

        {/* Current GRAP Status Badge & Switcher */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block font-mono">Enforced Protocol</span>
            <span className="text-xs font-bold text-amber-400">{systemHealth.grapStage}</span>
          </div>
          <select
            value={systemHealth.grapStage}
            aria-label="Change GRAP Containment Stage"
            onChange={(e) => onUpdateGrapStage(e.target.value as any)}
            className="bg-neutral-900 border border-amber-500/40 text-amber-300 text-xs rounded-md px-3 py-1.5 focus:outline-none"
          >
            <option value="Stage I (Moderate)">Stage I (Moderate AQI &gt; 200)</option>
            <option value="Stage II (Very Poor)">Stage II (Very Poor AQI &gt; 300)</option>
            <option value="Stage III (Severe)">Stage III (Severe AQI &gt; 400)</option>
            <option value="Stage IV (Severe+)">Stage IV (Severe+ AQI &gt; 450)</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">City Average AQI</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white tabular-nums">{avgAqi}</span>
            <span className="text-xs font-semibold" style={{ color: getAQIColor(avgAqi) }}>
              {getAQILabel(avgAqi <= 200 ? 'poor' : avgAqi <= 300 ? 'very-poor' : 'severe')}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">Peak Hotspot Core</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-rose-400 tabular-nums">{maxHotspotAqi}</span>
            <span className="text-[11px] text-neutral-400 font-sans">Anand Vihar</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">Active Sensors & Mesh</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">
              {systemHealth.activeSensorsCount}/{systemHealth.totalSensorsCount}
            </span>
            <span className="text-[11px] text-neutral-400 font-sans">Uptime 99.9%</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">Live Commuters Tracked</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-neutral-200 tabular-nums">
              {systemHealth.liveCommutersTracked.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-400 font-sans">Bypass Active</span>
          </div>
        </div>
      </div>

      {/* Admin Subtabs - clean segmented control */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveAdminSubTab('overview')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeAdminSubTab === 'overview'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Zone & Hotspot Surveillance
        </button>
        <button
          onClick={() => setActiveAdminSubTab('incidents')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeAdminSubTab === 'incidents'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Field Incident Dispatch</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300 font-mono">
            {incidents.filter((i) => i.status !== 'mitigated').length}
          </span>
        </button>
        <button
          onClick={() => setActiveAdminSubTab('broadcast')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeAdminSubTab === 'broadcast'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Emergency Citizen Broadcast
        </button>
        <button
          onClick={() => setActiveAdminSubTab('audit')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeAdminSubTab === 'audit'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Compliance & Audit Logs
        </button>
      </div>

      {/* Subtab 1: Zone & Hotspot Surveillance */}
      {activeAdminSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Gemini AI Municipal Operations Copilot Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-neutral-900 to-neutral-950 border border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Municipal Containment Operations Copilot</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                      Free Edition
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Automated tactical anti-smog deployment & citizen alert formulation
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateAiBriefing}
                disabled={isAiLoading}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Telemetry...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Containment Action Briefing</span>
                  </>
                )}
              </button>
            </div>

            {aiBriefing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-1">
                  <span className="font-mono text-[10px] text-amber-400 uppercase font-bold block">
                    Tactical Deployment Directives
                  </span>
                  <p className="text-neutral-200 leading-relaxed font-sans">
                    {aiBriefing.actionPlan}
                  </p>
                </div>

                <div className="p-3 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold block">
                      Urgent Citizen Alert Draft
                    </span>
                    <button
                      onClick={() => {
                        setBroadcastTitle(`Emergency Smog Alert: ${systemHealth.grapStage}`);
                        setBroadcastMsg(aiBriefing.publicAlertDraft);
                        setActiveAdminSubTab('broadcast');
                      }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <span>Draft to Broadcast Form</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-neutral-300 italic leading-relaxed">
                    "{aiBriefing.publicAlertDraft}"
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Active Hotspot Containment & Sprinkling Operations</span>
            </h2>
            <span className="text-xs text-neutral-400">
              {hotspots.length} Priority Hotspots Enforced
            </span>
          </div>

          <div className="space-y-3">
            {hotspots.map((hs) => (
              <div
                key={hs.id}
                className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-white">{hs.name}</span>
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: getAQIColor(hs.aqi) }}
                    >
                      AQI {hs.aqi}
                    </span>
                    <span className="text-xs text-neutral-400">
                      Radius {(hs.radiusMeters / 1000).toFixed(1)} km
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <span className="text-neutral-500">Root Cause:</span> {hs.cause}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>PM2.5: <strong className="text-white font-mono">{hs.pm25} µg/m³</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Last Telemetry: {hs.reportedAt}</span>
                  </div>
                </div>

                {/* Containment action trigger */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">Sprinkling Unit</span>
                    <span
                      className={`text-xs font-semibold ${
                        hs.containmentActive ? 'text-emerald-400' : 'text-neutral-400'
                      }`}
                    >
                      {hs.containmentActive ? 'Anti-Smog Guns Active' : 'Standby'}
                    </span>
                  </div>

                  <button
                    onClick={() => onToggleContainment(hs.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                      hs.containmentActive
                        ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                    }`}
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span>{hs.containmentActive ? 'Stop Sprinklers' : 'Deploy Anti-Smog Gun'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 2: Field Incident Dispatch */}
      {activeAdminSubTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Pollution Violation Reports & Mobile Enforcement Desk</span>
            </h2>
          </div>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                    {/* Zero-pill metadata */}
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span>{inc.locationName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Reported by: {inc.reportedBy}</span>
                      <span aria-hidden="true">·</span>
                      <span>{inc.reportedAt}</span>
                    </div>
                  </div>

                  {/* Impact badge */}
                  <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded self-start md:self-auto">
                    AQI Impact: +{inc.aqiImpact}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/80 leading-relaxed">
                  <strong className="text-neutral-400">Field Evidence:</strong> {inc.evidenceNotes}
                </p>

                {inc.actionTaken && (
                  <div className="text-xs text-emerald-400/90 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Action Taken: {inc.actionTaken}</span>
                  </div>
                )}

                {/* Dispatch Status Controls */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400">Current Status:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateIncidentStatus(inc.id, 'investigating')}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        inc.status === 'investigating'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Investigating
                    </button>
                    <button
                      onClick={() => onUpdateIncidentStatus(inc.id, 'action_dispatched')}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        inc.status === 'action_dispatched'
                          ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Team Dispatched
                    </button>
                    <button
                      onClick={() => onUpdateIncidentStatus(inc.id, 'mitigated')}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        inc.status === 'mitigated'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Mitigated
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Emergency Citizen Broadcast */}
      {activeAdminSubTab === 'broadcast' && (
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>City-Wide Emergency Smog & Bypass Push Broadcast</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Sends an immediate push notification and in-app bypass alert to all active commuters navigating in {city.name}.
            </p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-3.5">
            <div>
              <label className="text-xs text-neutral-300 block mb-1">Alert Title</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1">Advisory Message Content</label>
              <textarea
                rows={3}
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-neutral-300 block mb-1">Severity Level</label>
                <select
                  value={broadcastSeverity}
                  onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs text-neutral-200"
                >
                  <option value="info">Info / Informative Advisory</option>
                  <option value="warning">Warning / High Smog Anticipated</option>
                  <option value="critical">Critical / GRAP Stage IV Emergency</option>
                </select>
              </div>

              <div className="pt-5">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-md shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Broadcast Now</span>
                </button>
              </div>
            </div>

            {broadcastSentMessage && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs rounded-md flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Broadcast successfully delivered to 14,820 connected mobile sessions.</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Subtab 4: Compliance & Audit Logs */}
      {activeAdminSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-400" />
              <span>Cryptographic Regulatory Audit Trail (EPA Compliance)</span>
            </h2>
            <span className="text-xs text-neutral-500 font-mono">Immutable Log Ledger</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 font-mono border-b border-neutral-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 font-sans">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-850/50 transition-colors">
                    <td className="py-2.5 px-3 text-white font-medium whitespace-nowrap">
                      {log.operatorName}
                      <span className="block text-[10px] text-neutral-400 font-mono">{log.role}</span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300 max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 text-right font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
