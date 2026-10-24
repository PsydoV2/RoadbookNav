// Track helpers without Leaflet, so they can also run in the app shell (page.tsx).

import type { Track } from '@/types/navigation';
import type { ImportedTrack } from './roadbookFile';

export const TRACK_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316',
  '#a855f7', '#eab308', '#ec4899', '#06b6d4',
];

export function nextColor(tracks: Track[]): string {
  return TRACK_COLORS[tracks.length % TRACK_COLORS.length];
}

export function createTrack(tracks: Track[]): Track {
  return {
    id: crypto.randomUUID(),
    name: `Track ${tracks.length + 1}`,
    color: nextColor(tracks),
    waypoints: [],
  };
}

// Turns tracks read from a file or share link into editor tracks with fresh ids/colours
export function materialize(imported: ImportedTrack[], existing: Track[]): Track[] {
  const out: Track[] = [];
  for (const t of imported) {
    out.push({
      id: crypto.randomUUID(),
      name: t.name || `Track ${existing.length + out.length + 1}`,
      color: t.color ?? nextColor([...existing, ...out]),
      waypoints: t.waypoints,
    });
  }
  return out;
}
