'use client';

import { useState } from 'react';
import type { ArrowType, DangerLevel, Waypoint } from '@/types/navigation';
import { ARROW_LABELS, ARROW_TYPES, DANGER_LEVELS, MAX_ROUNDABOUT_EXIT } from '@/types/navigation';
import ArrowGlyph from '../ArrowGlyph';
import { BTN_ARROW_OFF, BTN_CANCEL, BTN_DELETE, BTN_PRIMARY, INPUT, MODAL_BACKDROP, MODAL_CARD } from './styles';

export type WaypointFields = Pick<Waypoint, 'label' | 'arrowType' | 'danger' | 'exit'>;

// Arrow-type grid
function ArrowGrid({ value, onChange }: { value: ArrowType; onChange: (t: ArrowType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ARROW_TYPES.map((type) => {
        const active = value === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`cursor-pointer flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium ${
              active ? 'bg-white text-black' : BTN_ARROW_OFF
            }`}
          >
            <ArrowGlyph type={type} tone={active ? 'dark' : 'light'} size={18} />
            {ARROW_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

// Row of small toggle buttons, e.g. roundabout exits or danger levels
function PillRow<T extends number>({
  label,
  options,
  value,
  onChange,
  render,
}: {
  label: string;
  options: T[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  render: (v: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(undefined)}
          className={`cursor-pointer flex-1 py-2 rounded-lg text-sm ${value === undefined ? 'bg-white text-black font-bold' : BTN_ARROW_OFF}`}
        >
          –
        </button>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`cursor-pointer flex-1 py-2 rounded-lg text-sm font-bold ${value === o ? 'bg-white text-black' : BTN_ARROW_OFF}`}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

const EXITS = Array.from({ length: MAX_ROUNDABOUT_EXIT }, (_, i) => i + 1);

interface Props {
  title: string;
  subtitle: React.ReactNode;
  initial: WaypointFields;
  submitLabel: string;
  onSubmit: (fields: WaypointFields) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

// One modal for both adding and editing a waypoint
export default function WaypointModal({ title, subtitle, initial, submitLabel, onSubmit, onCancel, onDelete }: Props) {
  const [label, setLabel] = useState(initial.label);
  const [arrowType, setArrowType] = useState<ArrowType>(initial.arrowType);
  const [danger, setDanger] = useState<DangerLevel | undefined>(initial.danger);
  const [exit, setExit] = useState<number | undefined>(initial.exit);

  const submit = () =>
    onSubmit({
      label: label.trim(),
      arrowType,
      danger,
      exit: arrowType === 'roundabout' ? exit : undefined,
    });

  return (
    <div className={MODAL_BACKDROP}>
      <div className={MODAL_CARD}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-lg text-white">{title}</h2>
          <span className="text-xs text-gray-400 font-mono mt-1 text-right">{subtitle}</span>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Label or note (optional)"
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className={INPUT}
        />

        <ArrowGrid value={arrowType} onChange={setArrowType} />

        {arrowType === 'roundabout' && (
          <PillRow label="Exit" options={EXITS} value={exit} onChange={setExit} render={(n) => n} />
        )}

        <PillRow
          label="Danger"
          options={DANGER_LEVELS}
          value={danger}
          onChange={setDanger}
          render={(n) => '!'.repeat(n)}
        />

        <div className="flex gap-2">
          <button onClick={onCancel} className={`py-3 px-4 ${onDelete ? '' : 'flex-1'} ${BTN_CANCEL}`}>
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete} className={`py-3 px-4 ${BTN_DELETE}`}>
              Delete
            </button>
          )}
          <button onClick={submit} className={`flex-1 py-3 px-4 ${BTN_PRIMARY}`}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
