'use client';

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Track, Waypoint } from '@/types/navigation';
import { cumulativeDistances, formatDistance } from '@/lib/geo';
import ArrowGlyph, { DangerBadge } from '../ArrowGlyph';
import { GripIcon } from './icons';
import { BTN_ICON_DEL } from './styles';

function SortableWaypointChip({
  wp,
  index,
  color,
  onDelete,
  onEdit,
}: {
  wp: Waypoint;
  index: number;
  color: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: wp.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs bg-[#1e1e1e] border border-white/20 cursor-grab active:cursor-grabbing touch-none select-none focus:outline-none focus:ring-1 focus:ring-white/40"
    >
      <span className="text-gray-500 -ml-0.5 mr-0.5">
        <GripIcon />
      </span>
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ background: color, fontSize: 9 }}
      >
        {index + 1}
      </span>
      {wp.label && <span className="text-white max-w-20 truncate">{wp.label}</span>}
      <ArrowGlyph type={wp.arrowType} exit={wp.exit} size={14} />
      {wp.danger && <DangerBadge level={wp.danger} />}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`ml-0.5 ${BTN_ICON_DEL}`}
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
}

export default function WaypointStrip({
  track,
  onReorder,
  onDelete,
  onEdit,
}: {
  track: Track;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (wp: Waypoint) => void;
  onEdit: (wp: Waypoint, index: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = track.waypoints.findIndex((wp) => wp.id === active.id);
    const to = track.waypoints.findIndex((wp) => wp.id === over.id);
    if (from === -1 || to === -1) return;
    onReorder(from, to);
  };

  const dists = cumulativeDistances(track.waypoints);
  const totalM = dists[dists.length - 1] ?? 0;

  return (
    <div className="flex-shrink-0 max-h-40 overflow-y-auto bg-[#111] border-t border-white/20 px-3 py-2">
      <p
        className="text-[11px] text-gray-500 mb-1.5 tabular-nums"
        title="Distances are straight lines between waypoints. The real distance along the road or trail is longer."
      >
        {track.waypoints.length} waypoint{track.waypoints.length === 1 ? '' : 's'} · {formatDistance(totalM)} straight-line
        <span className="text-gray-700"> · real distance on the trail is longer</span>
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={track.waypoints.map((wp) => wp.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2">
            {track.waypoints.map((wp, i) => (
              <SortableWaypointChip
                key={wp.id}
                wp={wp}
                index={i}
                color={track.color}
                onDelete={() => onDelete(wp)}
                onEdit={() => onEdit(wp, i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
