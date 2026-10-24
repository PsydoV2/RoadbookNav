'use client';

import { useEffect, useRef, useState } from 'react';

// Press-and-hold activation for actions that must not fire from an accidental tap
// (gloves, vibration, rain). Returns 0…1 progress for the caller to visualise.
export function useHold(onComplete: () => void, holdMs: number) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(onComplete);
  useEffect(() => { doneRef.current = onComplete; });

  const start = () => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / holdMs, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(0);
        doneRef.current();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return {
    progress,
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

// Round button with a progress ring — used for "exit navigation"
export function HoldRingButton({
  onComplete,
  holdMs = 1200,
  label,
  children,
}: {
  onComplete: () => void;
  holdMs?: number;
  label: string;
  children: React.ReactNode;
}) {
  const { progress, handlers } = useHold(onComplete, holdMs);
  const r = 20;
  const circ = 2 * Math.PI * r;

  return (
    <button
      {...handlers}
      className="cursor-pointer w-14 h-14 flex-shrink-0 flex items-center justify-center relative select-none touch-none"
      aria-label={label}
    >
      <svg className="absolute inset-0 -rotate-90" width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
        {progress > 0 && (
          <circle
            cx={28} cy={28} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2.5}
            strokeDasharray={`${progress * circ} ${circ}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className={`text-xl z-10 transition-colors ${progress > 0 ? 'text-white' : 'text-gray-500'}`}>{children}</span>
    </button>
  );
}

// Wide button that fills from left to right while held — used for "skip waypoint"
export function HoldBarButton({
  onComplete,
  holdMs = 700,
  label,
  className = '',
  children,
}: {
  onComplete: () => void;
  holdMs?: number;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { progress, handlers } = useHold(onComplete, holdMs);
  return (
    <button
      {...handlers}
      aria-label={label}
      className={`relative overflow-hidden select-none touch-none ${className}`}
    >
      <span
        className="absolute inset-y-0 left-0 bg-white/20 pointer-events-none"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />
      <span className="relative">{children}</span>
    </button>
  );
}
