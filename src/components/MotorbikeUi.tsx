'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NavSettings, TriggerRadius, Waypoint } from '@/types/navigation';
import { APPROACH_DISTANCE_M, ARROW_FILE, DEFAULT_NAV_SETTINGS } from '@/types/navigation';
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

// Initial bearing (forward azimuth) from point 1 → point 2, in degrees (0 = north)
function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
  return `${Math.round(meters)} m`;
}

// ── Arrow display ─────────────────────────────────────────────────────────────


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

// ── Long-press exit button ────────────────────────────────────────────────────

function LongPressExit({ onExit }: { onExit: () => void }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const HOLD_MS = 1200;

  const startHold = () => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / HOLD_MS, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onExit();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const r = 20;
  const circ = 2 * Math.PI * r;

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className="cursor-pointer w-14 h-14 flex-shrink-0 flex items-center justify-center relative select-none touch-none"
      aria-label="Hold to exit navigation"
    >
      <svg
        className="absolute inset-0 -rotate-90"
        width={56}
        height={56}
        viewBox="0 0 56 56"
      >
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
        {progress > 0 && (
          <circle
            cx={28} cy={28} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2.5}
            strokeDasharray={`${progress * circ} ${circ}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className={`text-xl z-10 transition-colors ${progress > 0 ? 'text-white' : 'text-gray-500'}`}>✕</span>
    </button>
  );
}

// ── Dev flag ──────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development';

// ── Main component ────────────────────────────────────────────────────────────

export default function MotorbikeUi({ waypoints, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isApproaching, setIsApproaching] = useState(false);
  const [relBearing, setRelBearing] = useState<number | null>(null); // bearing to next wp relative to heading
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NavSettings>(DEFAULT_NAV_SETTINGS);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioCtxRef = useRef<AudioCtx | null>(null);
  const advancedRef = useRef(false);
  const approachFiredRef = useRef(false);
  const minDistRef = useRef(Infinity);   // closest distance reached for current wp (overshoot detection)
  const settingsRef = useRef(settings);  // read live settings inside the GPS watch without re-subscribing

  const current = waypoints[currentIndex] ?? null;
  const isFinished = currentIndex >= waypoints.length;

  // ── Load settings ─────────────────────────────────────────────────────────

  useEffect(() => { setSettings(loadSettings()); }, []);

  // Mirror settings into a ref so the GPS watch reads live values without re-subscribing
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const handleToggle = (key: keyof NavSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  const handleChangeTrigger = (radius: TriggerRadius) => {
    const next = { ...settings, triggerRadius: radius };
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
    minDistRef.current = Infinity;
    setIsApproaching(false);

    // Single advance path — fired by either entering the trigger radius or overshooting it
    const advance = () => {
      advancedRef.current = true;
      setIsApproaching(false);
      const s = settingsRef.current;
      const audio = audioCtxRef.current;
      if (audio && s.audioCrossed) playCrossed(audio);
      if (s.vibration) navigator.vibrate?.(400);
      setCurrentIndex((i) => i + 1);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        setGpsAccuracy(pos.coords.accuracy);
        const d = haversineMeters(pos.coords.latitude, pos.coords.longitude, current.lat, current.lon);
        setDistance(d);
        if (d < minDistRef.current) minDistRef.current = d;

        const s = settingsRef.current;
        const audio = audioCtxRef.current;

        // Heading-relative bearing to the waypoint (only when the compass is enabled
        // and the device reports a heading — typically while actually moving)
        if (s.showCompass) {
          const h = pos.coords.heading;
          if (h !== null && !Number.isNaN(h)) {
            const brg = bearingDeg(pos.coords.latitude, pos.coords.longitude, current.lat, current.lon);
            setRelBearing(((brg - h + 540) % 360) - 180);
          } else {
            setRelBearing(null);
          }
        }

        if (d < APPROACH_DISTANCE_M && !approachFiredRef.current) {
          approachFiredRef.current = true;
          setIsApproaching(true);
          if (audio && s.audioApproach) playApproach(audio);
        }

        if (advancedRef.current) return;

        // Normal cross: inside the trigger radius
        if (d < s.triggerRadius) {
          advance();
          return;
        }

        // Overshoot recovery: we clearly approached the waypoint (got within ~2.5× radius)
        // but the radius itself was never tripped, and we are now moving away by a full
        // radius beyond the closest point — treat it as passed so navigation never stalls.
        const armed = minDistRef.current < s.triggerRadius * 2.5;
        if (armed && d > minDistRef.current + s.triggerRadius) {
          advance();
        }
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [current]);

  // ── Debug helpers ─────────────────────────────────────────────────────────

  const handleSkip = () => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    setIsApproaching(false);
    const audio = audioCtxRef.current;
    if (audio && settings.audioCrossed) playCrossed(audio);
    if (settings.vibration) navigator.vibrate?.(400);
    setCurrentIndex((i) => i + 1);
  };

  const debugPrev = () => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    setIsApproaching(false);
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const debugNext = () => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    setIsApproaching(false);
    const audio = audioCtxRef.current;
    if (audio && settings.audioCrossed) playCrossed(audio);
    if (settings.vibration) navigator.vibrate?.(400);
    setCurrentIndex((i) => i + 1);
  };

  // ── Finished screen ───────────────────────────────────────────────────────

  if (isFinished) {
    return (
      <div className="w-screen h-[100dvh] bg-black flex flex-col items-center justify-center gap-6 select-none">
        <div className="w-72 h-72 rounded-full bg-[#222] flex items-center justify-center">
          <ArrowDisplay arrowType="finish" />
        </div>
        <p className="text-3xl font-black">Route complete.</p>
        <button
          onClick={onExit}
          className="cursor-pointer mt-4 px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl transition-all hover:bg-gray-200 active:scale-95"
        >
          Back to overview
        </button>
      </div>
    );
  }

  // ── GPS accuracy dot ──────────────────────────────────────────────────────

  const accuracyColor =
    gpsAccuracy === null ? 'bg-gray-700' :
    gpsAccuracy <= 10    ? 'bg-green-400' :
    gpsAccuracy <= 30    ? 'bg-yellow-400' :
                           'bg-red-400';

  // ── Nav screen ────────────────────────────────────────────────────────────

  const showSecondaryRow = settings.showOdometer || (settings.showNextPreview && nextWp);

  return (
    <div className="w-screen h-[100dvh] bg-black flex flex-col justify-between items-center py-10 select-none">

      {/* Top bar */}
      <div className="w-full flex items-center px-3 gap-1">
        <LongPressExit onExit={onExit} />

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

        {/* GPS accuracy dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ml-1 ${accuracyColor}`}
          title={gpsAccuracy !== null ? `GPS ±${Math.round(gpsAccuracy)} m` : 'Waiting for GPS'}
        />

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => {
              advancedRef.current = false;
              approachFiredRef.current = false;
              setIsApproaching(false);
              setCurrentIndex((i) => Math.max(0, i - 1));
            }}
            disabled={currentIndex === 0}
            className="cursor-pointer text-sm text-gray-500 hover:text-gray-200 active:text-white transition-colors px-4 min-h-[56px] disabled:opacity-25 disabled:pointer-events-none min-w-[72px] text-center"
            aria-label="Previous waypoint"
          >
            ← Prev
          </button>
          <button
            onClick={handleSkip}
            className="cursor-pointer text-sm text-gray-500 hover:text-gray-200 active:text-white transition-colors px-4 min-h-[56px] min-w-[72px] text-center"
            aria-label="Skip waypoint"
          >
            Skip →
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="cursor-pointer w-14 h-14 flex items-center justify-center text-gray-500 hover:text-gray-300 active:text-white transition-colors"
            aria-label="Nav settings"
          >
            <SettingsIcon />
          </button>
          {settings.showCounter && (
            <span className="text-sm text-gray-600 tabular-nums w-14 text-right">
              {currentIndex + 1} / {waypoints.length}
            </span>
          )}
        </div>
      </div>

      {/* GPS error — prominent warning */}
      {gpsError && (
        <div className="w-full px-5">
          <div className="bg-red-950/80 border border-red-500/40 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 font-bold text-base">GPS signal lost</p>
            <p className="text-red-400/70 text-xs mt-0.5">{gpsError}</p>
          </div>
        </div>
      )}

      {/* Arrow circle */}
      <div className="relative flex-shrink-0" style={{ width: 'min(72vw, 18rem)', height: 'min(72vw, 18rem)' }}>
        {isApproaching && (
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
        )}
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center transition-colors duration-500 ${
            gpsError
              ? 'bg-red-950/60'
              : isApproaching
              ? 'bg-amber-950/80'
              : 'bg-[#222]'
          }`}
        >
          {current && <ArrowDisplay arrowType={current.arrowType} />}
        </div>

        {/* Compass tick — points to the next waypoint relative to travel direction */}
        {settings.showCompass && relBearing !== null && !gpsError && (
          <div
            className="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${relBearing}deg)` }}
            aria-hidden
          >
            <svg
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: -3 }}
              width={20} height={15} viewBox="0 0 20 15"
            >
              <path d="M10 0L19 14H1L10 0Z" fill="rgba(251,191,36,0.95)" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="flex flex-col items-center gap-2 px-6 text-center w-full max-w-xs">

        {/* Main distance */}
        <span className={`text-[clamp(2.75rem,15vw,3.75rem)] font-black tabular-nums leading-none whitespace-nowrap ${gpsError ? 'text-red-400' : 'text-white'}`}>
          {distance !== null ? formatDistance(distance) : '—'}
        </span>

        {/* Waypoint label */}
        {settings.showLabel && current?.label && (
          <span className="text-xl text-white mt-1">
            <span className="text-gray-500">→ </span>{current.label}
          </span>
        )}

        {/* Secondary row: odometer + next preview */}
        {showSecondaryRow && (
          <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-white/10">

            {settings.showOdometer && (
              <span className="text-gray-500 text-sm tabular-nums">
                {formatDistance(odometerM)}
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
          onToggle={handleToggle}
          onChangeTrigger={handleChangeTrigger}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}
