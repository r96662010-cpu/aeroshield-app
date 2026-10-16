import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  return (
    <>
      {/* Chromium / Android / Desktop Install */}
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded-md transition-all shadow-sm cursor-pointer group"
          title="Install AeroShield for instant offline access and home screen launch"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:animate-bounce" />
          <span className="hidden sm:inline">Install PWA</span>
        </button>
      )}

      {/* iOS Safari Guide Button */}
      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-md transition-colors cursor-pointer"
          title="Add AeroShield to iOS Home Screen"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Add to Home</span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-neutral-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Install on iPhone / iPad</span>
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-neutral-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs space-y-3 text-neutral-300 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <div>
                  Tap the <strong className="text-white">Share</strong> icon in the Safari bottom toolbar.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <div>
                  Scroll down the action sheet and tap <strong className="text-white flex items-center gap-1 mt-0.5"><PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /> Add to Home Screen</strong>.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <div>
                  Tap <strong className="text-white">Add</strong> in the top-right corner to launch AeroShield like a native app.
                </div>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Installation Success Toast */}
      {installSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[700] px-4 py-2 bg-emerald-950 border border-emerald-500/60 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold text-emerald-300 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>AeroShield installed! Accessible anytime from your home screen.</span>
        </div>
      )}
    </>
  );
};
