import type { ArrowType, DangerLevel } from '@/types/navigation';
import { ARROW_FILE, ARROW_LABELS } from '@/types/navigation';

// Shared by the editor (small, on light or dark chips) and the navigation screen (huge).
// The SVG files are black strokes, so the tone is applied with an invert filter.

export type GlyphTone = 'light' | 'dark' | 'muted';

const STROKE: Record<GlyphTone, string> = { light: '#fff', dark: '#000', muted: '#666' };
const FILE_FILTER: Record<GlyphTone, string> = { light: 'invert(1)', dark: 'none', muted: 'invert(0.4)' };

interface Props {
  type: ArrowType;
  size: number | string;
  tone?: GlyphTone;
  exit?: number;
}

export default function ArrowGlyph({ type, size, tone = 'light', exit }: Props) {
  const file = ARROW_FILE[type];
  const label = type === 'roundabout' && exit ? `${ARROW_LABELS[type]}, exit ${exit}` : ARROW_LABELS[type];
  if (file) {
    return (
      <img
        src={file}
        alt={label}
        width={typeof size === 'number' ? size : undefined}
        height={typeof size === 'number' ? size : undefined}
        style={{ filter: FILE_FILTER[tone], width: size, height: size }}
        draggable={false}
      />
    );
  }

  const c = STROKE[tone];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" role="img" aria-label={label}>
      <InlineShape type={type} color={c} exit={exit} />
    </svg>
  );
}

function InlineShape({ type, color, exit }: { type: ArrowType; color: string; exit?: number }) {
  switch (type) {
    case 'start':
      return (
        <>
          <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.5" fill={color} />
        </>
      );
    case 'keep-left':
      return <ForkShape color={color} />;
    case 'keep-right':
      return (
        <g transform="matrix(-1 0 0 1 24 0)">
          <ForkShape color={color} />
        </g>
      );
    case 'roundabout':
      return (
        <>
          <circle cx="12" cy="10.5" r="6" stroke={color} strokeWidth="1.6" />
          <path d="M12 22v-5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          {exit ? (
            <text
              x="12" y="10.6"
              textAnchor="middle" dominantBaseline="central"
              fontSize="7.5" fontWeight="800" fill={color}
              fontFamily="system-ui, sans-serif"
            >
              {exit}
            </text>
          ) : (
            // Counter-clockwise flow arrow when no exit is given
            <path d="M15 7.5l-0.4 2.6-2.5-0.9" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </>
      );
    default:
      // finish
      return (
        <>
          <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.5" />
          <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
  }
}

// Y-fork with the left branch highlighted; mirrored for keep-right
function ForkShape({ color }: { color: string }) {
  return (
    <>
      <path d="M12 21v-8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 13l5 -7" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <path d="M12 13L6.3 5.4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.1 9.2L6 5l3.9 1.2" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// ── Danger marking ────────────────────────────────────────────────────────────

const DANGER_STYLE: Record<DangerLevel, string> = {
  1: 'bg-amber-400 text-black',
  2: 'bg-orange-500 text-black',
  3: 'bg-red-600 text-white',
};

export function DangerBadge({ level, size = 'sm' }: { level: DangerLevel; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded-md leading-none ${DANGER_STYLE[level]} ${
        size === 'lg' ? 'text-3xl px-3 py-1.5' : 'text-[10px] px-1 py-0.5'
      }`}
      aria-label={`Danger level ${level}`}
    >
      {'!'.repeat(level)}
    </span>
  );
}
