'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    let onVisibility: (() => void) | null = null;
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // On every visibility restore, check if a new SW version is available
      onVisibility = () => { if (document.visibilityState === 'visible') reg.update(); };
      document.addEventListener('visibilitychange', onVisibility);
    });

    // When a new SW activates (skipWaiting fired), reload once to serve the fresh build
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
