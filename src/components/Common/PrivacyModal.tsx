import React from 'react';
import { Shield, Lock, EyeOff, MapPin, Database, HardDrive, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Privacy & Data Transparency Policy</span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                AeroShield Zero-Tracking & Data Sovereignty Principles
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto leading-relaxed">
          {/* Section 1: Geolocation */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>1. Location Usage (Client-Side Only)</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              AeroShield only requests device geolocation when you explicitly click <em>"Use My Exact GPS Location"</em>. Geolocation coordinates are processed directly inside your browser to query local open-data sensors. We do <strong>not</strong> track your background location, log your travel history on any remote server, or profile your personal movement.
            </p>
          </div>

          {/* Section 2: Air Quality Data */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Database className="w-4 h-4 shrink-0" />
              <span>2. Air Quality & Weather Data</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              Air quality telemetry (PM2.5, PM10, NO2, O3, CO, SO2, and AQI) is fetched from publicly available Open-Meteo atmospheric dispersion models and ground CAAQMS networks. Data is never fabricated. When offline or during network outages, cached telemetry is transparently marked as <em>OFFLINE / CACHED</em>.
            </p>
          </div>

          {/* Section 3: Incident Reports */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>3. Citizen Incident Reports</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              When you submit a smog or pollution violation report, only the specified category, general location, and optional notes are transmitted to the municipal dispatch queue. If you are offline, reports are safely buffered in your device&apos;s local storage and submitted only when network connectivity is restored.
            </p>
          </div>

          {/* Section 4: Local Storage & Offline Cache */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>4. Local Storage & Service Worker Cache</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              Your saved custom locations, language preferences, daily commute routes, and offline map tiles are stored strictly in your browser&apos;s HTML5 <code>localStorage</code> and Cache Storage. You can clear this data at any time by clearing your browser cache.
            </p>
          </div>

          {/* Section 5: Zero Third-Party Advertising */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <EyeOff className="w-4 h-4 shrink-0" />
              <span>5. Zero Tracking Cookies & Analytics</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              AeroShield contains no commercial tracking pixels, ad networks, or data-broker trackers. We strictly adhere to public-interest privacy standards.
            </p>
          </div>

          {/* Section 6: Data Retention */}
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Database className="w-4 h-4 shrink-0" />
              <span>6. Data Retention Policy</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              Cached atmospheric telemetry expires within 2 hours. Incident reports submitted to the municipal response queue are subject to a rolling retention cycle. No persistent individual profiles or device fingerprints are retained.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
