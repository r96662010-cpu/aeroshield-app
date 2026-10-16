import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertTriangle, X, CheckCircle, UserCheck, Loader2 } from 'lucide-react';

interface AuthorityLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const AuthorityLoginModal: React.FC<AuthorityLoginModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const [pin, setPin] = useState('');
  const [badgeId, setBadgeId] = useState('CPCB-DEL-8821');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeId: badgeId.trim(),
          passcode: pin.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      // Store cryptographically signed session token
      if (data.token) {
        localStorage.setItem('aeroshield_auth_token', data.token);
        localStorage.setItem('aeroshield_security_clearance_active', 'true');
        localStorage.setItem('aeroshield_officer_badge', data.user?.badgeId || badgeId);
        localStorage.setItem('aeroshield_session_expires', String(data.user?.expiresAt || (Date.now() + 7200000)));
      }

      onAuthenticated();
      setPin('');
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Server authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setBadgeId('CPCB-DEL-8821');
    setPin('Admin@2026');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-amber-500/40 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Security Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950/60 via-neutral-900 to-neutral-950 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Authority Console Access</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
                  Backend Verified
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Pollution Control Board & Emergency Traffic Management Gate
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Warning Notice */}
        <div className="p-4 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-neutral-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-amber-300">Restricted Operational Console: </span>
              Access enables control of municipal anti-smog units, emergency broadcast alerts, and GRAP stage enforcement.
              <span className="block text-[10px] text-amber-400/90 mt-1 font-mono">
                Development Mode: Set ADMIN_BADGE_ID and ADMIN_PASSCODE on the server for production deployment.
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1 flex items-center justify-between">
                <span>Officer Badge / ID</span>
                <span className="text-[10px] text-neutral-500 font-mono">CPCB-GOV</span>
              </label>
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 font-mono"
                placeholder="e.g. CPCB-DEL-8821"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1 flex items-center justify-between">
                <span>Operational Passcode</span>
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono"
                >
                  Test Credentials (Admin@2026)
                </button>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={32}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-9 py-2 text-sm text-white focus:outline-none focus:border-amber-500/60 font-mono"
                  placeholder="Enter Passcode"
                  autoFocus
                  required
                />
                <KeyRound className="w-4 h-4 text-neutral-500 absolute right-3 top-2.5" />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-lg flex items-center gap-2 animate-in shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>{isLoading ? 'Verifying with Server...' : 'Verify Clearance & Enter'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Audit Verification Note */}
          <div className="text-[10px] text-neutral-500 text-center border-t border-neutral-800/80 pt-2.5 font-mono">
            Cryptographic SHA-256 session logging active · IP rate limiting & failed login protection enabled
          </div>
        </div>
      </div>
    </div>
  );
};

