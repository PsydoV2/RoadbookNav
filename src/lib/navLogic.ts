// Navigation decision logic, kept free of React and browser APIs so it can be unit-tested.

import { haversineMeters } from './geo';

// ── Waypoint crossing ─────────────────────────────────────────────────────────

export type AdvanceReason = 'cross' | 'overshoot';

// How far the rider must get (in trigger radii) before overshoot detection arms
export const OVERSHOOT_ARM_FACTOR = 2.5;

/**
 * Decide whether the current waypoint is passed.
 * - 'cross': inside the trigger radius.
 * - 'overshoot': we clearly approached (within ARM_FACTOR × radius) but never tripped
 *   the radius, and are now moving away by a full radius beyond the closest point —
 *   treat it as passed so navigation never stalls.
 */
export function evaluateWaypoint(distM: number, minDistM: number, radiusM: number): AdvanceReason | null {
  if (distM < radiusM) return 'cross';
  const armed = minDistM < radiusM * OVERSHOOT_ARM_FACTOR;
  if (armed && distM > minDistM + radiusM) return 'overshoot';
  return null;
}

// ── Approach warning ──────────────────────────────────────────────────────────

export const APPROACH_LEAD_S = 9;
export const APPROACH_DEFAULT_M = 150;
export const APPROACH_MIN_M = 80;
export const APPROACH_MAX_M = 400;

// Warn ~9 s before the waypoint at the current speed; fixed 150 m while speed is unknown
export function approachDistance(speedMps: number | null): number {
  if (speedMps === null || !Number.isFinite(speedMps) || speedMps <= 0) return APPROACH_DEFAULT_M;
  return Math.min(APPROACH_MAX_M, Math.max(APPROACH_MIN_M, speedMps * APPROACH_LEAD_S));
}

// ── Trip meter / track recording ──────────────────────────────────────────────

export interface Fix {
  lat: number;
  lon: number;
  accuracy: number;  // metres
  time: number;      // ms epoch
}

export const ODO_MAX_ACCURACY_M = 30;
export const ODO_MIN_STEP_M = 5;
export const ODO_MAX_SPEED_MPS = 70;   // ~250 km/h — anything faster is a GPS jump

/**
 * Whether a new fix should extend the trip meter, and by how much.
 * Small steps are held back (not accepted) so standing still does not add up jitter;
 * the anchor only moves once the rider has really moved.
 */
export function odometerStep(anchor: Fix | null, fix: Fix): { accept: boolean; meters: number } {
  if (fix.accuracy > ODO_MAX_ACCURACY_M) return { accept: false, meters: 0 };
  if (!anchor) return { accept: true, meters: 0 };
  const d = haversineMeters(anchor.lat, anchor.lon, fix.lat, fix.lon);
  const minStep = Math.max(ODO_MIN_STEP_M, Math.min(anchor.accuracy, fix.accuracy) * 0.5);
  if (d < minStep) return { accept: false, meters: 0 };
  const dt = (fix.time - anchor.time) / 1000;
  if (dt > 0 && d / dt > ODO_MAX_SPEED_MPS) return { accept: false, meters: 0 };
  return { accept: true, meters: d };
}

// Speed between two fixes in m/s, or null when not computable
export function speedBetween(a: Fix | null, b: Fix): number | null {
  if (!a) return null;
  const dt = (b.time - a.time) / 1000;
  if (dt <= 0) return null;
  return haversineMeters(a.lat, a.lon, b.lat, b.lon) / dt;
}

// ── GPS status ────────────────────────────────────────────────────────────────

// Short gaps (trees, tunnels) are normal — only warn after this long without a fix
export const GPS_LOST_AFTER_MS = 15000;

export function gpsErrorMessage(code: number): string {
  switch (code) {
    case 1: return 'Location permission denied. Allow location access for this site in your browser settings.';
    case 2: return 'No GPS fix. Move to open sky.';
    default: return 'Searching for GPS signal…';
  }
}
