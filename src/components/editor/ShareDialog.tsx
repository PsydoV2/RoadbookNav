'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Track } from '@/types/navigation';
import { buildShareUrl, encodeTrack } from '@/lib/share';
import { safeFilename, serializeTracks } from '@/lib/roadbookFile';
import { trackEvent } from '@/lib/analytics';
import { BTN_CANCEL, BTN_GHOST, BTN_PRIMARY, MODAL_BACKDROP, MODAL_CARD } from './styles';

// Above this the QR code gets too dense for a phone camera to read reliably
const MAX_QR_URL_LENGTH = 1800;

type State =
  | { status: 'loading' }
  | { status: 'ready'; url: string; svg: string | null }
  | { status: 'error' };

export default function ShareDialog({ track, onClose }: { track: Track; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = buildShareUrl(window.location.origin, await encodeTrack(track));
        let svg: string | null = null;
        if (url.length <= MAX_QR_URL_LENGTH) {
          svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'L', margin: 1 });
        }
        if (!cancelled) setState({ status: 'ready', url, svg });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [track]);

  const url = state.status === 'ready' ? state.url : null;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('share-link-copied');
    } catch { /* clipboard blocked — the link is still selectable below */ }
  };

  const nativeShare = async () => {
    if (!url) return;
    try {
      // Prefer sending the file where supported (works offline on the receiving side too)
      const file = new File([serializeTracks([track])], `${safeFilename(track.name)}.json`, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: track.name, text: `Roadbook: ${track.name}\n${url}`, files: [file] });
      } else {
        await navigator.share({ title: track.name, text: `Roadbook: ${track.name}`, url });
      }
      trackEvent('share-native');
    } catch { /* user cancelled */ }
  };

  return (
    <div className={MODAL_BACKDROP} onClick={onClose}>
      <div className={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-bold text-lg text-white">Send to phone</h2>
          <p className="text-gray-400 text-sm mt-1">
            Scan with your phone camera. The route opens in Roadbook Nav and is saved there — no account, no upload.
          </p>
        </div>

        <div className="flex items-center justify-center bg-white rounded-xl p-3 min-h-[220px]">
          {state.status === 'loading' && <span className="text-gray-500 text-sm">Creating code…</span>}
          {state.status === 'error' && <span className="text-red-600 text-sm">Could not create a share link.</span>}
          {state.status === 'ready' && state.svg && (
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.svg)}`}
              alt="QR code with the share link"
              className="w-full max-w-[260px] aspect-square"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          {state.status === 'ready' && !state.svg && (
            <p className="text-gray-700 text-sm text-center px-4">
              This route is too long for a QR code. Copy the link or send the file instead.
            </p>
          )}
        </div>

        {url && (
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full bg-[#111] border border-white/20 rounded-lg px-3 py-2 text-gray-400 text-xs font-mono"
            aria-label="Share link"
          />
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={copy} disabled={!url} className={`flex-1 py-3 px-4 text-sm ${BTN_GHOST}`}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            {canNativeShare && (
              <button onClick={nativeShare} disabled={!url} className={`flex-1 py-3 px-4 text-sm ${BTN_PRIMARY}`}>
                Share…
              </button>
            )}
          </div>
          <button onClick={onClose} className={`py-3 px-4 text-sm ${BTN_CANCEL}`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
