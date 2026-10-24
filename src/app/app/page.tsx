'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Track } from '@/types/navigation';
import MotorbikeUi, { type NavMode } from '@/components/MotorbikeUi';
import { ConfirmDialog, type ConfirmAction } from '@/components/editor/Dialogs';
import { unlockAudio } from '@/lib/audio';
import { clearProgress, hasResumableProgress, loadProgress } from '@/lib/navProgress';
import { formatTrip } from '@/lib/geo';
import { decodeTrack, readShareHash } from '@/lib/share';
import { ImportError, parseRoadbookJson, type ImportedTrack } from '@/lib/roadbookFile';
import { materialize } from '@/lib/tracks';
import { trackEvent } from '@/lib/analytics';

const MapEditor = dynamic(() => import('@/components/MapEditor'), { ssr: false });

const STORAGE_KEY = 'roadbook_v2';

// Example routes shipped in /public/examples — opened via /app/?example=<name>
const EXAMPLE_NAME = /^[a-z0-9-]+$/;

interface NavSession {
  trackId: string;
  mode: NavMode;
  resume: boolean;
}

export default function AppPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [session, setSession] = useState<NavSession | null>(null);
  const [dialog, setDialog] = useState<ConfirmAction | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Latest tracks for callbacks created earlier (e.g. the import dialog)
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

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

  const handleChange = useCallback((newTracks: Track[], newActiveId: string | null) => {
    setTracks(newTracks);
    setActiveTrackId(newActiveId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tracks: newTracks, activeTrackId: newActiveId }));
    } catch {
      // storage full
    }
  }, []);

  // ── Incoming routes: share links (#r=…) and example routes (?example=…) ──

  useEffect(() => {
    if (!hydrated) return;
    // On load, and when a share link is opened while the app is already open
    handleIncoming();
    window.addEventListener('hashchange', handleIncoming);
    return () => window.removeEventListener('hashchange', handleIncoming);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleIncoming() {
    const encoded = readShareHash(window.location.hash);
    const example = new URLSearchParams(window.location.search).get('example');
    if (!encoded && !example) return;

    // Clean the URL right away so a reload doesn't offer the same import again
    window.history.replaceState(null, '', window.location.pathname);

    const offerImport = (incoming: ImportedTrack, source: 'share' | 'example') => {
      setDialog({
        message: `Add "${incoming.name}" (${incoming.waypoints.length} waypoints) to your tracks?`,
        confirmLabel: 'Add route',
        tone: 'primary',
        onConfirm: () => {
          setDialog(null);
          const current = tracksRef.current;
          const [track] = materialize([incoming], current);
          // Replace the untouched empty starter track instead of keeping it around
          const base = current.length === 1 && current[0].waypoints.length === 0 ? [] : current;
          handleChange([...base, track], track.id);
          trackEvent(source === 'share' ? 'shared-route-imported' : 'example-imported', { waypoints: incoming.waypoints.length });
        },
      });
    };

    const showError = (message: string) =>
      setDialog({ message, confirmLabel: 'OK', tone: 'primary', onConfirm: () => setDialog(null) });

    (async () => {
      try {
        if (encoded) {
          offerImport(await decodeTrack(encoded), 'share');
        } else if (example && EXAMPLE_NAME.test(example)) {
          const res = await fetch(`/examples/${example}.json`);
          if (!res.ok) throw new ImportError('This example route does not exist.');
          const [track] = parseRoadbookJson(await res.text(), example);
          if (track) offerImport(track, 'example');
        }
      } catch (e) {
        showError(e instanceof ImportError ? e.message : 'Could not load this route.');
      }
    })();
  }

  // ── Starting navigation ───────────────────────────────────────────────────

  const start = (trackId: string, mode: NavMode, resume: boolean) => {
    unlockAudio();   // must happen inside the tap — mobile browsers block audio otherwise
    setDialog(null);
    setSession({ trackId, mode, resume });
    trackEvent('navigation-started', { mode, resume });
  };

  const handleStartNavigation = (trackId: string, mode: NavMode) => {
    unlockAudio();
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    if (mode === 'preview') {
      start(trackId, mode, false);
      return;
    }
    const progress = loadProgress(trackId, track.waypoints);
    if (hasResumableProgress(progress, track.waypoints.length)) {
      setDialog({
        message: `You stopped at waypoint ${progress.index + 1} of ${track.waypoints.length} (trip ${formatTrip(progress.tripM)}).\nContinue from there?`,
        confirmLabel: 'Resume',
        cancelLabel: 'Start over',
        tone: 'primary',
        onConfirm: () => start(trackId, mode, true),
        onCancel: () => {
          clearProgress(trackId);
          start(trackId, mode, false);
        },
      });
      return;
    }
    clearProgress(trackId);
    start(trackId, mode, false);
  };

  if (!hydrated) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const navigatingTrack = session ? tracks.find((t) => t.id === session.trackId) : undefined;

  return (
    <>
      {navigatingTrack && session ? (
        <MotorbikeUi
          key={`${session.trackId}-${session.mode}`}
          track={navigatingTrack}
          mode={session.mode}
          resume={session.resume}
          onExit={() => setSession(null)}
        />
      ) : (
        <MapEditor
          tracks={tracks}
          activeTrackId={activeTrackId}
          onChange={handleChange}
          onStartNavigation={handleStartNavigation}
        />
      )}
      {dialog && <ConfirmDialog action={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
