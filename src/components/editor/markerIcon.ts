import L from 'leaflet';

export function makeMarkerIcon(index: number, color: string, isActive: boolean, isDraggable: boolean, danger?: number) {
  const size = isActive ? 28 : 20;
  // Hazard waypoints get a red outline so they stand out on the map
  const border = danger ? '#dc2626' : 'rgba(255,255,255,0.85)';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};color:#fff;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${isActive ? 12 : 10}px;
      border:${danger ? 3 : 2}px solid ${border};
      box-shadow:0 1px 5px rgba(0,0,0,0.6);
      opacity:${isActive ? 1 : 0.55};
      cursor:${isDraggable ? 'grab' : 'pointer'};
    ">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
