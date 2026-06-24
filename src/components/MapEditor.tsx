'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Track, Waypoint } from '@/types/navigation';
import { ARROW_FILE, ARROW_TYPES } from '@/types/navigation';

// ── Constants ────────────────────────────────────────────────────────────────

const TRACK_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316',
  '#a855f7', '#eab308', '#ec4899', '#06b6d4',
];

const ARROW_LABELS: Record<Waypoint['arrowType'], string> = {
  start:          'Start',
  finish:         'Finish',
  straight:       'Straight',
  'u-turn':       'U-turn',
  'slight-left':  'Bear left',
  'slight-right': 'Bear right',
  left:           'Left',
  right:          'Right',
  'sharp-left':   'Sharp left',
  'sharp-right':  'Sharp right',
};


function parseGpx(text: string): [number, number][] {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const points: [number, number][] = [];
  doc.querySelectorAll('trkpt, rtept').forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '');
    const lon = parseFloat(pt.getAttribute('lon') ?? '');
    if (!isNaN(lat) && !isNaN(lon)) points.push([lat, lon]);
  });
  return points;
}


// ── Button style tokens ──────────────────────────────────────────────────────

const BTN_GHOST     = 'cursor-pointer bg-[#2a2a2a] border border-white/25 rounded-lg text-white transition-colors hover:bg-[#3d3d3d] active:bg-[#333] disabled:opacity-35 disabled:pointer-events-none';
const BTN_PRIMARY   = 'cursor-pointer bg-white text-black font-bold rounded-lg transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-35 disabled:pointer-events-none';
const BTN_CANCEL    = 'cursor-pointer border border-white/25 rounded-xl text-gray-200 transition-colors hover:bg-white/10 active:bg-white/15';
const BTN_DELETE    = 'cursor-pointer bg-red-500/15 border border-red-500/35 text-red-400 font-bold rounded-xl transition-colors hover:bg-red-500/30 active:bg-red-500/40';
const BTN_ARROW_OFF = 'bg-[#2a2a2a] text-white transition-colors hover:bg-[#3d3d3d] active:bg-[#333]';
const BTN_ICON_DEL  = 'cursor-pointer text-gray-400 transition-colors hover:text-red-400 active:text-red-500';

// ── Icons ────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

// ── ArrowIcon ────────────────────────────────────────────────────────────────

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

function makeMarkerIcon(index: number, color: string, isActive: boolean, isDraggable: boolean) {
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
      cursor:${isDraggable ? 'grab' : 'pointer'};
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

// Location search using Nominatim
function MapSearch() {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setNotFound(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'RoadbookNav/1.0' } },
      );
      const data: Array<{ lat: string; lon: string }> = await res.json();
      if (data[0]) {
        map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13);
        setOpen(false);
        setQuery('');
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setSearching(false);
  };

  if (!open) {
    return (
      <div ref={containerRef} className="absolute top-2 right-2 z-[1000]">
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 bg-[#1a1a1a]/95 border border-white/20 rounded-lg text-gray-300 text-sm hover:bg-[#2a2a2a] transition-colors backdrop-blur-sm"
          title="Search location"
        >
          🔍
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute top-2 right-2 z-[1000] flex items-center gap-1">
      <input
        autoFocus
        value={query}
        onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') search();
          if (e.key === 'Escape') { setOpen(false); setQuery(''); }
        }}
        placeholder="Search location…"
        className={`w-44 bg-[#1a1a1a] border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none transition-colors ${
          notFound ? 'border-red-500/60' : 'border-white/25 focus:border-white/50'
        }`}
      />
      <button
        onClick={search}
        disabled={searching}
        className="px-3 py-2 bg-[#2a2a2a] border border-white/25 rounded-lg text-white text-sm hover:bg-[#3a3a3a] disabled:opacity-50 transition-colors"
      >
        {searching ? '…' : '↵'}
      </button>
      <button
        onClick={() => { setOpen(false); setQuery(''); setNotFound(false); }}
        className="px-3 py-2 bg-[#2a2a2a] border border-white/25 rounded-lg text-gray-400 text-sm hover:bg-[#3a3a3a] transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

// GPX overlay — fits map to the imported track on mount
function GpxOverlay({ path }: { path: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) map.fitBounds(L.latLngBounds(path), { padding: [40, 40] });
  }, [map, path]);
  return (
    <>
      {/* White halo so the line reads against any map background */}
      <Polyline positions={path} color="white" weight={8} opacity={0.55} lineCap="round" lineJoin="round" />
      {/* Orange dashed line on top */}
      <Polyline positions={path} color="#f97316" weight={4} opacity={0.95} dashArray="10 6" lineCap="round" lineJoin="round" />
    </>
  );
}

// Arrow-type grid shared by both modals
function ArrowGrid({
  value,
  onChange,
}: {
  value: Waypoint['arrowType'];
  onChange: (t: Waypoint['arrowType']) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ARROW_TYPES.map((type) => {
        const active = value === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`cursor-pointer flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium ${
              active ? 'bg-white text-black' : BTN_ARROW_OFF
            }`}
          >
            <ArrowIcon type={type} active={active} size={18} />
            {ARROW_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

interface AddModalProps {
  lat: number;
  lon: number;
  isFirst: boolean;
  onConfirm: (label: string, arrowType: Waypoint['arrowType']) => void;
  onCancel: () => void;
}
function WaypointAddModal({ lat, lon, isFirst, onConfirm, onCancel }: AddModalProps) {
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
          className="w-full bg-[#111] border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/60 transition-colors"
        />

        <ArrowGrid value={arrowType} onChange={setArrowType} />

        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 py-3 px-4 ${BTN_CANCEL}`}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(label.trim(), arrowType)}
            className={`flex-1 py-3 px-4 ${BTN_PRIMARY}`}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  waypoint: Waypoint;
  index: number;
  onSave: (label: string, arrowType: Waypoint['arrowType']) => void;
  onDelete: () => void;
  onCancel: () => void;
}
function WaypointEditModal({ waypoint, index, onSave, onDelete, onCancel }: EditModalProps) {
  const [label, setLabel] = useState(waypoint.label);
  const [arrowType, setArrowType] = useState<Waypoint['arrowType']>(waypoint.arrowType);

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a1a] border border-white/25 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-lg text-white">Waypoint #{index + 1}</h2>
          <span className="text-xs text-gray-400 font-mono mt-1 text-right">
            {waypoint.lat.toFixed(5)}<br />{waypoint.lon.toFixed(5)}
          </span>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave(label.trim(), arrowType)}
          className="w-full bg-[#111] border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/60 transition-colors"
        />

        <ArrowGrid value={arrowType} onChange={setArrowType} />

        <div className="flex gap-2">
          <button onClick={onCancel} className={`py-3 px-4 ${BTN_CANCEL}`}>
            Cancel
          </button>
          <button onClick={onDelete} className={`py-3 px-4 ${BTN_DELETE}`}>
            Delete
          </button>
          <button
            onClick={() => onSave(label.trim(), arrowType)}
            className={`flex-1 py-3 px-4 ${BTN_PRIMARY}`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom confirmation dialog — replaces browser confirm()
interface ConfirmAction {
  message: string;
  onConfirm: () => void;
}
function ConfirmDialog({ action, onCancel }: { action: ConfirmAction; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a1a] border border-white/25 rounded-2xl p-6 max-w-xs w-full flex flex-col gap-5">
        <p className="text-white text-sm leading-relaxed">{action.message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 py-3 px-4 ${BTN_CANCEL}`}>Cancel</button>
          <button onClick={action.onConfirm} className={`flex-1 py-3 px-4 ${BTN_DELETE}`}>Delete</button>
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
interface EditingWaypoint { trackId: string; waypoint: Waypoint; index: number }

export default function MapEditor({ tracks, activeTrackId, onChange, onStartNavigation }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [editingWaypoint, setEditingWaypoint] = useState<EditingWaypoint | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [historyLen, setHistoryLen] = useState(0);

  const [gpxPath, setGpxPath] = useState<[number, number][] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef  = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);
  const historyRef = useRef<Array<{ tracks: Track[]; activeTrackId: string | null }>>([]);

  // ── History / undo ────────────────────────────────────────────────────────

  // Wraps onChange — pushes current state to history before each change
  const commit = (newTracks: Track[], newActiveId: string | null) => {
    historyRef.current = [...historyRef.current.slice(-19), { tracks, activeTrackId }];
    setHistoryLen(historyRef.current.length);
    onChange(newTracks, newActiveId);
  };

  // Ctrl+Z / Cmd+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const prev = historyRef.current.pop();
        setHistoryLen(historyRef.current.length);
        if (prev) onChange(prev.tracks, prev.activeTrackId);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onChange]);

  const handleUndo = () => {
    const prev = historyRef.current.pop();
    setHistoryLen(historyRef.current.length);
    if (prev) onChange(prev.tracks, prev.activeTrackId);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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
    commit([...tracks, track], track.id);
  };

  const handleDeleteTrack = (id: string) => {
    const track = tracks.find((t) => t.id === id);
    const hasWaypoints = (track?.waypoints.length ?? 0) > 0;

    const doDelete = () => {
      const remaining = tracks.filter((t) => t.id !== id);
      const newActive = remaining.find((t) => t.id === activeTrackId)?.id ?? remaining[0]?.id ?? null;
      commit(remaining, newActive);
      setConfirmAction(null);
    };

    if (hasWaypoints) {
      setConfirmAction({
        message: `Delete "${track?.name}" and its ${track!.waypoints.length} waypoint(s)? This cannot be undone.`,
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
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
    commit(
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
    commit(updated, activeTrackId);
    setPending(null);
  };

  const handleMoveWaypoint = (trackId: string, wpId: string, lat: number, lon: number) => {
    commit(
      tracks.map((t) =>
        t.id === trackId
          ? { ...t, waypoints: t.waypoints.map((w) => w.id === wpId ? { ...w, lat, lon } : w) }
          : t,
      ),
      activeTrackId,
    );
  };

  const handleReorderWaypoint = (trackId: string, fromIndex: number, toIndex: number) => {
    commit(
      tracks.map((t) => {
        if (t.id !== trackId) return t;
        const wps = [...t.waypoints];
        const [removed] = wps.splice(fromIndex, 1);
        wps.splice(toIndex, 0, removed);
        return { ...t, waypoints: wps };
      }),
      activeTrackId,
    );
  };

  const handleSaveEditingWaypoint = (label: string, arrowType: Waypoint['arrowType']) => {
    if (!editingWaypoint) return;
    commit(
      tracks.map((t) =>
        t.id === editingWaypoint.trackId
          ? {
              ...t,
              waypoints: t.waypoints.map((w) =>
                w.id === editingWaypoint.waypoint.id ? { ...w, label, arrowType } : w,
              ),
            }
          : t,
      ),
      activeTrackId,
    );
    setEditingWaypoint(null);
  };

  const handleDeleteEditingWaypoint = () => {
    if (!editingWaypoint) return;
    commit(
      tracks.map((t) =>
        t.id === editingWaypoint.trackId
          ? { ...t, waypoints: t.waypoints.filter((w) => w.id !== editingWaypoint.waypoint.id) }
          : t,
      ),
      activeTrackId,
    );
    setEditingWaypoint(null);
  };

  const handleDeleteWaypoint = (trackId: string, wpId: string, label: string) => {
    setConfirmAction({
      message: `Delete waypoint "${label || 'unnamed'}"?`,
      onConfirm: () => {
        commit(
          tracks.map((t) =>
            t.id === trackId ? { ...t, waypoints: t.waypoints.filter((w) => w.id !== wpId) } : t,
          ),
          activeTrackId,
        );
        setConfirmAction(null);
      },
    });
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
    a.download = `roadbook-all-tracks-${Date.now()}.json`;
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
          commit(merged, imported[0]?.id ?? activeTrackId);
        } else if (isWaypointArray(parsed)) {
          const newTrack: Track = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.json$/i, ''),
            color: nextColor(tracks),
            waypoints: parsed,
          };
          commit([...tracks, newTrack], newTrack.id);
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

  // ── GPX import ──────────────────────────────────────────────────────────

  const handleGpxImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const path = parseGpx(ev.target!.result as string);
      if (path.length === 0) {
        alert('No track points found in this GPX file.');
      } else {
        setGpxPath(path);
      }
    };
    reader.onerror = () => alert('Could not read GPX file.');
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Map center ───────────────────────────────────────────────────────────

  const firstWp = tracks.flatMap((t) => t.waypoints)[0];
  const center: [number, number] = firstWp
    ? [firstWp.lat, firstWp.lon]
    : [48.137154, 11.576124];

  // ── Derived state ────────────────────────────────────────────────────────

  const hasFinish = activeTrack?.waypoints.some((w) => w.arrowType === 'finish') ?? false;
  const activeWpCount = activeTrack?.waypoints.length ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-screen h-screen bg-black flex flex-col">

      {/* ── Toolbar ── */}
      <div className="relative z-[100] flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-white/20 flex-shrink-0">
        <span className="font-bold text-sm whitespace-nowrap mr-1 text-white">Roadbook Nav</span>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={historyLen === 0}
          className={`px-3 py-2 text-xs whitespace-nowrap flex items-center gap-1.5 ${BTN_GHOST}`}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
          Undo
        </button>

        {/* Desktop: show all buttons inline */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-2 text-xs whitespace-nowrap ${BTN_GHOST}`}
          >
            ↑ Import
          </button>
          <button
            onClick={handleExport}
            disabled={!activeTrack || activeWpCount === 0}
            className={`px-3 py-2 text-xs whitespace-nowrap ${BTN_GHOST}`}
          >
            ↓ Export
          </button>
          <button
            onClick={handleExportAll}
            disabled={tracks.every((t) => t.waypoints.length === 0)}
            className={`px-3 py-2 text-xs whitespace-nowrap ${BTN_GHOST}`}
          >
            ↓ Export All
          </button>
          <button
            onClick={() => gpxInputRef.current?.click()}
            className={`px-3 py-2 text-xs whitespace-nowrap ${BTN_GHOST}`}
          >
            ↑ GPX
          </button>
          {gpxPath && (
            <button
              onClick={() => setGpxPath(null)}
              className="cursor-pointer px-3 py-2 text-xs whitespace-nowrap bg-[#2a2a2a] border border-orange-400/40 rounded-lg text-orange-400 transition-colors hover:bg-orange-400/10 active:bg-orange-400/15"
            >
              ✕ GPX
            </button>
          )}
        </div>

        {/* Mobile: dropdown menu for import/export */}
        <div className="md:hidden" ref={menuRef}>
          <button
            ref={menuBtnRef}
            onClick={() => {
              if (!menuOpen && menuBtnRef.current) {
                const r = menuBtnRef.current.getBoundingClientRect();
                setMenuPos({ top: r.bottom + 4, left: r.left });
              }
              setMenuOpen((o) => !o);
            }}
            aria-label="Open file menu"
            className={`px-3 py-2 text-xs ${BTN_GHOST}`}
          >
            Files ⋯
          </button>
          {menuOpen && (
            <div
              className="fixed z-[9999] flex flex-col gap-1 bg-[#1a1a1a] border border-white/20 rounded-lg p-2 min-w-[140px] shadow-xl"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}
                className={`px-3 py-2 text-xs text-left whitespace-nowrap ${BTN_GHOST}`}
              >
                ↑ Import
              </button>
              <button
                onClick={() => { handleExport(); setMenuOpen(false); }}
                disabled={!activeTrack || activeWpCount === 0}
                className={`px-3 py-2 text-xs text-left whitespace-nowrap ${BTN_GHOST}`}
              >
                ↓ Export
              </button>
              <button
                onClick={() => { handleExportAll(); setMenuOpen(false); }}
                disabled={tracks.every((t) => t.waypoints.length === 0)}
                className={`px-3 py-2 text-xs text-left whitespace-nowrap ${BTN_GHOST}`}
              >
                ↓ Export All
              </button>
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={() => { gpxInputRef.current?.click(); setMenuOpen(false); }}
                className={`px-3 py-2 text-xs text-left whitespace-nowrap ${BTN_GHOST}`}
              >
                ↑ GPX overlay
              </button>
              {gpxPath && (
                <button
                  onClick={() => { setGpxPath(null); setMenuOpen(false); }}
                  className="cursor-pointer px-3 py-2 text-xs text-left whitespace-nowrap bg-[#2a2a2a] border border-orange-400/40 rounded-lg text-orange-400 transition-colors hover:bg-orange-400/10"
                >
                  ✕ GPX overlay
                </button>
              )}
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept=".json"       className="hidden" onChange={handleImport} />
        <input ref={gpxInputRef}  type="file" accept=".gpx,.xml"  className="hidden" onChange={handleGpxImport} />

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {activeWpCount > 0 && !hasFinish && (
            <span
              className="text-amber-400/80 text-xs hidden sm:block"
              title="No finish waypoint — add a waypoint with type 'Finish' to mark the end of your route"
            >
              No finish ⚠
            </span>
          )}
          <button
            onClick={() => activeTrackId && activeWpCount > 0 && onStartNavigation(activeTrackId)}
            disabled={!activeTrack || activeWpCount === 0}
            className={`px-4 py-2 text-sm whitespace-nowrap ${BTN_PRIMARY}`}
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
                  : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a] border border-transparent'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
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
                <span className="group/name flex items-center gap-1">
                  <span onDoubleClick={(e) => { e.stopPropagation(); startRename(track.id, track.name); }}>
                    {track.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(track.id, track.name); }}
                    className="opacity-0 group-hover/name:opacity-100 transition-opacity text-gray-600 hover:text-gray-300"
                    aria-label="Rename track"
                  >
                    <PencilIcon />
                  </button>
                </span>
              )}
              <span className={`text-xs ml-0.5 ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                ({track.waypoints.length})
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track.id); }}
                className={`ml-0.5 text-xs ${BTN_ICON_DEL}`}
                aria-label="Delete track"
              >
                ✕
              </button>
            </div>
          );
        })}

        <button
          onClick={handleAddTrack}
          className="cursor-pointer flex-shrink-0 px-3 py-1.5 text-sm text-gray-300 rounded-lg transition-colors hover:text-white hover:bg-[#2a2a2a]"
        >
          + Track
        </button>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative z-0">
        <MapContainer center={center} zoom={13} className="w-full h-full" style={{ background: '#1a1a1a' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickHandler onMapClick={handleMapClick} />
          <MapSearch />
          {gpxPath && <GpxOverlay path={gpxPath} />}

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
                    icon={makeMarkerIcon(i, track.color, isActive, isActive)}
                    draggable={isActive}
                    eventHandlers={{
                      click: () => {
                        if (isDraggingRef.current) return;
                        if (!isActive) {
                          handleSwitchTrack(track.id);
                        } else {
                          setEditingWaypoint({ trackId: track.id, waypoint: wp, index: i });
                        }
                      },
                      dragstart: () => {
                        isDraggingRef.current = true;
                      },
                      dragend: (e) => {
                        const latlng = (e.target as L.Marker).getLatLng();
                        handleMoveWaypoint(track.id, wp.id, latlng.lat, latlng.lng);
                        setTimeout(() => { isDraggingRef.current = false; }, 50);
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
        <div className="flex-shrink-0 max-h-32 overflow-y-auto bg-[#111] border-t border-white/20 px-3 py-2">
          <div className="flex gap-2">
            {activeTrack.waypoints.map((wp, i) => (
              <div key={wp.id} className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs bg-[#1e1e1e] border border-white/20">

                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 mr-0.5">
                  <button
                    onClick={() => handleReorderWaypoint(activeTrack.id, i, i - 1)}
                    disabled={i === 0}
                    className="text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:pointer-events-none leading-none text-[11px] px-0.5"
                    aria-label="Move earlier"
                  >▲</button>
                  <button
                    onClick={() => handleReorderWaypoint(activeTrack.id, i, i + 1)}
                    disabled={i === activeTrack.waypoints.length - 1}
                    className="text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:pointer-events-none leading-none text-[11px] px-0.5"
                    aria-label="Move later"
                  >▼</button>
                </div>

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
                  className={`ml-0.5 ${BTN_ICON_DEL}`}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add waypoint modal ── */}
      {pending && activeTrack && (
        <WaypointAddModal
          lat={pending.lat}
          lon={pending.lon}
          isFirst={activeTrack.waypoints.length === 0}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      {/* ── Edit waypoint modal ── */}
      {editingWaypoint && (
        <WaypointEditModal
          waypoint={editingWaypoint.waypoint}
          index={editingWaypoint.index}
          onSave={handleSaveEditingWaypoint}
          onDelete={handleDeleteEditingWaypoint}
          onCancel={() => setEditingWaypoint(null)}
        />
      )}

      {/* ── Confirm dialog ── */}
      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
