'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Waypoint } from '@/types/navigation';

interface Props {
  waypoints: Waypoint[];
  onExit: () => void;
}

// ── Haversine ────────────────────────────────────────────────────────────────

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

function ArrowDisplay({ arrowType }: { arrowType: Waypoint['arrowType'] }) {
  const file = ARROW_FILE[arrowType];

  if (file) {
    return (
      <img
        src={file}
        alt={arrowType}
        width={210}
        height={210}
        style={{ filter: 'invert(1)' }}
        draggable={false}
      />
    );
  }

  // start: double-ring with centre dot
  if (arrowType === 'start') {
    return (
      <svg viewBox="0 0 24 24" width={210} height={210} fill="none">
        <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.5" fill="white" />
      </svg>
    );
  }

  // finish: circle with checkmark
  return (
    <svg viewBox="0 0 24 24" width={210} height={210} fill="none">
      <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development';

export default function MotorbikeUi({ waypoints, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const advancedRef = useRef(false);

  const current = waypoints[currentIndex];
  const isFinished = currentIndex >= waypoints.length;

  // ── WakeLock ──────────────────────────────────────────────────────────────

  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // not available in this browser
    }
  }, []);

  useEffect(() => {
    acquireWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release();
    };
  }, [acquireWakeLock]);

  // ── Geolocation watch ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!current) return;
    advancedRef.current = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        const d = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          current.lat,
          current.lon,
        );
        setDistance(d);

        if (d < 25 && !advancedRef.current) {
          advancedRef.current = true;
          navigator.vibrate?.(400);
          setCurrentIndex((i) => i + 1);
        }
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [current]);

  // ── Debug helpers (dev only) ──────────────────────────────────────────────

  const debugPrev = () => {
    advancedRef.current = false;
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const debugNext = () => {
    advancedRef.current = false;
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
          className="mt-4 px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl active:scale-95 transition-transform"
        >
          Back to Editor
        </button>
      </div>
    );
  }

  // ── Navigation screen ─────────────────────────────────────────────────────

  return (
    <div className="w-screen h-screen bg-black flex flex-col justify-between items-center py-12 select-none">

      {/* Top bar */}
      <div className="w-full flex items-center px-6">
        <button
          onClick={onExit}
          className="w-14 h-14 flex items-center justify-center text-2xl text-gray-400 active:text-white transition-colors"
          aria-label="Exit navigation"
        >
          ✕
        </button>
        {gpsError && (
          <span className="ml-3 text-xs text-red-400 truncate max-w-xs">{gpsError}</span>
        )}
        <div className="ml-auto text-sm text-gray-600 tabular-nums">
          {currentIndex + 1} / {waypoints.length}
        </div>
      </div>

      {/* Arrow circle */}
      <div className="w-72 h-72 rounded-full bg-[#151515] flex items-center justify-center flex-shrink-0">
        {current && <ArrowDisplay arrowType={current.arrowType} />}
      </div>

      {/* Distance + label */}
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <span className="text-6xl font-black tabular-nums leading-none">
          {distance !== null ? formatDistance(distance) : '—'}
        </span>
        {current?.label && (
          <span className="text-xl text-gray-400 mt-1">→ {current.label}</span>
        )}
      </div>

      {/* Dev debug controls */}
      {IS_DEV && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-400/90 text-black rounded-xl px-3 py-2 z-50 text-xs font-bold shadow-lg">
          <span className="opacity-60 mr-1">DEV</span>
          <button
            onClick={debugPrev}
            disabled={currentIndex === 0}
            className="px-3 py-1.5 bg-black/10 rounded-lg disabled:opacity-30 active:bg-black/20"
          >
            ← Zurück
          </button>
          <span className="opacity-50 tabular-nums">{currentIndex + 1}/{waypoints.length}</span>
          <button
            onClick={debugNext}
            disabled={currentIndex >= waypoints.length}
            className="px-3 py-1.5 bg-black/10 rounded-lg disabled:opacity-30 active:bg-black/20"
          >
            Weiter →
          </button>
        </div>
      )}
    </div>
  );
}
