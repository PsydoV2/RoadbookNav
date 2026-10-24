// Roadbook file formats: versioned JSON (import/export) and GPX (export, round-trip import).

import type { ArrowType, DangerLevel, Track, Waypoint } from '@/types/navigation';
import { ARROW_TYPES, DANGER_LEVELS, MAX_ROUNDABOUT_EXIT } from '@/types/navigation';
import type { Fix } from './navLogic';

export const FILE_FORMAT = 'roadbook-nav';
export const FILE_VERSION = 1;

export interface RoadbookFile {
  format: typeof FILE_FORMAT;
  version: number;
  exportedAt: string;
  tracks: Array<Pick<Track, 'name' | 'color' | 'waypoints'>>;
}

// A track as read from a file — ids and colour are assigned by the caller
export interface ImportedTrack {
  name: string;
  color?: string;
  waypoints: Waypoint[];
}

export class ImportError extends Error {}

// ── Validation ────────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null;

export function isArrowType(v: unknown): v is ArrowType {
  return ARROW_TYPES.includes(v as ArrowType);
}

function toDanger(v: unknown): DangerLevel | undefined {
  return DANGER_LEVELS.includes(v as DangerLevel) ? (v as DangerLevel) : undefined;
}

function toExit(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_ROUNDABOUT_EXIT ? v : undefined;
}

// Builds a clean waypoint with a fresh id, or null when the input is not a waypoint
function readWaypoint(w: unknown): Waypoint | null {
  if (!isRec(w)) return null;
  const { lat, lon, label, arrowType } = w;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (!isArrowType(arrowType)) return null;
  const wp: Waypoint = {
    id: crypto.randomUUID(),
    lat,
    lon,
    arrowType,
    label: typeof label === 'string' ? label : '',
  };
  const danger = toDanger(w.danger);
  if (danger) wp.danger = danger;
  const exit = toExit(w.exit);
  if (exit && arrowType === 'roundabout') wp.exit = exit;
  return wp;
}

function readWaypoints(data: unknown): Waypoint[] | null {
  if (!Array.isArray(data)) return null;
  const out: Waypoint[] = [];
  for (const w of data) {
    const wp = readWaypoint(w);
    if (!wp) return null;
    out.push(wp);
  }
  return out;
}

function readTrack(t: unknown): ImportedTrack | null {
  if (!isRec(t) || typeof t.name !== 'string') return null;
  const waypoints = readWaypoints(t.waypoints);
  if (!waypoints) return null;
  return {
    name: t.name,
    color: typeof t.color === 'string' ? t.color : undefined,
    waypoints,
  };
}

function readTracks(data: unknown): ImportedTrack[] | null {
  if (!Array.isArray(data)) return null;
  const out: ImportedTrack[] = [];
  for (const t of data) {
    const track = readTrack(t);
    if (!track) return null;
    out.push(track);
  }
  return out;
}

// ── JSON ──────────────────────────────────────────────────────────────────────

export function serializeTracks(tracks: Track[]): string {
  const file: RoadbookFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    tracks: tracks.map(({ name, color, waypoints }) => ({ name, color, waypoints })),
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Accepts the versioned format plus both legacy shapes:
 * a bare Track[] ("Export All") and a bare Waypoint[] (single-track export).
 */
export function parseRoadbookJson(text: string, fallbackName: string): ImportedTrack[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }

  if (isRec(data) && data.format === FILE_FORMAT) {
    if (typeof data.version !== 'number' || data.version > FILE_VERSION) {
      throw new ImportError('This roadbook was made with a newer version of Roadbook Nav. Reload the app to update it.');
    }
    const tracks = readTracks(data.tracks);
    if (!tracks) throw new ImportError('The roadbook file is damaged.');
    return tracks;
  }

  const tracks = readTracks(data);
  if (tracks) return tracks;

  const waypoints = readWaypoints(data);
  if (waypoints) return [{ name: fallbackName, waypoints }];

  throw new ImportError('Not a roadbook file. Expected a JSON file exported from Roadbook Nav.');
}

// ── GPX ───────────────────────────────────────────────────────────────────────

const GPX_NS = 'http://www.topografix.com/GPX/1/1';
const RBN_NS = 'https://roadbook.sfalter.de/gpx/1';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function gpxDocument(name: string, body: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="Roadbook Nav" xmlns="${GPX_NS}" xmlns:rbn="${RBN_NS}">`,
    `  <metadata><name>${escapeXml(name)}</name></metadata>`,
    body,
    '</gpx>',
    '',
  ].join('\n');
}

// Waypoints as <wpt> (with arrow type + extensions for round-trip import) and as a <rte>
export function trackToGpx(track: Pick<Track, 'name' | 'waypoints'>): string {
  const wptName = (wp: Waypoint, i: number) => escapeXml(wp.label || `WP ${i + 1}`);
  const wpts = track.waypoints.map((wp, i) => {
    const ext: string[] = [];
    if (wp.danger) ext.push(`<rbn:danger>${wp.danger}</rbn:danger>`);
    if (wp.exit) ext.push(`<rbn:exit>${wp.exit}</rbn:exit>`);
    return [
      `  <wpt lat="${wp.lat}" lon="${wp.lon}">`,
      `    <name>${wptName(wp, i)}</name>`,
      `    <type>${wp.arrowType}</type>`,
      ext.length ? `    <extensions>${ext.join('')}</extensions>` : null,
      '  </wpt>',
    ].filter(Boolean).join('\n');
  });
  const rtepts = track.waypoints.map(
    (wp, i) => `    <rtept lat="${wp.lat}" lon="${wp.lon}"><name>${wptName(wp, i)}</name></rtept>`,
  );
  const rte = ['  <rte>', `    <name>${escapeXml(track.name)}</name>`, ...rtepts, '  </rte>'].join('\n');
  return gpxDocument(track.name, [...wpts, rte].join('\n'));
}

// A recorded ride as a GPX track
export function rideToGpx(name: string, fixes: Fix[]): string {
  const pts = fixes.map(
    (f) => `      <trkpt lat="${f.lat.toFixed(6)}" lon="${f.lon.toFixed(6)}"><time>${new Date(f.time).toISOString()}</time></trkpt>`,
  );
  const trk = ['  <trk>', `    <name>${escapeXml(name)}</name>`, '    <trkseg>', ...pts, '    </trkseg>', '  </trk>'].join('\n');
  return gpxDocument(name, trk);
}

export interface ParsedGpx {
  path: [number, number][];   // track/route line for the overlay
  waypoints: Waypoint[];      // roadbook waypoints (only <wpt> carrying a Roadbook Nav arrow type)
  name: string | null;
}

// Browser-only (DOMParser)
export function parseGpx(text: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new ImportError('This GPX file could not be read.');

  const coord = (el: Element): [number, number] | null => {
    const lat = parseFloat(el.getAttribute('lat') ?? '');
    const lon = parseFloat(el.getAttribute('lon') ?? '');
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
  };
  const child = (el: Element, tag: string) => el.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? '';

  const path: [number, number][] = [];
  let trkpts = Array.from(doc.getElementsByTagNameNS('*', 'trkpt'));
  if (trkpts.length === 0) trkpts = Array.from(doc.getElementsByTagNameNS('*', 'rtept'));
  for (const pt of trkpts) {
    const c = coord(pt);
    if (c) path.push(c);
  }

  const waypoints: Waypoint[] = [];
  for (const el of Array.from(doc.getElementsByTagNameNS('*', 'wpt'))) {
    const c = coord(el);
    const type = child(el, 'type');
    if (!c || !isArrowType(type)) continue;
    const name = child(el, 'name');
    const wp = readWaypoint({
      lat: c[0],
      lon: c[1],
      arrowType: type,
      label: /^WP \d+$/.test(name) ? '' : name,
      danger: Number(child(el, 'danger')) || undefined,
      exit: Number(child(el, 'exit')) || undefined,
    });
    if (wp) waypoints.push(wp);
  }

  const metaName = doc.getElementsByTagNameNS('*', 'metadata')[0];
  const name = metaName ? child(metaName, 'name') || null : null;

  // A route we exported ourselves duplicates the waypoints as <rtept> — no overlay needed then
  const pathIsJustWaypoints =
    waypoints.length > 0 && doc.getElementsByTagNameNS('*', 'trkpt').length === 0;

  return { path: pathIsJustWaypoints ? [] : path, waypoints, name };
}

// ── Download helper ───────────────────────────────────────────────────────────

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(name: string): string {
  return name.trim().replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '') || 'roadbook';
}
