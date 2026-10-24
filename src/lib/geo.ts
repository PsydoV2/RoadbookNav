// Pure geo helpers — no browser APIs, so they can be unit-tested in Node.

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Initial bearing (forward azimuth) from point 1 → point 2, in degrees (0 = north)
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Signed difference target − heading, normalised to (-180, 180]
export function relativeBearing(target: number, heading: number): number {
  const d = ((target - heading + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
  return `${Math.round(meters)} m`;
}

// Trip-meter style: always km with two decimals, like a rally odometer
export function formatTrip(meters: number): string {
  return `${(Math.max(0, meters) / 1000).toFixed(2)} km`;
}

// Cumulative straight-line distance from the first point to each point
export function cumulativeDistances(points: Array<{ lat: number; lon: number }>): number[] {
  const d = points.length > 0 ? [0] : [];
  for (let i = 1; i < points.length; i++) {
    d.push(d[i - 1] + haversineMeters(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon));
  }
  return d;
}

// Keep at most maxPoints by uniform decimation, always keeping both endpoints
export function decimate<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints || maxPoints < 2) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.round(i * step)]);
  return out;
}
