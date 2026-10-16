import React from 'react';
import { ShieldAlert, Globe, Plus, ShieldCheck, Lock, Shield, LogOut } from 'lucide-react';
import { CityConfig, AuthUser } from '../../types';
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
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenPrivacy?: () => void;
  language: Language;
  onToggleLanguage: () => void;
  onOpenGeminiAI?: () => void;
  isAuthorityAuthenticated?: boolean;
  onOpenAuthorityLogin?: () => void;
  onToggleRole?: () => void;
  onLogoutAuthority?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentCityId,
  onSelectCity,
  cities = CITIES,
  onOpenAddLocation,
  activeTab,
  onSelectTab,
  userRole,
  currentUser,
  onLogout,
  onOpenPrivacy,
  language,
  onToggleLanguage,
  onOpenGeminiAI,
  isAuthorityAuthenticated,
  onOpenAuthorityLogin,
  onToggleRole,
  onLogoutAuthority
}) => {
  const t = TRANSLATIONS[language];
  const selectedCity = cities.find((c) => c.id === currentCityId) || cities[0];

  const handleAdminTabClick = () => {
    if ((currentUser?.role === 'admin' || isAuthorityAuthenticated)) {
      onSelectTab('admin');
    } else if (onOpenAuthorityLogin) {
      onOpenAuthorityLogin();
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

        {/* Admin Tab */}
        <button
          onClick={handleAdminTabClick}
          className={`transition-colors hover:text-white whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'admin' ? 'text-amber-400 font-semibold border-b-2 border-amber-500 pb-0.5' : ''
          }`}
          title={currentUser?.role === 'admin' ? 'Chief Operations Control Active' : 'Restricted to Chief Admin (r96662010@gmail.com)'}
        >
          {currentUser?.role === 'admin' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-neutral-500" />
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

        {/* Google User Profile & Role Pill (Zero Passwords) */}
        {currentUser && (
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-full pl-1.5 pr-2 py-1">
            {currentUser.picture ? (
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover border border-emerald-500/50"
              />
            ) : (
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                }`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-semibold text-white leading-none truncate max-w-[100px]">
                {currentUser.name}
              </span>
              <span className="text-[9px] font-mono text-neutral-400 leading-none mt-0.5 truncate max-w-[100px]">
                {currentUser.email}
              </span>
            </div>

            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase ${
                currentUser.role === 'admin'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {currentUser.role === 'admin' ? 'Admin' : 'Citizen'}
            </span>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out & Lock App"
                className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

