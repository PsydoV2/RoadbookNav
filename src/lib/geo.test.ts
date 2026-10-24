import { describe, expect, it } from 'vitest';
import {
  bearingDeg,
  cumulativeDistances,
  decimate,
  formatDistance,
  formatTrip,
  haversineMeters,
  relativeBearing,
} from './geo';

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters(48.1, 11.5, 48.1, 11.5)).toBe(0);
  });

  it('matches one degree of latitude (~111.2 km)', () => {
    expect(haversineMeters(0, 0, 1, 0)).toBeCloseTo(111195, -1);
  });

  it('is symmetric', () => {
    const a = haversineMeters(48.11, 11.45, 48.124, 11.45);
    const b = haversineMeters(48.124, 11.45, 48.11, 11.45);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('bearingDeg', () => {
  it('returns cardinal directions', () => {
    expect(bearingDeg(0, 0, 1, 0)).toBeCloseTo(0, 5);     // north
    expect(bearingDeg(0, 0, 0, 1)).toBeCloseTo(90, 5);    // east
    expect(bearingDeg(1, 0, 0, 0)).toBeCloseTo(180, 5);   // south
    expect(bearingDeg(0, 1, 0, 0)).toBeCloseTo(270, 5);   // west
  });
});

describe('relativeBearing', () => {
  it('normalises into (-180, 180]', () => {
    expect(relativeBearing(10, 350)).toBe(20);
    expect(relativeBearing(350, 10)).toBe(-20);
    expect(relativeBearing(180, 0)).toBe(180);
    expect(relativeBearing(0, 180)).toBe(180);
  });
});

describe('formatting', () => {
  it('formats distances by magnitude', () => {
    expect(formatDistance(42.4)).toBe('42 m');
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(1840)).toBe('1.8 km');
  });

  it('formats the trip meter with two decimals and never negative', () => {
    expect(formatTrip(12345)).toBe('12.35 km');
    expect(formatTrip(-5)).toBe('0.00 km');
  });
});

describe('cumulativeDistances', () => {
  it('accumulates leg lengths from zero', () => {
    const pts = [{ lat: 0, lon: 0 }, { lat: 1, lon: 0 }, { lat: 2, lon: 0 }];
    const d = cumulativeDistances(pts);
    expect(d[0]).toBe(0);
    expect(d[2]).toBeCloseTo(2 * d[1], 3);
  });

  it('handles an empty route', () => {
    expect(cumulativeDistances([])).toEqual([]);
  });
});

describe('decimate', () => {
  it('keeps short lists untouched', () => {
    expect(decimate([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });

  it('keeps both endpoints and the requested size', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => i);
    const out = decimate(pts, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toBe(0);
    expect(out[9]).toBe(999);
  });
});
