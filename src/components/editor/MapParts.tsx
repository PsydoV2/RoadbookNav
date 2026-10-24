'use client';

import { useEffect, useRef, useState } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// ── Click handler with snap-to-GPX ───────────────────────────────────────────

interface ClickHandlerProps {
  gpxPath: [number, number][] | null;
  onMapClick: (lat: number, lon: number) => void;
}
// Snap a click onto the GPX overlay when it lands within SNAP_PX of the line
const SNAP_PX = 18;
export function ClickHandler({ gpxPath, onMapClick }: ClickHandlerProps) {
  const map = useMap();
  useMapEvents({
    click: (e) => {
      let { lat, lng } = e.latlng;
      if (gpxPath && gpxPath.length > 0) {
        const clickPt = map.latLngToContainerPoint(e.latlng);
        const pts = gpxPath.map(([la, lo]) => map.latLngToContainerPoint([la, lo]));
        let bestPt: L.Point | null = null;
        let bestDist = Infinity;
        if (pts.length === 1) {
          bestPt = pts[0];
          bestDist = clickPt.distanceTo(pts[0]);
        } else {
          for (let i = 0; i < pts.length - 1; i++) {
            const c = L.LineUtil.closestPointOnSegment(clickPt, pts[i], pts[i + 1]);
            const dd = clickPt.distanceTo(c);
            if (dd < bestDist) { bestDist = dd; bestPt = c; }
          }
        }
        if (bestPt && bestDist <= SNAP_PX) {
          const ll = map.containerPointToLatLng(bestPt);
          lat = ll.lat;
          lng = ll.lng;
        }
      }
      onMapClick(lat, lng);
    },
  });
  return null;
}

// Imperatively fits the map to a set of positions once, then clears the trigger
export function FitBounds({ positions, onDone }: { positions: [number, number][]; onDone: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) map.setView(positions[0], 14);
    else if (positions.length > 1) map.fitBounds(L.latLngBounds(positions), { padding: [60, 60] });
    onDone();
  }, [map, positions, onDone]);
  return null;
}

// ── Location search (Nominatim) ──────────────────────────────────────────────

export function MapSearch() {
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
  }, [open]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setNotFound(false);
    try {
      // Browsers don't allow setting User-Agent; Nominatim identifies us by the Referer instead
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
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

// ── GPX overlay ──────────────────────────────────────────────────────────────

// Fits the map to the track only when a new file is loaded, not when restored on reload
export function GpxOverlay({ path, fitOnMount }: { path: [number, number][]; fitOnMount: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (fitOnMount && path.length > 1) map.fitBounds(L.latLngBounds(path), { padding: [40, 40] });
  }, [map, path, fitOnMount]);
  return (
    <>
      {/* White halo so the line reads against any map background */}
      <Polyline positions={path} color="white" weight={8} opacity={0.55} lineCap="round" lineJoin="round" />
      {/* Orange dashed line on top */}
      <Polyline positions={path} color="#f97316" weight={4} opacity={0.95} dashArray="10 6" lineCap="round" lineJoin="round" />
    </>
  );
}
