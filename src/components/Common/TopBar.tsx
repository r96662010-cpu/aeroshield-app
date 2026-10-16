import React from 'react';
import { ShieldAlert, User, Building2, Globe, Plus, ShieldCheck, Lock, Unlock, Shield } from 'lucide-react';
import { CityConfig } from '../../types';
import { CITIES } from '../../data/cityData';
import { Language, TRANSLATIONS } from '../../data/translations';
import { PWAInstallButton } from '../PWA/PWAInstallButton';

interface TopBarProps {
  currentCityId: string;
  onSelectCity: (cityId: string) => void;
  cities?: CityConfig[];
  onOpenAddLocation?: () => void;
  activeTab: 'map' | 'routes' | 'advisory' | 'stations' | 'admin';
  onSelectTab: (tab: 'map' | 'routes' | 'advisory' | 'stations' | 'admin') => void;
  userRole: 'citizen' | 'admin';
  onToggleRole: () => void;
  isAuthorityAuthenticated?: boolean;
  onOpenAuthorityLogin?: () => void;
  onLogoutAuthority?: () => void;
  onOpenPrivacy?: () => void;
  language: Language;
  onToggleLanguage: () => void;
  onOpenGeminiAI?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentCityId,
  onSelectCity,
  cities = CITIES,
  onOpenAddLocation,
  activeTab,
  onSelectTab,
  userRole,
  onToggleRole,
  isAuthorityAuthenticated = false,
  onOpenAuthorityLogin,
  onLogoutAuthority,
  onOpenPrivacy,
  language,
  onToggleLanguage,
  onOpenGeminiAI
}) => {
  const t = TRANSLATIONS[language];
  const selectedCity = cities.find((c) => c.id === currentCityId) || cities[0];

  const handleAdminTabClick = () => {
    if (!isAuthorityAuthenticated && onOpenAuthorityLogin) {
      onOpenAuthorityLogin();
    } else {
      if (userRole !== 'admin') onToggleRole();
      onSelectTab('admin');
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      {/* Zone 1: Wordmark & City Selector with + Add Location */}
      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="#live-map"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('map');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="hidden xs:inline">{t.appTitle}</span>
        </a>

        {/* Quiet city selector */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-md pl-1 pr-1 py-0.5">
          <select
            value={currentCityId}
            aria-label="Select City"
            onChange={(e) => onSelectCity(e.target.value)}
            className="bg-transparent text-neutral-300 text-xs py-1 px-1.5 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-900 text-neutral-200">
                {c.name}
              </option>
            ))}
          </select>

          {/* Quick + Add Location Button */}
          {onOpenAddLocation && (
            <button
              onClick={onOpenAddLocation}
              title="Add Any Location or GPS Pin Worldwide"
              className="p-1 hover:bg-neutral-800 text-emerald-400 rounded transition-colors flex items-center gap-1 cursor-pointer text-[10px] font-semibold px-1.5"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden md:inline">Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-neutral-400">
        <button
          onClick={() => onSelectTab('map')}
          className={`transition-colors hover:text-white whitespace-nowrap cursor-pointer ${
            activeTab === 'map' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-500 pb-0.5' : ''
          }`}
        >
          {t.liveMap}
        </button>
        <button
          onClick={() => onSelectTab('routes')}
          className={`transition-colors hover:text-white whitespace-nowrap cursor-pointer ${
            activeTab === 'routes' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-500 pb-0.5' : ''
          }`}
        >
          {t.routePlanner}
        </button>
        <button
          onClick={() => onSelectTab('advisory')}
          className={`transition-colors hover:text-white whitespace-nowrap cursor-pointer ${
            activeTab === 'advisory' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-500 pb-0.5' : ''
          }`}
        >
          {t.healthAdvisory}
        </button>
        <button
          onClick={() => onSelectTab('stations')}
          className={`transition-colors hover:text-white whitespace-nowrap cursor-pointer ${
            activeTab === 'stations' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-500 pb-0.5' : ''
          }`}
        >
          {t.stationGrid}
        </button>

        {/* Admin Tab with Protection Security Lock Indicator */}
        <button
          onClick={handleAdminTabClick}
          className={`transition-colors hover:text-white whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'admin' ? 'text-amber-400 font-semibold border-b-2 border-amber-500 pb-0.5' : ''
          }`}
          title={isAuthorityAuthenticated ? 'Government Authority Active (Clearance Level 3)' : 'Restricted Authority Access (Security Lock Active)'}
        >
          {isAuthorityAuthenticated ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{t.adminConsole}</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions & Security Status */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Eco Advisor Button */}
        {onOpenGeminiAI && (
          <button
            onClick={onOpenGeminiAI}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 rounded-md hover:bg-emerald-900/80 shadow-sm transition-all cursor-pointer"
            title="AeroShield Environmental & Health Route Advisor (100% Free Edition)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Eco Advisor</span>
          </button>
        )}

        {/* In-App PWA Install Button */}
        <PWAInstallButton />

        {/* Privacy Policy Trigger */}
        {onOpenPrivacy && (
          <button
            onClick={onOpenPrivacy}
            title="Privacy & Data Transparency Policy"
            className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 border border-neutral-800 rounded-md transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Language switch */}
        <button
          onClick={onToggleLanguage}
          title="Toggle Language"
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-md transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-mono">{language === 'en' ? 'हिन्दी' : 'EN'}</span>
        </button>

        {/* Security Clearance / Role button */}
        {isAuthorityAuthenticated ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (userRole !== 'admin') onToggleRole();
                onSelectTab('admin');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Official Government Clearance Active: CPCB-DEL-8821"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Level 3 Clearance</span>
            </button>
            {onLogoutAuthority && (
              <button
                onClick={onLogoutAuthority}
                title="Lock / Sign out of Authority Clearance"
                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 border border-neutral-800 rounded-md transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              if (onOpenAuthorityLogin) {
                onOpenAuthorityLogin();
              } else {
                onToggleRole();
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              userRole === 'admin'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Authority Login</span>
            <span className="sm:hidden">Login</span>
          </button>
        )}
      </div>
    </header>
  );
};

