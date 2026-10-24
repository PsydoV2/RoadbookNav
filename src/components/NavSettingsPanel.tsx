'use client';

import { useRef } from 'react';
import type { NavSettings, TriggerRadius } from '@/types/navigation';
import { formatTrip } from '@/lib/geo';
import { HoldBarButton } from './HoldButton';

export interface TripControls {
  meters: number;
  canDownload: boolean;
  onReset: () => void;
  onDownload: () => void;
}

interface Props {
  settings: NavSettings;
  onToggle: (key: keyof NavSettings, value: boolean) => void;
  onChangeTrigger: (radius: TriggerRadius) => void;
  onClose: () => void;
  trip?: TripControls;   // absent in preview mode
}

// ── Icons ─────────────────────────────────────────────────────────────────────

type BooleanNavKey = Exclude<keyof NavSettings, 'triggerRadius'>;

const icons: Record<BooleanNavKey, (active: boolean) => React.ReactNode> = {
  showCounter: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 9h3M8 12h5M8 15h3" />
      <path d="M15 11l2 2-2 2" />
    </svg>
  ),
  showLabel: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill={a ? '#000' : '#fff'} stroke="none" />
    </svg>
  ),
  showOdometer: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
      <path d="M12 12l-3-4" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.2" fill={a ? '#000' : '#fff'} stroke="none" />
      <path d="M7 16h10" strokeWidth="1.2" />
    </svg>
  ),
  showNextPreview: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17l5-5-5-5" />
      <path d="M12 17l5-5-5-5" />
    </svg>
  ),
  showCompass: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" fill={a ? '#000' : '#fff'} stroke="none" />
    </svg>
  ),
  sunlightMode: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  audioApproach: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  audioCrossed: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15 9l4 4m0-4l-4 4" strokeWidth="1.8" />
    </svg>
  ),
  vibration: (a) => (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={a ? '#000' : '#fff'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M4 7v10M20 7v10" />
    </svg>
  ),
};

// ── Chip ─────────────────────────────────────────────────────────────────────

interface ChipDef {
  key: BooleanNavKey;
  label: string;
  hint: string;
}

const DISPLAY_CHIPS: ChipDef[] = [
  { key: 'showCounter',    label: 'Counter',   hint: '3 / 7'    },
  { key: 'showLabel',      label: 'Label',     hint: 'name'     },
  { key: 'showOdometer',   label: 'Trip',      hint: 'km meter' },
  { key: 'showNextPreview',label: 'Next up',   hint: 'preview'  },
];

const AUDIO_CHIPS: ChipDef[] = [
  { key: 'audioApproach', label: 'Approach', hint: '~9 s ahead' },
  { key: 'audioCrossed',  label: 'Crossed',  hint: 'double beep'},
  { key: 'vibration',     label: 'Vibration',hint: 'on cross'   },
];

function Chip({ def, active, onToggle }: { def: ChipDef; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-2xl transition-colors ${
        active ? 'bg-white text-black' : 'bg-[#222] text-gray-400'
      }`}
    >
      {icons[def.key](active)}
      <div className="text-center leading-tight">
        <p className={`text-sm font-semibold ${active ? 'text-black' : 'text-white'}`}>
          {def.label}
        </p>
        <p className={`text-xs mt-0.5 ${active ? 'text-black/50' : 'text-gray-600'}`}>
          {def.hint}
        </p>
      </div>
    </button>
  );
}

// Full-width toggle for options that need a sentence of explanation
function RowToggle({
  settingKey,
  title,
  hint,
  active,
  onToggle,
}: {
  settingKey: BooleanNavKey;
  title: string;
  hint: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
        active ? 'bg-white' : 'bg-[#222]'
      }`}
    >
      <span className="flex-shrink-0">{icons[settingKey](active)}</span>
      <span className="flex-1 leading-tight">
        <span className={`block text-sm font-semibold ${active ? 'text-black' : 'text-white'}`}>{title}</span>
        <span className={`block text-xs mt-0.5 ${active ? 'text-black/50' : 'text-gray-600'}`}>{hint}</span>
      </span>
      <span
        className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
          active ? 'bg-black/10 text-black' : 'bg-white/10 text-gray-400'
        }`}
      >
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS: TriggerRadius[] = [15, 25, 50];

export default function NavSettingsPanel({ settings, onToggle, onChangeTrigger, onClose, trip }: Props) {
  const startYRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only treat as swipe-to-close when the sheet is scrolled to the top
    startYRef.current = (scrollRef.current?.scrollTop ?? 0) > 0 ? null : e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 70) {
      onClose();
      startYRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    startYRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70"
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="bg-[#141414] border-t border-white/15 rounded-t-3xl px-5 pt-4 pb-10 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 cursor-grab" />

        {/* Display */}
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-3 px-1">Display</p>
        <div className="grid grid-cols-4 gap-2.5 mb-3">
          {DISPLAY_CHIPS.map((def) => (
            <Chip
              key={def.key}
              def={def}
              active={settings[def.key] as boolean}
              onToggle={() => onToggle(def.key, !(settings[def.key] as boolean))}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {/* Compass — off by default to keep the screen minimal */}
          <RowToggle
            settingKey="showCompass"
            title="Compass to waypoint"
            hint="Edge tick points the way · needs movement"
            active={settings.showCompass}
            onToggle={() => onToggle('showCompass', !settings.showCompass)}
          />
          <RowToggle
            settingKey="sunlightMode"
            title="Sunlight mode"
            hint="Black on white — easier to read in direct sun"
            active={settings.sunlightMode}
            onToggle={() => onToggle('sunlightMode', !settings.sunlightMode)}
          />
        </div>

        {/* Audio & Haptics */}
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-3 px-1">Audio & Haptics</p>
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {AUDIO_CHIPS.map((def) => (
            <Chip
              key={def.key}
              def={def}
              active={settings[def.key] as boolean}
              onToggle={() => onToggle(def.key, !(settings[def.key] as boolean))}
            />
          ))}
        </div>

        {/* Trigger radius */}
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-3 px-1">Waypoint trigger radius</p>
        <div className="flex gap-2">
          {TRIGGER_OPTIONS.map((r) => {
            const active = settings.triggerRadius === r;
            return (
              <button
                key={r}
                onClick={() => onChangeTrigger(r)}
                aria-pressed={active}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  active ? 'bg-white text-black' : 'bg-[#222] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
              >
                {r} m
              </button>
            );
          })}
        </div>
        <p className="text-gray-700 text-xs mt-2 px-1">
          Distance at which a waypoint is auto-crossed. All distances are straight-line, not along the road.
        </p>

        {/* Trip meter & recorded ride */}
        {trip && (
          <>
            <p className="text-gray-600 text-xs uppercase tracking-widest mt-6 mb-3 px-1">
              Trip · <span className="tabular-nums normal-case tracking-normal text-gray-400">{formatTrip(trip.meters)}</span>
            </p>
            <div className="flex gap-2">
              <HoldBarButton
                onComplete={trip.onReset}
                holdMs={900}
                label="Hold to reset trip meter"
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#222] text-gray-300"
              >
                Hold to reset trip
              </HoldBarButton>
              <button
                onClick={trip.onDownload}
                disabled={!trip.canDownload}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#222] text-gray-300 hover:bg-[#2a2a2a] disabled:opacity-35 disabled:pointer-events-none"
              >
                Ride as GPX
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
