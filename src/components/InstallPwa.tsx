'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type State =
  | { kind: 'checking' }
  | { kind: 'installed' }
  | { kind: 'promptable'; event: BeforeInstallPromptEvent }
  | { kind: 'ios' }
  | { kind: 'manual' };

interface InstallPwaProps {
  compact?: boolean;
}

export default function InstallPwa({ compact = false }: InstallPwaProps) {
  const [state, setState] = useState<State>({ kind: 'checking' });

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setState({ kind: 'installed' });
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    const handler = (e: Event) => {
      e.preventDefault();
      setState({ kind: 'promptable', event: e as BeforeInstallPromptEvent });
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Give the event 300 ms to fire before falling back
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.kind !== 'checking') return prev;
        return isIOS ? { kind: 'ios' } : { kind: 'manual' };
      });
    }, 300);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (state.kind !== 'promptable') return;
    await state.event.prompt();
    const { outcome } = await state.event.userChoice;
    if (outcome === 'accepted') setState({ kind: 'installed' });
    else setState({ kind: 'manual' });
  };

  if (state.kind === 'checking') return null;

  if (state.kind === 'installed') {
    return (
      <div className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white/5 border border-white/15 text-green-400 text-base font-bold">
        <svg viewBox="0 0 16 16" width={13} height={13} fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {compact ? 'Installed' : 'Already installed'}
      </div>
    );
  }

  const DownloadIcon = () => (
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none">
      <path d="M8 2v7M8 9l-3-2.5M8 9l3-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  if (state.kind === 'promptable') {
    return compact ? (
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2 px-7 py-4 border border-white/25 text-white text-base font-bold rounded-xl hover:bg-white/5 active:scale-95 transition-all"
      >
        <DownloadIcon />
        Install app
      </button>
    ) : (
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
      >
        <DownloadIcon />
        Install app
      </button>
    );
  }

  if (state.kind === 'ios') {
    if (compact) {
      return (
        <a
          href="#install"
          className="inline-flex items-center gap-2 px-7 py-4 border border-white/25 text-white text-base font-bold rounded-xl hover:bg-white/5 transition-colors"
        >
          <DownloadIcon />
          Add to Home Screen ↓
        </a>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <p className="text-gray-400 text-sm">On iOS Safari:</p>
        <ol className="flex flex-col gap-2 text-sm text-gray-300">
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
            Tap the <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono mx-0.5">Share</span> button at the bottom of Safari
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
            Scroll down and tap <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono mx-0.5">Add to Home Screen</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
            Open the app from your home screen before you leave
          </li>
        </ol>
      </div>
    );
  }

  // manual fallback
  if (compact) {
    return (
      <a
        href="#install"
        className="inline-flex items-center gap-2 px-7 py-4 border border-white/25 text-white text-base font-bold rounded-xl hover:bg-white/5 transition-colors"
      >
        <DownloadIcon />
        Install app ↓
      </a>
    );
  }
  return (
    <p className="text-gray-400 text-sm">
      Open browser menu → <span className="text-white">Install app</span> or{' '}
      <span className="text-white">Add to Home Screen</span>
    </p>
  );
}
