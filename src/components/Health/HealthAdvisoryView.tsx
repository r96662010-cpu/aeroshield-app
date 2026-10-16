import React from 'react';
import { CityConfig } from '../../types';
import { getHealthAdvisory, getAQIColor, getAQISeverity, getAQILabel } from '../../services/airQualityService';
import { Language, TRANSLATIONS } from '../../data/translations';
import {
  ShieldAlert,
  Heart,
  Baby,
  Activity,
  Wind,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Car
} from 'lucide-react';

interface HealthAdvisoryViewProps {
  city: CityConfig;
  language: Language;
}

export const HealthAdvisoryView: React.FC<HealthAdvisoryViewProps> = ({ city, language }) => {
  const t = TRANSLATIONS[language];

  // Calculate city average AQI
  const avgAqi = Math.round(
    city.stations.reduce((acc, s) => acc + s.aqi, 0) / Math.max(1, city.stations.length)
  );
  const severity = getAQISeverity(avgAqi);
  const aqiColor = getAQIColor(avgAqi);
  const advisory = getHealthAdvisory(avgAqi);

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
      {/* City Status Headline */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-neutral-400">
            {city.name} Environmental Health Telemetry
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Air Quality Health Advisory & Commuter Guidance
          </h1>
          <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
            {advisory.general}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block font-mono">Current Index</span>
            <span className="text-xs font-semibold text-neutral-300 capitalize">
              {getAQILabel(severity)}
            </span>
          </div>
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center font-mono text-2xl font-bold text-white shadow-lg border border-white/20"
            style={{ backgroundColor: aqiColor }}
          >
            {avgAqi}
          </div>
        </div>
      </div>

      {/* Sensitive Populations Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-400" />
          <span>Sensitive Group Guidance & Risk Reduction</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Asthma & Respiratory */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-400">
              <Activity className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">Asthma & Chronic Respiratory</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Fine PM2.5 and Ozone deeply penetrate alveoli, triggering bronchial spasms.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
              <li>Carry prescribed rescue inhalers at all times.</li>
              <li>Avoid high-pollution routes during morning temperature inversion (06:00 - 09:30).</li>
              <li>Keep indoor HEPA filters operating on medium or high flow.</li>
            </ul>
          </div>

          {/* Card 2: Children & Elderly */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400">
              <Baby className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">Children & Senior Citizens</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Higher breathing rates relative to body mass increase total toxin intake per kilogram.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
              <li>Suspend outdoor school assemblies and physical sports when AQI &gt; 250.</li>
              <li>Seniors should postpone brisk outdoor walks until afternoon solar dispersion.</li>
              <li>Hydrate regularly to maintain mucosal barrier efficiency.</li>
            </ul>
          </div>

          {/* Card 3: Commuters & Delivery Riders */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Car className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">Commuters & Two-Wheeler Riders</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Highest direct exposure to raw tailpipe hydrocarbons, black carbon, and tire wear.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
              <li>Use the AeroShield Clean Bypass route to divert from choke points.</li>
              <li>Automobile drivers: strictly switch HVAC to <strong>Internal Recirculation</strong>.</li>
              <li>Bikers: Wear certified N95 / FFP2 respirators with sealed nose clip.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mask & Filtration Standards */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Wind className="w-4 h-4 text-emerald-400" />
          <span>Respirator & Filtration Effectiveness Guide</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Certified N95 / FFP2 / KN95 Respirators (Recommended)</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Filters at least 95% of airborne particles down to 0.3 microns. Electrostatically charged meltblown filter captures fine combustion particles (PM2.5). Must seal tightly around the nose bridge and chin without gaps.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Cloth Masks & Surgical Masks (Ineffective against PM2.5)</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Woven fabric weaves have microscopic gaps of 50–100 microns. Fine particulate matter (PM2.5 is 2.5 microns) passes directly through cloth layers. Offers less than 15% filtration efficiency against ambient smog.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency & Municipal Contacts */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-neutral-200">
            <PhoneCall className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 block font-medium">Environmental Emergency Helpline</span>
            <span className="text-sm font-bold text-white font-mono">1800-180-1717 (CPCB Delhi Command)</span>
          </div>
        </div>

        <div className="text-xs text-neutral-400">
          Source: Central Pollution Control Board (CPCB) & WHO Global Air Quality Guidelines
        </div>
      </div>
    </div>
  );
};
