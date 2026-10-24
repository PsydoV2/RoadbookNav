'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Track, Waypoint } from '@/types/navigation';
import { decimate } from '@/lib/geo';
import {
  downloadFile,
  ImportError,
  parseGpx,
  parseRoadbookJson,
  safeFilename,
  serializeTracks,
  trackToGpx,
} from '@/lib/roadbookFile';
import { createTrack, materialize, nextColor } from '@/lib/tracks';
import { demoTrack } from '@/lib/demo';
import { trackEvent } from '@/lib/analytics';
import type { NavMode } from './MotorbikeUi';
import { makeMarkerIcon } from './editor/markerIcon';
import { ClickHandler, FitBounds, GpxOverlay, MapSearch } from './editor/MapParts';
import WaypointModal, { type WaypointFields } from './editor/WaypointModal';
import WaypointStrip from './editor/WaypointStrip';
import ShareDialog from './editor/ShareDialog';
import { ConfirmDialog, Toast, type ConfirmAction, type ToastMessage } from './editor/Dialogs';
import { PencilIcon, ShareIcon, UndoIcon } from './editor/icons';
import { BTN_GHOST, BTN_ICON_DEL, BTN_MENU_ITEM, BTN_PRIMARY } from './editor/styles';

// ── GPX overlay persistence ──────────────────────────────────────────────────

const GPX_KEY = 'roadbook_gpx_overlay';
const GPX_MAX_POINTS = 5000;   // plenty for snapping, keeps localStorage small

function loadGpxOverlay(): [number, number][] | null {
  try {
    const raw = localStorage.getItem(GPX_KEY);
    const path = raw ? JSON.parse(raw) : null;
    return Array.isArray(path) && path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

function saveGpxOverlay(path: [number, number][] | null) {
  try {
    if (path) localStorage.setItem(GPX_KEY, JSON.stringify(path));
    else localStorage.removeItem(GPX_KEY);
  } catch { /* storage full — overlay just won't survive a reload */ }
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  tracks: Track[];
  activeTrackId: string | null;
  onChange: (tracks: Track[], activeTrackId: string | null) => void;
  onStartNavigation: (trackId: string, mode: NavMode) => void;
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
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sharing, setSharing] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);   // the empty-track welcome box
  const [historyLen, setHistoryLen] = useState(0);

  const [gpxPath, setGpxPath] = useState<[number, number][] | null>(null);
  const [gpxFresh, setGpxFresh] = useState(false);   // fit the map only for newly loaded files
  const [fitTarget, setFitTarget] = useState<[number, number][] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);
  const historyRef = useRef<Array<{ tracks: Track[]; activeTrackId: string | null }>>([]);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => setToast({ text, tone }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // ── GPX overlay ───────────────────────────────────────────────────────────

  useEffect(() => { setGpxPath(loadGpxOverlay()); }, []);

  const updateGpxPath = (path: [number, number][] | null) => {
    const slim = path ? decimate(path, GPX_MAX_POINTS) : null;
    setGpxFresh(!!slim);
    setGpxPath(slim);
    saveGpxOverlay(slim);
  };

  // ── History / undo ────────────────────────────────────────────────────────

  // Wraps onChange — pushes current state to history before each change
  const commit = (newTracks: Track[], newActiveId: string | null) => {
    historyRef.current = [...historyRef.current.slice(-19), { tracks, activeTrackId }];
    setHistoryLen(historyRef.current.length);
    onChange(newTracks, newActiveId);
  };

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    setHistoryLen(historyRef.current.length);
    if (prev) onChange(prev.tracks, prev.activeTrackId);
  }, [onChange]);

  // Ctrl+Z / Cmd+Z — not while typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') setHintDismissed(true);
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleUndo]);

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

  // Frame the active track when the editor opens, and any track that appears later —
  // including ones added outside the editor (share links, example links)
  const knownTrackIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const known = knownTrackIdsRef.current;
    knownTrackIdsRef.current = new Set(tracks.map((t) => t.id));
    const toFrame = known
      ? tracks.filter((t) => !known.has(t.id))
      : tracks.filter((t) => t.id === activeTrackId);
    const positions = toFrame.flatMap((t) => t.waypoints.map((w): [number, number] => [w.lat, w.lon]));
    if (positions.length > 0) setFitTarget(positions);
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-build marker icons keyed by waypoint id — only rebuilt when tracks or the
  // active selection change, not on every unrelated re-render (modals, menus, search)
  const markerIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const track of tracks) {
      const isActive = track.id === activeTrackId;
      track.waypoints.forEach((wp, i) => {
        m.set(wp.id, makeMarkerIcon(i, track.color, isActive, isActive, wp.danger));
      });
    }
    return m;
  }, [tracks, activeTrackId]);

  // ── Track CRUD ──────────────────────────────────────────────────────────

  const handleAddTrack = () => {
    const track = createTrack(tracks);
    commit([...tracks, track], track.id);
  };

  // Fill the current empty track with a demo route, or add a new one if the
  // active track already has waypoints — then frame it on the map
  const handleLoadDemo = () => {
    const wps = demoTrack().waypoints;
    const positions = wps.map((w): [number, number] => [w.lat, w.lon]);
    if (activeTrack && activeTrack.waypoints.length === 0) {
      commit(
        tracks.map((t) => (t.id === activeTrack.id ? { ...t, name: 'Demo Route', waypoints: wps } : t)),
        activeTrack.id,
      );
    } else {
      const demo: Track = { id: crypto.randomUUID(), name: 'Demo Route', color: nextColor(tracks), waypoints: wps };
      commit([...tracks, demo], demo.id);
    }
    setFitTarget(positions);
    trackEvent('demo-loaded');
  };

  const handleDeleteTrack = (id: string) => {
    const track = tracks.find((t) => t.id === id);
    const count = track?.waypoints.length ?? 0;

    const doDelete = () => {
      const remaining = tracks.filter((t) => t.id !== id);
      const newActive = remaining.find((t) => t.id === activeTrackId)?.id ?? remaining[0]?.id ?? null;
      commit(remaining, newActive);
      setConfirmAction(null);
    };

    if (count > 0) {
      setConfirmAction({
        message: `Delete "${track?.name}" and its ${count} waypoint(s)? You can undo this.`,
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

  const updateWaypoints = (trackId: string, fn: (wps: Waypoint[]) => Waypoint[]) =>
    commit(tracks.map((t) => (t.id === trackId ? { ...t, waypoints: fn(t.waypoints) } : t)), activeTrackId);

  const handleMapClick = (lat: number, lon: number) => {
    if (!activeTrack) return;
    setPending({ lat, lon });
  };

  const handleConfirm = (fields: WaypointFields) => {
    if (!pending || !activeTrack) return;
    const wp: Waypoint = { id: crypto.randomUUID(), lat: pending.lat, lon: pending.lon, ...stripEmpty(fields) };
    updateWaypoints(activeTrack.id, (wps) => [...wps, wp]);
    setPending(null);
  };

  const handleMoveWaypoint = (trackId: string, wpId: string, lat: number, lon: number) =>
    updateWaypoints(trackId, (wps) => wps.map((w) => (w.id === wpId ? { ...w, lat, lon } : w)));

  const handleReorderWaypoint = (trackId: string, fromIndex: number, toIndex: number) =>
    updateWaypoints(trackId, (wps) => {
      const next = [...wps];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });

  const handleSaveEditingWaypoint = (fields: WaypointFields) => {
    if (!editingWaypoint) return;
    updateWaypoints(editingWaypoint.trackId, (wps) =>
      wps.map((w) => {
        if (w.id !== editingWaypoint.waypoint.id) return w;
        const { danger: _d, exit: _e, ...rest } = w;   // eslint-disable-line @typescript-eslint/no-unused-vars
        return { ...rest, ...stripEmpty(fields) };
      }),
    );
    setEditingWaypoint(null);
  };

  const handleDeleteEditingWaypoint = () => {
    if (!editingWaypoint) return;
    updateWaypoints(editingWaypoint.trackId, (wps) => wps.filter((w) => w.id !== editingWaypoint.waypoint.id));
    setEditingWaypoint(null);
  };

  const handleDeleteWaypoint = (trackId: string, wpId: string, label: string) => {
    setConfirmAction({
      message: `Delete waypoint "${label || 'unnamed'}"?`,
      onConfirm: () => {
        updateWaypoints(trackId, (wps) => wps.filter((w) => w.id !== wpId));
        setConfirmAction(null);
      },
    });
  };

  // ── Import / Export ──────────────────────────────────────────────────────

  const handleExport = () => {
    if (!activeTrack) return;
    downloadFile(`${safeFilename(activeTrack.name)}.json`, serializeTracks([activeTrack]), 'application/json');
    trackEvent('export-json', { tracks: 1 });
  };

  const handleExportAll = () => {
    const nonEmpty = tracks.filter((t) => t.waypoints.length > 0);
    downloadFile(`roadbook-all-tracks-${new Date().toISOString().slice(0, 10)}.json`, serializeTracks(nonEmpty), 'application/json');
    trackEvent('export-json', { tracks: nonEmpty.length });
  };

  const handleExportGpx = () => {
    if (!activeTrack) return;
    downloadFile(`${safeFilename(activeTrack.name)}.gpx`, trackToGpx(activeTrack), 'application/gpx+xml');
    trackEvent('export-gpx');
  };

  const addImportedTracks = (imported: Track[]) => {
    if (imported.length === 0) return;
    // Replace the untouched empty starter track instead of keeping it around
    const base = tracks.length === 1 && tracks[0].waypoints.length === 0 ? [] : tracks;
    commit([...base, ...imported], imported[0].id);   // new tracks are framed by the effect above
  };

  const importJson = (text: string, fileName: string) => {
    const parsed = parseRoadbookJson(text, fileName.replace(/\.json$/i, ''));
    const imported = materialize(parsed, tracks);
    addImportedTracks(imported);
    const wpCount = imported.reduce((n, t) => n + t.waypoints.length, 0);
    notify(`Imported ${imported.length} track${imported.length === 1 ? '' : 's'} with ${wpCount} waypoints.`);
    trackEvent('import-json', { tracks: imported.length });
  };

  const importGpx = (text: string, fileName: string) => {
    const { path, waypoints, name } = parseGpx(text);
    if (path.length === 0 && waypoints.length === 0) {
      throw new ImportError('No track points or roadbook waypoints found in this GPX file.');
    }
    const parts: string[] = [];
    if (waypoints.length > 0) {
      addImportedTracks(materialize([{ name: name ?? fileName.replace(/\.(gpx|xml)$/i, ''), waypoints }], tracks));
      parts.push(`${waypoints.length} roadbook waypoints`);
    }
    if (path.length > 0) {
      updateGpxPath(path);
      parts.push('the track as an orange overlay — click near it to place waypoints on it');
    }
    notify(`Loaded ${parts.join(' and ')}.`);
    trackEvent('import-gpx', { waypoints: waypoints.length, overlay: path.length > 0 });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const isGpx = /\.(gpx|xml)$/i.test(file.name) || text.trimStart().startsWith('<');
      try {
        if (isGpx) importGpx(text, file.name);
        else importJson(text, file.name);
      } catch (err) {
        notify(err instanceof ImportError ? err.message : 'Could not read this file.', 'error');
      }
    };
    reader.onerror = () => notify('Could not read this file.', 'error');
    reader.readAsText(file);
  };

  // ── Map center ───────────────────────────────────────────────────────────

  const firstWp = tracks.flatMap((t) => t.waypoints)[0];
  const center: [number, number] = firstWp
    ? [firstWp.lat, firstWp.lon]
    : gpxPath?.[0] ?? [48.137154, 11.576124];

  // ── Derived state ────────────────────────────────────────────────────────

  const hasFinish = activeTrack?.waypoints.some((w) => w.arrowType === 'finish') ?? false;
  const activeWpCount = activeTrack?.waypoints.length ?? 0;
  const canUseTrack = !!activeTrack && activeWpCount > 0;

  const openMenu = () => {
    if (!menuOpen && menuBtnRef.current) {
      const r = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left });
    }
    setMenuOpen((o) => !o);
  };

  const menuAction = (fn: () => void) => () => { fn(); setMenuOpen(false); };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-screen h-[100dvh] bg-black flex flex-col">

      {/* ── Toolbar ── */}
      <div className="relative z-[100] flex items-center gap-2 px-3 sm:px-4 py-3 bg-[#1a1a1a] border-b border-white/20 flex-shrink-0">
        <span className="font-bold text-sm whitespace-nowrap mr-1 text-white hidden sm:inline">Roadbook Nav</span>

        <button
          onClick={handleUndo}
          disabled={historyLen === 0}
          className={`px-3 py-2 text-xs whitespace-nowrap flex items-center gap-1.5 ${BTN_GHOST}`}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon />
          <span className="hidden sm:inline">Undo</span>
        </button>

        {/* File menu */}
        <div ref={menuRef}>
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            aria-label="Open file menu"
            aria-expanded={menuOpen}
            className={`px-3 py-2 text-xs whitespace-nowrap ${BTN_GHOST}`}
          >
            Files ⋯
          </button>
          {menuOpen && (
            <div
              className="fixed z-[9999] flex flex-col gap-1 bg-[#1a1a1a] border border-white/20 rounded-lg p-2 min-w-[190px] shadow-xl"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button onClick={menuAction(() => fileInputRef.current?.click())} className={BTN_MENU_ITEM}>
                ↑ Import JSON or GPX
              </button>
              <div className="border-t border-white/10 my-1" />
              <button onClick={menuAction(handleExport)} disabled={!canUseTrack} className={BTN_MENU_ITEM}>
                ↓ Export roadbook (JSON)
              </button>
              <button onClick={menuAction(handleExportGpx)} disabled={!canUseTrack} className={BTN_MENU_ITEM}>
                ↓ Export as GPX
              </button>
              <button
                onClick={menuAction(handleExportAll)}
                disabled={tracks.every((t) => t.waypoints.length === 0)}
                className={BTN_MENU_ITEM}
              >
                ↓ Export all tracks
              </button>
              {gpxPath && (
                <>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={menuAction(() => updateGpxPath(null))}
                    className="cursor-pointer px-3 py-2 text-xs text-left whitespace-nowrap bg-[#2a2a2a] border border-orange-400/40 rounded-lg text-orange-400 transition-colors hover:bg-orange-400/10"
                  >
                    ✕ Remove GPX overlay
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => { setSharing(true); trackEvent('share-opened'); }}
          disabled={!canUseTrack}
          className={`px-3 py-2 text-xs whitespace-nowrap flex items-center gap-1.5 ${BTN_GHOST}`}
          title="Send this route to your phone with a QR code or link"
        >
          <ShareIcon />
          <span className="hidden sm:inline">Send to phone</span>
          <span className="sm:hidden">Share</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.gpx,.xml,application/json,application/gpx+xml"
          className="hidden"
          onChange={handleImport}
        />

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {activeWpCount > 0 && !hasFinish && (
            <span
              className="text-amber-400/80 text-xs hidden lg:block"
              title="No finish waypoint — add a waypoint with type 'Finish' to mark the end of your route"
            >
              No finish ⚠
            </span>
          )}
          <button
            onClick={() => activeTrackId && canUseTrack && onStartNavigation(activeTrackId, 'preview')}
            disabled={!canUseTrack}
            className={`px-3 py-2 text-sm whitespace-nowrap ${BTN_GHOST}`}
            title="Step through the roadbook without GPS"
          >
            Preview
          </button>
          <button
            onClick={() => activeTrackId && canUseTrack && onStartNavigation(activeTrackId, 'gps')}
            disabled={!canUseTrack}
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
                    className="opacity-60 sm:opacity-0 sm:group-hover/name:opacity-100 transition-opacity text-gray-600 hover:text-gray-300"
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
          <ClickHandler gpxPath={gpxPath} onMapClick={handleMapClick} />
          <MapSearch />
          {gpxPath && <GpxOverlay path={gpxPath} fitOnMount={gpxFresh} />}
          {fitTarget && <FitBounds positions={fitTarget} onDone={() => setFitTarget(null)} />}

          {tracks.map((track) => {
            const isActive = track.id === activeTrackId;
            const positions: [number, number][] = track.waypoints.map((w) => [w.lat, w.lon]);
            return (
              <Fragment key={track.id}>
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
                    icon={markerIcons.get(wp.id) ?? makeMarkerIcon(i, track.color, isActive, isActive, wp.danger)}
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
              </Fragment>
            );
          })}
        </MapContainer>

        {activeTrack && activeTrack.waypoints.length === 0 && !hintDismissed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="relative bg-black/80 border border-white/20 rounded-xl px-6 py-5 text-center max-w-xs flex flex-col items-center gap-3 pointer-events-auto">
              <button
                onClick={() => setHintDismissed(true)}
                className="cursor-pointer absolute top-1.5 right-1.5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-white hover:bg-white/10"
                aria-label="Close"
                title="Close (Esc)"
              >
                ✕
              </button>
              <p className="text-gray-200 text-sm px-4">
                {gpxPath
                  ? 'Click the orange line to trace it into waypoints'
                  : 'Click the map at each junction to place a waypoint'}
              </p>
              <span className="text-gray-600 text-xs">— or —</span>
              <div className="flex flex-col gap-2 w-full">
                <button onClick={handleLoadDemo} className={`px-4 py-2.5 text-sm ${BTN_PRIMARY}`}>
                  Load a demo route
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2.5 text-sm ${BTN_GHOST}`}
                >
                  Import JSON or GPX
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Waypoint strip (active track) ── */}
      {activeTrack && activeTrack.waypoints.length > 0 && (
        <WaypointStrip
          track={activeTrack}
          onReorder={(from, to) => handleReorderWaypoint(activeTrack.id, from, to)}
          onDelete={(wp) => handleDeleteWaypoint(activeTrack.id, wp.id, wp.label)}
          onEdit={(wp, index) => setEditingWaypoint({ trackId: activeTrack.id, waypoint: wp, index })}
        />
      )}

      {/* ── Add waypoint modal ── */}
      {pending && activeTrack && (
        <WaypointModal
          title="Add Waypoint"
          subtitle={<>{pending.lat.toFixed(5)}, {pending.lon.toFixed(5)}</>}
          initial={{ label: '', arrowType: activeTrack.waypoints.length === 0 ? 'start' : 'straight' }}
          submitLabel="Add"
          onSubmit={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      {/* ── Edit waypoint modal ── */}
      {editingWaypoint && (
        <WaypointModal
          title={`Waypoint #${editingWaypoint.index + 1}`}
          subtitle={<>{editingWaypoint.waypoint.lat.toFixed(5)}<br />{editingWaypoint.waypoint.lon.toFixed(5)}</>}
          initial={editingWaypoint.waypoint}
          submitLabel="Save"
          onSubmit={handleSaveEditingWaypoint}
          onDelete={handleDeleteEditingWaypoint}
          onCancel={() => setEditingWaypoint(null)}
        />
      )}

      {sharing && activeTrack && <ShareDialog track={activeTrack} onClose={() => setSharing(false)} />}

      {confirmAction && (
        <ConfirmDialog action={confirmAction} onClose={() => setConfirmAction(null)} />
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}

// Drop optional fields that are unset so stored waypoints stay minimal
function stripEmpty(fields: WaypointFields): WaypointFields {
  const out: WaypointFields = { label: fields.label, arrowType: fields.arrowType };
  if (fields.danger) out.danger = fields.danger;
  if (fields.exit && fields.arrowType === 'roundabout') out.exit = fields.exit;
  return out;
}
