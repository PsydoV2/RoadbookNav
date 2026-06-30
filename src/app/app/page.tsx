'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Track } from '@/types/navigation';
import MotorbikeUi from '@/components/MotorbikeUi';

const MapEditor = dynamic(() => import('@/components/MapEditor'), { ssr: false });

const STORAGE_KEY = 'roadbook_v2';

export default function AppPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [navigatingTrackId, setNavigatingTrackId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTracks(parsed.tracks ?? []);
        setActiveTrackId(parsed.activeTrackId ?? null);
      }
    } catch {
      // corrupted storage — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.body.dataset.overscroll = 'none';
    return () => {
      delete document.body.dataset.overscroll;
    };
  }, []);

  const handleChange = (newTracks: Track[], newActiveId: string | null) => {
    setTracks(newTracks);
    setActiveTrackId(newActiveId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tracks: newTracks, activeTrackId: newActiveId }));
    } catch {
      // storage full
    }
  };

  if (!hydrated) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const navigatingTrack = tracks.find((t) => t.id === navigatingTrackId);

  if (navigatingTrack) {
    return (
      <MotorbikeUi
        waypoints={navigatingTrack.waypoints}
        onExit={() => setNavigatingTrackId(null)}
      />
    );
  }

  return (
    <MapEditor
      tracks={tracks}
      activeTrackId={activeTrackId}
      onChange={handleChange}
      onStartNavigation={(trackId) => setNavigatingTrackId(trackId)}
    />
  );
}
