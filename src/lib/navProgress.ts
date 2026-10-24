// Ride progress per track, persisted so a killed tab or an accidental exit can resume
// at the same waypoint with the same trip meter and recorded track.

import type { Waypoint } from '@/types/navigation';
import type { Fix } from './navLogic';

export interface NavProgress {
  signature: string;   // waypoint ids — progress is dropped when the route was edited
  index: number;
  tripM: number;
  ride: Fix[];
  startedAt: number;
  updatedAt: number;
}

const key = (trackId: string) => `roadbook_progress_${trackId}`;

export function routeSignature(waypoints: Waypoint[]): string {
  return waypoints.map((w) => w.id).join(',');
}

export function loadProgress(trackId: string, waypoints: Waypoint[]): NavProgress | null {
  try {
    const raw = localStorage.getItem(key(trackId));
    if (!raw) return null;
    const p = JSON.parse(raw) as NavProgress;
    if (p.signature !== routeSignature(waypoints)) return null;
    if (typeof p.index !== 'number' || p.index < 0) return null;
    return { ...p, ride: Array.isArray(p.ride) ? p.ride : [], tripM: Number(p.tripM) || 0 };
  } catch {
    return null;
  }
}

// Resumable = started but not finished
export function hasResumableProgress(p: NavProgress | null, waypointCount: number): p is NavProgress {
  return !!p && p.index > 0 && p.index < waypointCount;
}

export function saveProgress(trackId: string, p: NavProgress) {
  try {
    localStorage.setItem(key(trackId), JSON.stringify(p));
  } catch {
    // storage full — drop the recorded track and keep at least the position
    try {
      localStorage.setItem(key(trackId), JSON.stringify({ ...p, ride: [] }));
    } catch { /* ignore */ }
  }
}

export function clearProgress(trackId: string) {
  try { localStorage.removeItem(key(trackId)); } catch { /* ignore */ }
}
