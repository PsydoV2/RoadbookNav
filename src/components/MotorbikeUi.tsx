'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NavSettings, TriggerRadius, Track } from '@/types/navigation';
import { DEFAULT_NAV_SETTINGS } from '@/types/navigation';
import { bearingDeg, cumulativeDistances, formatDistance, formatTrip, haversineMeters, relativeBearing, decimate } from '@/lib/geo';
import {
  approachDistance,
  evaluateWaypoint,
  GPS_LOST_AFTER_MS,
  gpsErrorMessage,
  odometerStep,
  speedBetween,
  type Fix,
} from '@/lib/navLogic';
import { loadProgress, routeSignature, saveProgress } from '@/lib/navProgress';
import { playApproach, playCrossed, playDanger, unlockAudio } from '@/lib/audio';
import { downloadFile, rideToGpx, safeFilename } from '@/lib/roadbookFile';
import { trackEvent } from '@/lib/analytics';
import ArrowGlyph, { DangerBadge } from './ArrowGlyph';
import { HoldBarButton, HoldRingButton } from './HoldButton';
import NavSettingsPanel from './NavSettingsPanel';

// ── Props ─────────────────────────────────────────────────────────────────────

export type NavMode = 'gps' | 'preview';

interface Props {
  track: Track;
  mode: NavMode;
  resume: boolean;   // continue from saved progress instead of starting at waypoint 1
  onExit: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIP_ADJUST_M = 10;          // rally-style trip meter correction step
const RIDE_MIN_SPACING_M = 15;     // recorded track point spacing
const RIDE_MAX_POINTS = 8000;      // keeps the persisted ride well below localStorage limits
const PERSIST_INTERVAL_MS = 15000;
const FIX_MAX_AGE_FOR_SPEED_MS = 5000;

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

// ── Icons ─────────────────────────────────────────────────────────────────────

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

// Inverting + hue-rotating the whole screen gives a black-on-white sunlight mode
// while keeping red/amber warnings roughly red/amber.
const SUNLIGHT_FILTER = 'invert(1) hue-rotate(180deg)';

type GpsStatus = 'waiting' | 'ok' | 'lost' | 'denied';

function crossedFeedback(s: NavSettings) {
  if (s.audioCrossed) playCrossed();
  if (s.vibration) navigator.vibrate?.(400);
}

function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MotorbikeUi({ track, mode, resume, onExit }: Props) {
  const { waypoints } = track;
  const isPreview = mode === 'preview';

  // Saved progress is read once, synchronously, so the first render already shows the right waypoint
  const [initial] = useState(() => (resume && !isPreview ? loadProgress(track.id, waypoints) : null));

  const [currentIndex, setCurrentIndex] = useState(initial?.index ?? 0);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('waiting');
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [secondsSinceFix, setSecondsSinceFix] = useState<number | null>(null);
  const [isApproaching, setIsApproaching] = useState(false);
  const [relBearing, setRelBearing] = useState<number | null>(null);
  const [tripM, setTripM] = useState(initial?.tripM ?? 0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NavSettings>(DEFAULT_NAV_SETTINGS);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const settingsRef = useRef(settings);           // read live settings inside the GPS watch
  const indexRef = useRef(currentIndex);
  const advancedRef = useRef(false);
  const approachFiredRef = useRef(false);
  const minDistRef = useRef(Infinity);            // closest distance reached for current wp
  const lastFixRef = useRef<Fix | null>(null);
  const lastFixAtRef = useRef<number | null>(null);
  const speedRef = useRef<number | null>(null);
  const odoAnchorRef = useRef<Fix | null>(null);
  const tripRef = useRef(tripM);
  const rideRef = useRef<Fix[]>(initial?.ride ?? []);
  const startedAtRef = useRef(initial?.startedAt ?? Date.now());
  const watchStartedAtRef = useRef(Date.now());

  const current = waypoints[currentIndex] ?? null;
  const isFinished = currentIndex >= waypoints.length;

  // ── Settings ──────────────────────────────────────────────────────────────

  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const updateSettings = (next: NavSettings) => {
    setSettings(next);
    saveSettings(next);
  };
  const handleToggle = (key: keyof NavSettings, value: boolean) => updateSettings({ ...settings, [key]: value });
  const handleChangeTrigger = (radius: TriggerRadius) => updateSettings({ ...settings, triggerRadius: radius });

  // ── Route distances ───────────────────────────────────────────────────────

  const bookDists = useMemo(() => cumulativeDistances(waypoints), [waypoints]);
  const bookM = bookDists[Math.min(currentIndex, waypoints.length - 1)] ?? 0;
  const legM = currentIndex > 0 && current ? bookDists[currentIndex] - bookDists[currentIndex - 1] : 0;

  const nextWp = current ? (waypoints[currentIndex + 1] ?? null) : null;
  const distToNextM = current && nextWp ? haversineMeters(current.lat, current.lon, nextWp.lat, nextWp.lon) : null;

  // ── Persistence ───────────────────────────────────────────────────────────

  const persist = useCallback(() => {
    if (isPreview) return;
    saveProgress(track.id, {
      signature: routeSignature(waypoints),
      index: indexRef.current,
      tripM: tripRef.current,
      ride: rideRef.current,
      startedAt: startedAtRef.current,
      updatedAt: Date.now(),
    });
  }, [isPreview, track.id, waypoints]);

  useEffect(() => {
    indexRef.current = currentIndex;
    persist();
  }, [currentIndex, persist]);

  useEffect(() => {
    if (isPreview) return;
    const id = setInterval(persist, PERSIST_INTERVAL_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') persist(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', persist);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [isPreview, persist]);

  useEffect(() => {
    if (isFinished && !isPreview) trackEvent('route-completed', { waypoints: waypoints.length });
  }, [isFinished, isPreview, waypoints.length]);

  // ── Audio fallback unlock (primary unlock happens on the "Navigate" tap) ──

  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => document.removeEventListener('pointerdown', unlockAudio);
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

  // ── Feedback ──────────────────────────────────────────────────────────────

  // Single path for every waypoint change: auto-advance, skip, prev, preview stepping
  const goTo = useCallback((index: number, feedback: boolean) => {
    const clamped = Math.max(0, Math.min(index, waypoints.length));
    if (feedback) crossedFeedback(settingsRef.current);
    setCurrentIndex(clamped);
  }, [waypoints.length]);

  // Reset per-waypoint state whenever the target changes
  useEffect(() => {
    advancedRef.current = false;
    approachFiredRef.current = false;
    minDistRef.current = Infinity;
    setIsApproaching(false);
    const fix = lastFixRef.current;
    const wp = waypoints[currentIndex];
    setDistance(fix && wp ? haversineMeters(fix.lat, fix.lon, wp.lat, wp.lon) : null);
  }, [currentIndex, waypoints]);

  // ── GPS watch — one subscription for the whole ride ───────────────────────

  useEffect(() => {
    if (isPreview) return;
    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      setGpsMessage('This browser has no GPS access.');
      return;
    }
    watchStartedAtRef.current = Date.now();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: Fix = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          time: pos.timestamp || Date.now(),
        };
        const prev = lastFixRef.current;
        lastFixAtRef.current = Date.now();
        setGpsStatus('ok');
        setGpsMessage(null);
        setSecondsSinceFix(0);
        setGpsAccuracy(fix.accuracy);

        // Speed: device value when available, otherwise derived from the previous fix
        const derived = prev && fix.time - prev.time < FIX_MAX_AGE_FOR_SPEED_MS ? speedBetween(prev, fix) : null;
        const speed = pos.coords.speed ?? derived;
        speedRef.current = speed;

        // Trip meter + recorded ride
        const step = odometerStep(odoAnchorRef.current, fix);
        if (step.accept) {
          odoAnchorRef.current = fix;
          if (step.meters > 0) {
            tripRef.current += step.meters;
            setTripM(tripRef.current);
          }
          const ride = rideRef.current;
          const last = ride[ride.length - 1];
          if (!last || haversineMeters(last.lat, last.lon, fix.lat, fix.lon) >= RIDE_MIN_SPACING_M) {
            ride.push(fix);
            if (ride.length > RIDE_MAX_POINTS) rideRef.current = decimate(ride, RIDE_MAX_POINTS / 2);
          }
        }
        lastFixRef.current = fix;

        const wp = waypoints[indexRef.current];
        if (!wp) return;

        const s = settingsRef.current;
        const d = haversineMeters(fix.lat, fix.lon, wp.lat, wp.lon);
        setDistance(d);
        if (d < minDistRef.current) minDistRef.current = d;

        // Heading-relative bearing to the waypoint. Falls back to the course over ground
        // when the device reports no heading (common on Android while slow).
        if (s.showCompass) {
          let heading = pos.coords.heading;
          if ((heading === null || Number.isNaN(heading)) && prev && speed !== null && speed > 1.5) {
            heading = bearingDeg(prev.lat, prev.lon, fix.lat, fix.lon);
          }
          setRelBearing(
            heading === null || Number.isNaN(heading)
              ? null
              : relativeBearing(bearingDeg(fix.lat, fix.lon, wp.lat, wp.lon), heading),
          );
        }

        if (!approachFiredRef.current && d < approachDistance(speed)) {
          approachFiredRef.current = true;
          setIsApproaching(true);
          if (s.audioApproach) (wp.danger ? playDanger : playApproach)();
          if (s.vibration && wp.danger) navigator.vibrate?.([150, 100, 150, 100, 150]);
        }

        if (advancedRef.current) return;
        if (evaluateWaypoint(d, minDistRef.current, s.triggerRadius)) {
          advancedRef.current = true;
          goTo(indexRef.current + 1, true);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied');
        setGpsMessage(gpsErrorMessage(err.code));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    // Only escalate to "signal lost" after a sustained gap — trees and tunnels cause short ones
    const staleCheck = setInterval(() => {
      const since = lastFixAtRef.current ?? watchStartedAtRef.current;
      const age = Date.now() - since;
      if (lastFixAtRef.current !== null) setSecondsSinceFix(Math.round(age / 1000));
      if (age > GPS_LOST_AFTER_MS) setGpsStatus((s) => (s === 'denied' ? s : 'lost'));
    }, 2000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(staleCheck);
    };
  }, [isPreview, waypoints, goTo]);

  // ── Trip meter controls ───────────────────────────────────────────────────

  const adjustTrip = (delta: number) => {
    tripRef.current = Math.max(0, tripRef.current + delta);
    setTripM(tripRef.current);
  };

  const resetTrip = () => {
    tripRef.current = 0;
    setTripM(0);
    persist();
  };

  const downloadRide = () => {
    const ride = rideRef.current;
    if (ride.length < 2) return;
    const date = new Date(startedAtRef.current).toISOString().slice(0, 10);
    downloadFile(`${safeFilename(track.name)}-ride-${date}.gpx`, rideToGpx(`${track.name} (${date})`, ride), 'application/gpx+xml');
    trackEvent('ride-gpx-downloaded', { points: ride.length });
  };

  const rootStyle = settings.sunlightMode ? { filter: SUNLIGHT_FILTER } : undefined;

  // ── Finished screen ───────────────────────────────────────────────────────

  if (isFinished) {
    const canDownload = !isPreview && rideRef.current.length > 1;
    return (
      <div style={rootStyle} className="w-screen h-[100dvh] bg-black flex flex-col items-center justify-center gap-6 px-6 select-none">
        <div className="w-[min(60vw,16rem)] aspect-square rounded-full bg-[#222] flex items-center justify-center">
          <ArrowGlyph type="finish" size="73%" />
        </div>
        <p className="text-3xl font-black">{isPreview ? 'End of preview.' : 'Route complete.'}</p>
        {!isPreview && (
          <p className="text-gray-400 tabular-nums">
            {formatTrip(tripM)} · {formatDuration(Date.now() - startedAtRef.current)}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          {canDownload && (
            <button
              onClick={downloadRide}
              className="cursor-pointer px-8 py-4 rounded-2xl border border-white/25 text-white font-semibold transition-colors hover:bg-white/10"
            >
              Download ride (GPX)
            </button>
          )}
          {isPreview && (
            <button
              onClick={() => goTo(waypoints.length - 1, false)}
              className="cursor-pointer px-8 py-4 rounded-2xl border border-white/25 text-white font-semibold transition-colors hover:bg-white/10"
            >
              ← Back to last waypoint
            </button>
          )}
          <button
            onClick={onExit}
            className="cursor-pointer px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl transition-all hover:bg-gray-200 active:scale-95"
          >
            Back to overview
          </button>
        </div>
      </div>
    );
  }

  // ── Derived display state ─────────────────────────────────────────────────

  const gpsBad = !isPreview && (gpsStatus === 'lost' || gpsStatus === 'denied');

  const accuracyColor =
    isPreview || gpsAccuracy === null ? 'bg-gray-700' :
    gpsStatus !== 'ok'               ? 'bg-red-400' :
    gpsAccuracy <= 10                ? 'bg-green-400' :
    gpsAccuracy <= 30                ? 'bg-yellow-400' :
                                       'bg-red-400';

  const shownDistance = isPreview ? legM : distance;
  const showSecondaryRow = settings.showOdometer || (settings.showNextPreview && nextWp);

  const sideBtn =
    'cursor-pointer flex-1 h-16 rounded-2xl bg-white/[0.06] text-gray-300 text-base font-semibold transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-25 disabled:pointer-events-none';
  const tripBtn =
    'cursor-pointer w-12 h-12 rounded-xl bg-white/[0.06] text-gray-300 text-xl font-bold transition-colors active:bg-white/20 flex items-center justify-center';

  // ── Nav screen ────────────────────────────────────────────────────────────

  return (
    <div style={rootStyle} className="w-screen h-[100dvh] bg-black flex flex-col items-center py-4 select-none overflow-hidden">

      {/* Top bar */}
      <div className="w-full flex items-center px-3 gap-2 flex-shrink-0">
        <HoldRingButton onComplete={onExit} label="Hold to exit navigation">✕</HoldRingButton>

        {isPreview ? (
          <span className="text-xs font-bold tracking-widest text-sky-300 bg-sky-400/10 border border-sky-400/30 rounded-md px-2 py-1">
            PREVIEW
          </span>
        ) : (
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${accuracyColor}`}
            title={gpsAccuracy !== null ? `GPS ±${Math.round(gpsAccuracy)} m` : 'Waiting for GPS'}
          />
        )}

        <div className="ml-auto flex items-center gap-1">
          {settings.showCounter && (
            <span className="text-base text-gray-500 tabular-nums px-2">
              {currentIndex + 1} / {waypoints.length}
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="cursor-pointer w-14 h-14 flex items-center justify-center text-gray-500 hover:text-gray-300 active:text-white transition-colors"
            aria-label="Nav settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* GPS status */}
      {!isPreview && gpsStatus === 'waiting' && (
        <p className="text-gray-500 text-sm mt-1">{gpsMessage ?? 'Searching for GPS signal…'}</p>
      )}
      {gpsBad && (
        <div className="w-full px-5 mt-1 flex-shrink-0">
          <div className="bg-red-950/80 border border-red-500/40 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 font-bold text-base">
              {gpsStatus === 'denied' ? 'No location access' : 'GPS signal lost'}
            </p>
            <p className="text-red-400/70 text-xs mt-0.5">
              {gpsStatus === 'denied'
                ? gpsMessage
                : secondsSinceFix !== null
                ? `Last fix ${secondsSinceFix} s ago. The distance may be outdated.`
                : 'No GPS fix yet. Move to open sky.'}
            </p>
          </div>
        </div>
      )}

      {/* Main: arrow + info — stacked in portrait, side by side in landscape */}
      <div className="flex-1 w-full flex flex-col landscape:flex-row items-center justify-evenly gap-4 px-4 min-h-0">

        {/* Arrow circle */}
        <div className="relative flex-shrink-0 aspect-square w-[min(72vw,18rem)] landscape:w-[min(55vh,18rem)]">
          {isApproaching && (
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
          )}
          <div
            className={`absolute inset-0 rounded-full flex items-center justify-center transition-colors duration-500 ${
              gpsBad ? 'bg-red-950/60' : isApproaching ? 'bg-amber-950/80' : 'bg-[#222]'
            }`}
          >
            {current && <ArrowGlyph type={current.arrowType} exit={current.exit} size="73%" />}
          </div>

          {current?.danger && (
            <div className="absolute -top-1 -right-1">
              <DangerBadge level={current.danger} size="lg" />
            </div>
          )}

          {/* Compass tick — points to the waypoint relative to travel direction */}
          {settings.showCompass && !isPreview && relBearing !== null && !gpsBad && (
            <div
              className="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${relBearing}deg)` }}
              aria-hidden
            >
              <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: -3 }} width={20} height={15} viewBox="0 0 20 15">
                <path d="M10 0L19 14H1L10 0Z" fill="rgba(251,191,36,0.95)" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col items-center gap-2 text-center w-full max-w-xs">
          <span
            className={`text-[clamp(2.75rem,15vw,4rem)] landscape:text-[clamp(2.5rem,9vw,4rem)] font-black tabular-nums leading-none whitespace-nowrap ${
              gpsBad ? 'text-red-400' : 'text-white'
            }`}
          >
            {shownDistance !== null ? formatDistance(shownDistance) : '—'}
          </span>
          {isPreview && (
            <span className="text-xs text-gray-500 uppercase tracking-widest">straight line from previous</span>
          )}

          {current?.arrowType === 'roundabout' && current.exit && (
            <span className="text-lg font-bold text-white">Exit {current.exit}</span>
          )}

          {settings.showLabel && current?.label && (
            <span className="text-xl text-white mt-1">
              <span className="text-gray-500">→ </span>{current.label}
            </span>
          )}

          {showSecondaryRow && (
            <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-white/10 gap-2">
              {settings.showOdometer && (
                isPreview ? (
                  <div className="flex flex-col items-start">
                    <span className="text-gray-300 text-lg tabular-nums font-bold">{formatTrip(bookM)}</span>
                    <span className="text-gray-600 text-[11px] uppercase tracking-wider">route km</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => adjustTrip(-TRIP_ADJUST_M)} className={tripBtn} aria-label="Trip meter minus 10 metres">−</button>
                    <div className="flex flex-col items-center min-w-[5.5rem]">
                      <span className="text-white text-lg tabular-nums font-bold leading-tight">{formatTrip(tripM)}</span>
                      <span className="text-gray-600 text-[11px] tabular-nums leading-tight" title="Straight-line route distance from start to this waypoint">
                        route {formatTrip(bookM)}
                      </span>
                    </div>
                    <button onClick={() => adjustTrip(TRIP_ADJUST_M)} className={tripBtn} aria-label="Trip meter plus 10 metres">+</button>
                  </div>
                )
              )}

              {settings.showNextPreview && nextWp && distToNextM !== null && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <ArrowGlyph type={nextWp.arrowType} exit={nextWp.exit} size={18} tone="muted" />
                  {nextWp.danger && <DangerBadge level={nextWp.danger} />}
                  <span className="text-gray-500 text-sm tabular-nums">{formatDistance(distToNextM)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls — large targets for gloves; skip needs a short hold */}
      <div className="w-full flex gap-3 px-4 pt-2 flex-shrink-0">
        <button
          onClick={() => goTo(currentIndex - 1, false)}
          disabled={currentIndex === 0}
          className={sideBtn}
          aria-label="Previous waypoint"
        >
          ← Prev
        </button>
        {isPreview ? (
          <button onClick={() => goTo(currentIndex + 1, true)} className={sideBtn} aria-label="Next waypoint">
            Next →
          </button>
        ) : (
          <HoldBarButton onComplete={() => goTo(currentIndex + 1, true)} label="Hold to skip waypoint" className={sideBtn}>
            Hold to skip →
          </HoldBarButton>
        )}
      </div>

      {showSettings && (
        <NavSettingsPanel
          settings={settings}
          onToggle={handleToggle}
          onChangeTrigger={handleChangeTrigger}
          onClose={() => setShowSettings(false)}
          trip={isPreview ? undefined : {
            meters: tripM,
            canDownload: rideRef.current.length > 1,
            onReset: resetTrip,
            onDownload: downloadRide,
          }}
        />
      )}
    </div>
  );
}
