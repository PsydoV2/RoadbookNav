'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NavSettings, Waypoint } from '@/types/navigation';
import { DEFAULT_NAV_SETTINGS } from '@/types/navigation';
import NavSettingsPanel from './NavSettingsPanel';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  waypoints: Waypoint[];
  onExit: () => void;
}

// ── Geo utils ─────────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

// ── Arrow display ─────────────────────────────────────────────────────────────

const ARROW_FILE: Partial<Record<Waypoint['arrowType'], string>> = {
  straight:       '/arrows/arrow-up-sm-svgrepo-com.svg',
  left:           '/arrows/arrow-left-sm-svgrepo-com.svg',
  right:          '/arrows/arrow-right-sm-svgrepo-com.svg',
  'slight-left':  '/arrows/arrow-up-left-sm-svgrepo-com.svg',
  'slight-right': '/arrows/arrow-up-right-sm-svgrepo-com.svg',
  'u-turn':       '/arrows/arrow-down-sm-svgrepo-com.svg',
};

function ArrowDisplay({ arrowType, size = 210 }: { arrowType: Waypoint['arrowType']; size?: number }) {
  const file = ARROW_FILE[arrowType];
  if (file) {
    return <img src={file} alt={arrowType} width={size} height={size} style={{ filter: 'invert(1)' }} draggable={false} />;
  }
  if (arrowType === 'start') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.5" fill="white" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Audio ─────────────────────────────────────────────────────────────────────

type AudioCtx = AudioContext & { webkitAudioContext?: never };

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AC ? new AC() : null;
}

function playTones(ctx: AudioContext, tones: Array<{ freq: number; dur: number; t?: number }>) {
  tones.forEach(({ freq, dur, t = 0 }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = ctx.currentTime + t;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.5, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  });
}

const playApproach = (ctx: AudioContext) =>
  playTones(ctx, [{ freq: 880, dur: 0.28 }]);

const playCrossed = (ctx: AudioContext) =>
  playTones(ctx, [
    { freq: 1100, dur: 0.15 },
    { freq: 1100, dur: 0.15, t: 0.22 },
  ]);

// ── Settings persistence ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'roadbook_nav_settings';

function loadSettings(): NavSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_NAV_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_NAV_SETTINGS };
}

function saveSettings(s: NavSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Gear icon ─────────────────────────────────────────────────────────────────

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="8"  cy="6"  r="2.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="18" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Dev flag ──────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development';

// ── Main component ────────────────────────────────────────────────────────────

export default function MotorbikeUi({ waypoints, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NavSettings>(DEFAULT_NAV_SETTINGS);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioCtxRef = useRef<AudioCtx | null>(null);
  const advancedRef = useRef(false);
  const approachFiredRef = useRef(false);

  const current = waypoints[currentIndex] ?? null;
  const isFinished = currentIndex >= waypoints.length;

  // ── Load settings ─────────────────────────────────────────────────────────

  useEffect(() => { setSettings(loadSettings()); }, []);

  const handleSettingChange = (key: keyof NavSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  // ── Odometer (pre-computed cumulative distances) ───────────────────────────

  const cumulativeDists = useMemo(() => {
    const d = [0];
    for (let i = 1; i < waypoints.length; i++) {
      d.push(d[i - 1] + haversineMeters(
        waypoints[i - 1].lat, waypoints[i - 1].lon,
        waypoints[i].lat, waypoints[i].lon,
      ));
    }
    return d;
  }, [waypoints]);

  // Distance covered = cumulative dist up to the last crossed waypoint
  const odometerM = currentIndex > 0 ? (cumulativeDists[currentIndex - 1] ?? 0) : 0;

  // ── Next waypoint preview ─────────────────────────────────────────────────

  const nextWp = current ? (waypoints[currentIndex + 1] ?? null) : null;
  const distToNextM = current && nextWp
    ? haversineMeters(current.lat, current.lon, nextWp.lat, nextWp.lon)
    : null;

  // ── Audio context ─────────────────────────────────────────────────────────

  useEffect(() => {
    const ctx = createAudioContext();
    if (!ctx) return;
    audioCtxRef.current = ctx as AudioCtx;
    const unlock = () => { if (ctx.state === 'suspended') ctx.resume(); };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      ctx.close();
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // ── WakeLock ──────────────────────────────────────────────────────────────

  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch { /* not available */ }
  }, []);

  useEffect(() => {
    acquireWakeLock();
    const onVisibility = () => { if (document.visibilityState === 'visible') acquireWakeLock(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release();
    };
  }, [acquireWakeLock]);

  // ── GPS watch ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!current) return;
    advancedRef.current = false;
    approachFiredRef.current = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        const d = haversineMeters(pos.coords.latitude, pos.coords.longitude, current.lat, current.lon);
        setDistance(d);

        const audio = audioCtxRef.current;

        if (d < 150 && !approachFiredRef.current) {
          approachFiredRef.current = true;
          if (audio && settings.audioApproach) playApproach(audio);
        }

        if (d < 25 && !advancedRef.current) {
          advancedRef.current = true;
          if (audio && settings.audioCrossed) playCrossed(audio);
          navigator.vibrate?.(400);
          setCurrentIndex((i) => i + 1);
        }
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [current, settings.audioApproach, settings.audioCrossed]);

  // ── Debug helpers ─────────────────────────────────────────────────────────

  const handleSkip = () => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    setCurrentIndex((i) => i + 1);
  };

  const debugPrev = () => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const debugNext = () => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    const audio = audioCtxRef.current;
    if (audio && settings.audioCrossed) playCrossed(audio);
    navigator.vibrate?.(400);
    setCurrentIndex((i) => i + 1);
  };

  // ── Finished screen ───────────────────────────────────────────────────────

  if (isFinished) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center gap-6 select-none">
        <div className="w-72 h-72 rounded-full bg-[#151515] flex items-center justify-center">
          <ArrowDisplay arrowType="finish" />
        </div>
        <p className="text-3xl font-black">Destination reached.</p>
        <button
          onClick={onExit}
          className="cursor-pointer mt-4 px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl transition-all hover:bg-gray-200 active:scale-95"
        >
          Back to Editor
        </button>
      </div>
    );
  }

  // ── Nav screen ────────────────────────────────────────────────────────────

  const showSecondaryRow = settings.showOdometer || (settings.showNextPreview && nextWp);

  return (
    <div className="w-screen h-screen bg-black flex flex-col justify-between items-center py-12 select-none">

      {/* Top bar */}
      <div className="w-full flex items-center px-5 gap-2">
        <button
          onClick={onExit}
          className="cursor-pointer w-14 h-14 flex-shrink-0 flex items-center justify-center text-2xl text-gray-400 hover:text-gray-200 active:text-white transition-colors"
          aria-label="Exit navigation"
        >
          ✕
        </button>

        {IS_DEV && (
          <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/35 text-yellow-400 rounded-lg px-2 py-1.5 text-xs font-bold">
            <button
              onClick={debugPrev}
              disabled={currentIndex === 0}
              className="px-2 py-0.5 rounded disabled:opacity-30 active:bg-yellow-400/20"
            >←</button>
            <span className="px-1 opacity-70 tabular-nums">{currentIndex + 1}/{waypoints.length}</span>
            <button
              onClick={debugNext}
              disabled={isFinished}
              className="px-2 py-0.5 rounded disabled:opacity-30 active:bg-yellow-400/20"
            >→</button>
          </div>
        )}

        {gpsError && (
          <span className="text-xs text-red-400 truncate">{gpsError}</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => {
              advancedRef.current = false;
              approachFiredRef.current = false;
              setCurrentIndex((i) => Math.max(0, i - 1));
            }}
            disabled={currentIndex === 0}
            className="cursor-pointer text-xs text-gray-600 hover:text-gray-300 active:text-white transition-colors px-1 py-1 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous waypoint"
          >
            ← Back
          </button>
          <button
            onClick={handleSkip}
            className="cursor-pointer text-xs text-gray-600 hover:text-gray-300 active:text-white transition-colors px-1 py-1"
            aria-label="Skip waypoint"
          >
            Skip →
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="cursor-pointer w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-300 active:text-white transition-colors"
            aria-label="Nav settings"
          >
            <SettingsIcon />
          </button>
          {settings.showCounter && (
            <span className="text-sm text-gray-600 tabular-nums w-12 text-right">
              {currentIndex + 1} / {waypoints.length}
            </span>
          )}
        </div>
      </div>

      {/* Arrow circle */}
      <div className="w-72 h-72 rounded-full bg-[#151515] flex items-center justify-center flex-shrink-0">
        {current && <ArrowDisplay arrowType={current.arrowType} />}
      </div>

      {/* Bottom info */}
      <div className="flex flex-col items-center gap-2 px-6 text-center w-full max-w-xs">

        {/* Main distance */}
        <span className="text-6xl font-black tabular-nums leading-none whitespace-nowrap">
          {distance !== null ? formatDistance(distance) : '—'}
        </span>

        {/* Waypoint label */}
        {settings.showLabel && current?.label && (
          <span className="text-xl text-gray-400 mt-1">→ {current.label}</span>
        )}

        {/* Secondary row: odometer + next preview */}
        {showSecondaryRow && (
          <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-white/10">

            {settings.showOdometer && (
              <span className="text-gray-500 text-sm tabular-nums">
                km {(odometerM / 1000).toFixed(1)}
              </span>
            )}

            {settings.showNextPreview && nextWp && distToNextM !== null && (
              <div className="flex items-center gap-1.5 ml-auto">
                {ARROW_FILE[nextWp.arrowType] ? (
                  <img
                    src={ARROW_FILE[nextWp.arrowType]}
                    width={14}
                    height={14}
                    alt={nextWp.arrowType}
                    style={{ filter: 'invert(0.4)' }}
                    draggable={false}
                  />
                ) : (
                  <span className="text-gray-600 text-xs">
                    {nextWp.arrowType === 'finish' ? '✓' : '○'}
                  </span>
                )}
                <span className="text-gray-500 text-sm tabular-nums">
                  {formatDistance(distToNextM)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <NavSettingsPanel
          settings={settings}
          onChange={handleSettingChange}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}
