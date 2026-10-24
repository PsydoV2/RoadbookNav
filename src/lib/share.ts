// Share a track as a self-contained URL: the route lives in the hash, so no server is
// involved and the link opens (and imports) fine even when the app is offline.

import type { Track, Waypoint } from '@/types/navigation';
import { ARROW_TYPES } from '@/types/navigation';
import { ImportError, parseRoadbookJson, type ImportedTrack } from './roadbookFile';

export const SHARE_HASH_KEY = 'r';

// Compact wire shape: [lat, lon, arrowIndex, label, danger, exit] — trailing defaults dropped
type CompactWp = [number, number, number, string?, number?, number?];
interface CompactTrack { v: 1; n: string; w: CompactWp[] }

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;   // ≈ 1 m

function toCompact(track: Pick<Track, 'name' | 'waypoints'>): CompactTrack {
  return {
    v: 1,
    n: track.name,
    w: track.waypoints.map((wp) => {
      const row: CompactWp = [round5(wp.lat), round5(wp.lon), ARROW_TYPES.indexOf(wp.arrowType), wp.label, wp.danger ?? 0, wp.exit ?? 0];
      while (row.length > 3 && !row[row.length - 1]) row.pop();
      return row;
    }),
  };
}

function fromCompact(data: unknown): ImportedTrack {
  if (typeof data !== 'object' || data === null || (data as CompactTrack).v !== 1) {
    throw new ImportError('This share link is invalid or from a newer app version.');
  }
  const c = data as CompactTrack;
  const waypoints = (Array.isArray(c.w) ? c.w : []).map((row) => ({
    lat: row[0],
    lon: row[1],
    arrowType: ARROW_TYPES[row[2]],
    label: row[3] ?? '',
    danger: row[4] || undefined,
    exit: row[5] || undefined,
  })) as Array<Omit<Waypoint, 'id'>>;
  // Reuse the file validator so shared links get exactly the same checks as imports
  const [track] = parseRoadbookJson(JSON.stringify(waypoints), typeof c.n === 'string' ? c.n : 'Shared route');
  return track;
}

// ── base64url ─────────────────────────────────────────────────────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

// ── Public API ────────────────────────────────────────────────────────────────

// Prefix "z" = deflate-raw compressed, "j" = plain JSON (browsers without CompressionStream)
export async function encodeTrack(track: Pick<Track, 'name' | 'waypoints'>): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toCompact(track)));
  if (typeof CompressionStream !== 'undefined') {
    return 'z' + bytesToBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
  }
  return 'j' + bytesToBase64Url(json);
}

export async function decodeTrack(encoded: string): Promise<ImportedTrack> {
  try {
    const kind = encoded[0];
    let bytes = base64UrlToBytes(encoded.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'j') throw new Error('unknown encoding');
    return fromCompact(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError('This share link is incomplete or damaged.');
  }
}

export function buildShareUrl(origin: string, encoded: string): string {
  return `${origin}/app/#${SHARE_HASH_KEY}=${encoded}`;
}

// Extracts the encoded route from a location hash like "#r=z…"
export function readShareHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get(SHARE_HASH_KEY);
}
