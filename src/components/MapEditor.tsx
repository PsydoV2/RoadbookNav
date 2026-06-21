'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Track, Waypoint } from '@/types/navigation';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Constants ────────────────────────────────────────────────────────────────

const TRACK_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316',
  '#a855f7', '#eab308', '#ec4899', '#06b6d4',
];

const ARROW_LABELS: Record<Waypoint['arrowType'], string> = {
  start:          'Start',
  straight:       'Straight',
  left:           'Left',
  right:          'Right',
  'slight-left':  'Bear left',
  'slight-right': 'Bear right',
  'u-turn':       'U-turn',
  finish:         'Finish',
};

const ARROW_FILE: Partial<Record<Waypoint['arrowType'], string>> = {
  straight:       '/arrows/arrow-up-sm-svgrepo-com.svg',
  left:           '/arrows/arrow-left-sm-svgrepo-com.svg',
  right:          '/arrows/arrow-right-sm-svgrepo-com.svg',
  'slight-left':  '/arrows/arrow-up-left-sm-svgrepo-com.svg',
  'slight-right': '/arrows/arrow-up-right-sm-svgrepo-com.svg',
  'u-turn':       '/arrows/arrow-down-sm-svgrepo-com.svg',
};

function ArrowIcon({ type, active, size = 20 }: { type: Waypoint['arrowType']; active: boolean; size?: number }) {
  const file = ARROW_FILE[type];
  if (file) {
    return (
      <img
        src={file}
        width={size}
        height={size}
        alt={type}
        style={{ filter: active ? 'none' : 'invert(1)' }}
        draggable={false}
      />
    );
  }
  // start / finish: inline SVG fallback
  if (type === 'start') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <circle cx="12" cy="12" r="7" stroke={active ? '#000' : '#fff'} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.5" fill={active ? '#000' : '#fff'} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <circle cx="12" cy="12" r="7" stroke={active ? '#000' : '#fff'} strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" stroke={active ? '#000' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ARROW_TYPES = Object.keys(ARROW_LABELS) as Waypoint['arrowType'][];

// ── Helpers ──────────────────────────────────────────────────────────────────

function nextColor(tracks: Track[]): string {
  return TRACK_COLORS[tracks.length % TRACK_COLORS.length];
}

function createTrack(tracks: Track[]): Track {
  return {
    id: crypto.randomUUID(),
    name: `Track ${tracks.length + 1}`,
    color: nextColor(tracks),
    waypoints: [],
  };
}

function makeMarkerIcon(index: number, color: string, isActive: boolean) {
  const size = isActive ? 28 : 20;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};color:#fff;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${isActive ? 12 : 10}px;
      border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 1px 5px rgba(0,0,0,0.6);
      opacity:${isActive ? 1 : 0.55};
    ">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function isWaypoint(w: unknown): w is Waypoint {
  return (
    typeof w === 'object' && w !== null &&
    typeof (w as Record<string, unknown>).id === 'string' &&
    typeof (w as Record<string, unknown>).lat === 'number' &&
    typeof (w as Record<string, unknown>).lon === 'number' &&
    typeof (w as Record<string, unknown>).label === 'string' &&
    ARROW_TYPES.includes((w as Record<string, unknown>).arrowType as Waypoint['arrowType'])
  );
}

function isWaypointArray(data: unknown): data is Waypoint[] {
  return Array.isArray(data) && data.every(isWaypoint);
}

function isTrackArray(data: unknown): data is Track[] {
  return (
    Array.isArray(data) &&
    data.every(
      (t) =>
        typeof t === 'object' && t !== null &&
        typeof (t as Record<string, unknown>).id === 'string' &&
        typeof (t as Record<string, unknown>).name === 'string' &&
        typeof (t as Record<string, unknown>).color === 'string' &&
        isWaypointArray((t as Record<string, unknown>).waypoints),
    )
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface ClickHandlerProps {
  onMapClick: (lat: number, lon: number) => void;
}
function ClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface ModalProps {
  lat: number;
  lon: number;
  isFirst: boolean;
  onConfirm: (label: string, arrowType: Waypoint['arrowType']) => void;
  onCancel: () => void;
}
function WaypointModal({ lat, lon, isFirst, onConfirm, onCancel }: ModalProps) {
  const [label, setLabel] = useState('');
  const [arrowType, setArrowType] = useState<Waypoint['arrowType']>(isFirst ? 'start' : 'straight');

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a1a] border border-white/25 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        <h2 className="font-bold text-lg text-white">Add Waypoint</h2>
        <div className="text-xs text-gray-400 font-mono">
          {lat.toFixed(5)}, {lon.toFixed(5)}
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm(label.trim(), arrowType)}
          className="w-full bg-[#111] border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/60"
        />

        <div className="grid grid-cols-2 gap-2">
          {ARROW_TYPES.map((type) => {
            const active = arrowType === type;
            return (
              <button
                key={type}
                onClick={() => setArrowType(type)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-white text-black' : 'bg-[#2a2a2a] text-white hover:bg-[#333] active:bg-[#333]'
                }`}
              >
                <ArrowIcon type={type} active={active} size={18} />
                {ARROW_LABELS[type]}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-white/25 text-gray-200 hover:bg-white/5 active:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(label.trim(), arrowType)}
            className="flex-1 py-3 rounded-xl bg-white text-black font-bold active:scale-95 transition-transform"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  tracks: Track[];
  activeTrackId: string | null;
  onChange: (tracks: Track[], activeTrackId: string | null) => void;
  onStartNavigation: (trackId: string) => void;
}

interface Pending { lat: number; lon: number }

export default function MapEditor({ tracks, activeTrackId, onChange, onStartNavigation }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-create first track if empty
  useEffect(() => {
    if (tracks.length === 0) {
      const first = createTrack([]);
      onChange([first], first.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTrack = tracks.find((t) => t.id === activeTrackId) ?? null;

  // ── Track CRUD ──────────────────────────────────────────────────────────

  const handleAddTrack = () => {
    const track = createTrack(tracks);
    onChange([...tracks, track], track.id);
  };

  const handleDeleteTrack = (id: string) => {
    const track = tracks.find((t) => t.id === id);
    const hasWaypoints = (track?.waypoints.length ?? 0) > 0;
    if (hasWaypoints && !confirm(`Delete track "${track?.name}" with ${track!.waypoints.length} waypoint(s)?`)) return;
    const remaining = tracks.filter((t) => t.id !== id);
    const newActive = remaining.find((t) => t.id === activeTrackId)?.id ?? remaining[0]?.id ?? null;
    onChange(remaining, newActive);
  };

  const handleSwitchTrack = (id: string) => {
    onChange(tracks, id);
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const commitRename = (id: string) => {
    if (!editingName.trim()) { setEditingId(null); return; }
    onChange(
      tracks.map((t) => (t.id === id ? { ...t, name: editingName.trim() } : t)),
      activeTrackId,
    );
    setEditingId(null);
  };

  // ── Waypoint CRUD ────────────────────────────────────────────────────────

  const handleMapClick = (lat: number, lon: number) => {
    if (!activeTrack) return;
    setPending({ lat, lon });
  };

  const handleConfirm = (label: string, arrowType: Waypoint['arrowType']) => {
    if (!pending || !activeTrack) return;
    const wp: Waypoint = { id: crypto.randomUUID(), lat: pending.lat, lon: pending.lon, arrowType, label };
    const updated = tracks.map((t) =>
      t.id === activeTrackId ? { ...t, waypoints: [...t.waypoints, wp] } : t,
    );
    onChange(updated, activeTrackId);
    setPending(null);
  };

  const handleDeleteWaypoint = (trackId: string, wpId: string, label: string) => {
    if (!confirm(`Delete waypoint "${label || wpId.slice(0, 6)}"?`)) return;
    onChange(
      tracks.map((t) =>
        t.id === trackId ? { ...t, waypoints: t.waypoints.filter((w) => w.id !== wpId) } : t,
      ),
      activeTrackId,
    );
  };

  // ── Import / Export ──────────────────────────────────────────────────────

  const handleExport = () => {
    if (!activeTrack) return;
    const blob = new Blob([JSON.stringify(activeTrack.waypoints, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTrack.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(tracks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadbook-alle-tracks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (isTrackArray(parsed)) {
          const imported = parsed.map((t) => ({ ...t, id: crypto.randomUUID() }));
          const merged = [...tracks, ...imported];
          onChange(merged, imported[0]?.id ?? activeTrackId);
        } else if (isWaypointArray(parsed)) {
          const newTrack: Track = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.json$/i, ''),
            color: nextColor(tracks),
            waypoints: parsed,
          };
          onChange([...tracks, newTrack], newTrack.id);
        } else {
          alert('Invalid file. Expected a waypoint or track JSON.');
        }
      } catch {
        alert('Could not read file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Map center ───────────────────────────────────────────────────────────

  const firstWp = tracks.flatMap((t) => t.waypoints)[0];
  const center: [number, number] = firstWp
    ? [firstWp.lat, firstWp.lon]
    : [48.137154, 11.576124];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-screen h-screen bg-black flex flex-col">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-white/20 flex-shrink-0 overflow-x-auto">
        <span className="font-bold text-sm whitespace-nowrap mr-1 text-white">Roadbook Nav</span>


        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-xs bg-[#2a2a2a] border border-white/25 rounded-lg text-white whitespace-nowrap hover:bg-[#333] active:bg-[#333]"
        >
          ↑ Import
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

        <button
          onClick={handleExport}
          disabled={!activeTrack || activeTrack.waypoints.length === 0}
          className="px-3 py-2 text-xs bg-[#2a2a2a] border border-white/25 rounded-lg text-white whitespace-nowrap hover:bg-[#333] active:bg-[#333] disabled:opacity-35"
        >
          ↓ Track
        </button>

        <button
          onClick={handleExportAll}
          disabled={tracks.every((t) => t.waypoints.length === 0)}
          className="px-3 py-2 text-xs bg-[#2a2a2a] border border-white/25 rounded-lg text-white whitespace-nowrap hover:bg-[#333] active:bg-[#333] disabled:opacity-35"
        >
          ↓ All
        </button>

        <div className="ml-auto flex-shrink-0">
          <button
            onClick={() => activeTrackId && activeTrack && activeTrack.waypoints.length > 0 && onStartNavigation(activeTrackId)}
            disabled={!activeTrack || activeTrack.waypoints.length === 0}
            className="px-4 py-2 text-sm font-bold bg-white text-black rounded-lg whitespace-nowrap disabled:opacity-35 active:scale-95 transition-transform"
          >
            Navigate →
          </button>
        </div>
      </div>

      {/* ── Track tabs ── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#111] border-b border-white/20 flex-shrink-0 overflow-x-auto">
        {tracks.map((track) => {
          const isActive = track.id === activeTrackId;
          return (
            <div
              key={track.id}
              onClick={() => handleSwitchTrack(track.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap cursor-pointer select-none transition-colors ${
                isActive
                  ? 'bg-[#2a2a2a] text-white border border-white/20'
                  : 'text-gray-300 hover:text-white hover:bg-[#222] border border-transparent'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 flex-shrink-0"
                style={{ background: track.color }}
              />
              {editingId === track.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(track.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(track.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent outline-none w-24 text-white text-sm"
                />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); startRename(track.id, track.name); }}>
                  {track.name}
                </span>
              )}
              <span className={`text-xs ml-0.5 ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                ({track.waypoints.length})
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track.id); }}
                className="opacity-0 group-hover:opacity-100 ml-0.5 text-gray-400 hover:text-red-400 text-xs transition-opacity"
                aria-label="Delete track"
              >
                ✕
              </button>
            </div>
          );
        })}

        <button
          onClick={handleAddTrack}
          className="flex-shrink-0 px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-[#222]"
        >
          + Track
        </button>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={13} className="w-full h-full" style={{ background: '#1a1a1a' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickHandler onMapClick={handleMapClick} />

          {tracks.map((track) => {
            const isActive = track.id === activeTrackId;
            const positions: [number, number][] = track.waypoints.map((w) => [w.lat, w.lon]);
            return (
              <span key={track.id}>
                {positions.length > 1 && (
                  <Polyline
                    positions={positions}
                    color={track.color}
                    weight={isActive ? 3 : 2}
                    opacity={isActive ? 1 : 0.45}
                  />
                )}
                {track.waypoints.map((wp, i) => (
                  <Marker
                    key={wp.id}
                    position={[wp.lat, wp.lon]}
                    icon={makeMarkerIcon(i, track.color, isActive)}
                    eventHandlers={{
                      click: () => {
                        if (!isActive) {
                          handleSwitchTrack(track.id);
                        } else {
                          handleDeleteWaypoint(track.id, wp.id, wp.label);
                        }
                      },
                    }}
                  />
                ))}
              </span>
            );
          })}
        </MapContainer>

        {activeTrack && activeTrack.waypoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-black/80 border border-white/20 rounded-xl px-6 py-4 text-center max-w-xs">
              <p className="text-gray-200 text-sm">
                Click the map to place your first waypoint
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Waypoint strip (active track) ── */}
      {activeTrack && activeTrack.waypoints.length > 0 && (
        <div className="flex-shrink-0 max-h-28 overflow-y-auto bg-[#111] border-t border-white/20 px-3 py-2">
          <div className="flex gap-2">
            {activeTrack.waypoints.map((wp, i) => (
              <div
                key={wp.id}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs bg-[#1e1e1e] border border-white/20"
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: activeTrack.color, fontSize: 9 }}
                >
                  {i + 1}
                </span>
                {wp.label && (
                  <span className="text-white max-w-20 truncate">{wp.label}</span>
                )}
                <ArrowIcon type={wp.arrowType} active={false} size={14} />
                <button
                  onClick={() => handleDeleteWaypoint(activeTrack.id, wp.id, wp.label)}
                  className="text-gray-400 hover:text-red-400 ml-0.5 transition-colors"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Waypoint modal ── */}
      {pending && activeTrack && (
        <WaypointModal
          lat={pending.lat}
          lon={pending.lon}
          isFirst={activeTrack.waypoints.length === 0}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
