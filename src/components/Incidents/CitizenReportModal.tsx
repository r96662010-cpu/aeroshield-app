import React, { useState } from 'react';
import { IncidentReport, CityConfig } from '../../types';
import { AlertTriangle, Flame, Factory, Wind, Car, CheckCircle2, X, Send, Loader2, WifiOff, Camera } from 'lucide-react';

interface CitizenReportModalProps {
  city: CityConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: IncidentReport) => void;
}

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  city,
  isOpen,
  onClose,
  onSubmitReport
}) => {
  const [category, setCategory] = useState<IncidentReport['category']>('biomass_burning');
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState((city.popularPlaces && city.popularPlaces[0]?.name) || city.name);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [reporterName, setReporterName] = useState('Citizen Reporter');
  const [photoDescription, setPhotoDescription] = useState('');
  
  // Submission lifecycle states: 'idle' | 'submitting' | 'success' | 'queued_offline' | 'error'
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'queued_offline' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 5) {
      setErrorMessage('Please provide a descriptive title (at least 5 characters).');
      return;
    }
    if (!locationName.trim() || locationName.trim().length < 3) {
      setErrorMessage('Please provide a specific street or neighborhood location.');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    // Approximate coords from selected place or city center
    const matchedPlace = (city.popularPlaces || []).find((p) => p.name === locationName);
    const coords: [number, number] = matchedPlace
      ? matchedPlace.coords
      : [city.center[0] + (Math.random() - 0.5) * 0.03, city.center[1] + (Math.random() - 0.5) * 0.03];

    const aqiImpact = category === 'industrial_violation' ? 120 : category === 'biomass_burning' ? 85 : 65;

    const notesWithMedia = [
      evidenceNotes.trim(),
      photoDescription.trim() ? `[Photo Observation: ${photoDescription.trim()}]` : ''
    ].filter(Boolean).join(' · ') || 'Visual report logged via AeroShield Citizen mobile portal.';

    const newReport: IncidentReport = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      category,
      locationName: locationName.trim(),
      coords,
      aqiImpact,
      reportedBy: `${reporterName.trim() || 'Citizen'} (Public App)`,
      reportedAt: 'Just now',
      status: 'investigating',
      evidenceNotes: notesWithMedia
    };

    // If device is offline, store in local offline queue
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const existingQueue = JSON.parse(localStorage.getItem('aeroshield_offline_incident_queue') || '[]');
        existingQueue.push({ ...newReport, queuedAt: Date.now() });
        localStorage.setItem('aeroshield_offline_incident_queue', JSON.stringify(existingQueue));
      } catch {}

      onSubmitReport(newReport);
      setStatus('queued_offline');
      setTimeout(() => {
        setStatus('idle');
        setTitle('');
        setEvidenceNotes('');
        setPhotoDescription('');
        onClose();
      }, 2400);
      return;
    }

    // Try posting to backend API
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newReport.title,
          category: newReport.category,
          locationName: newReport.locationName,
          coords: newReport.coords,
          evidenceNotes: newReport.evidenceNotes,
          reportedBy: newReport.reportedBy
        })
      });

      if (!res.ok) {
        throw new Error('Server returned error status');
      }

      const data = await res.json();
      onSubmitReport(data.incident || newReport);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setTitle('');
        setEvidenceNotes('');
        setPhotoDescription('');
        onClose();
      }, 1800);
    } catch {
      // Fallback: Buffer locally on device so report is never lost
      try {
        const existingQueue = JSON.parse(localStorage.getItem('aeroshield_offline_incident_queue') || '[]');
        existingQueue.push({ ...newReport, queuedAt: Date.now() });
        localStorage.setItem('aeroshield_offline_incident_queue', JSON.stringify(existingQueue));
      } catch {}

      onSubmitReport(newReport);
      setStatus('queued_offline');
      setTimeout(() => {
        setStatus('idle');
        setTitle('');
        setEvidenceNotes('');
        setPhotoDescription('');
        onClose();
      }, 2400);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-red-950/60 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Report Pollution Violation</h2>
              <p className="text-[11px] text-neutral-400">
                Direct dispatch to Municipal Air Quality Enforcement Cell
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh]">
          {status === 'success' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Incident Transmitted Successfully</h3>
              <p className="text-xs text-neutral-300 max-w-xs leading-relaxed">
                Your report has been assigned a tracking identifier and queued for municipal field inspection.
              </p>
            </div>
          ) : status === 'queued_offline' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Saved Locally (Offline Buffer)</h3>
              <p className="text-xs text-amber-200 max-w-xs leading-relaxed">
                Network connection is currently unavailable. Your report has been stored securely in your device storage and will automatically synchronize with municipal servers once connectivity is restored.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Category Picker */}
              <div>
                <label className="text-neutral-400 font-semibold block mb-1.5">
                  Violation Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('biomass_burning')}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      category === 'biomass_burning'
                        ? 'bg-red-950/60 border-red-500 text-red-200'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-[11px]">Biomass Burning</span>
                      <span className="text-[9px] opacity-75">Garbage / Leaves / Stubble</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('construction_dust')}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      category === 'construction_dust'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Wind className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-[11px]">Construction Dust</span>
                      <span className="text-[9px] opacity-75">Uncovered debris / demolitions</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('industrial_violation')}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      category === 'industrial_violation'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Factory className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-[11px]">Industrial Discharge</span>
                      <span className="text-[9px] opacity-75">Dense unscrubbed chimneys</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('heavy_traffic_congestion')}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      category === 'heavy_traffic_congestion'
                        ? 'bg-orange-950/60 border-orange-500 text-orange-200'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Car className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <span className="font-semibold block text-[11px]">Vehicular Gridlock</span>
                      <span className="text-[9px] opacity-75">Commercial diesel idling</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Incident Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Uncovered dry cement hauling causing severe dust plume"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500/70"
                />
              </div>

              {/* Location Input */}
              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Location / Neighborhood *
                </label>
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Punjabi Bagh Ring Road intersection"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500/70"
                />
              </div>

              {/* Evidence & Photo Description */}
              <div>
                <label className="text-neutral-400 font-semibold block mb-1 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Visual Evidence / Photo Description (Optional)</span>
                </label>
                <input
                  type="text"
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  placeholder="e.g. White dump truck #DL-1GC-4421 emitting dense particulate plume"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                />
              </div>

              {/* Detailed Notes */}
              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Additional Field Observations
                </label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Note wind direction, intensity, and nearby schools or hospitals..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500/70 resize-none"
                />
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Report...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Official Incident Report</span>
                    </>
                  )}
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
          )}
        </div>
      </div>
    </div>
  );
};
