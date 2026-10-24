import { describe, expect, it } from 'vitest';
import {
  APPROACH_DEFAULT_M,
  APPROACH_MAX_M,
  APPROACH_MIN_M,
  approachDistance,
  evaluateWaypoint,
  odometerStep,
  speedBetween,
  type Fix,
} from './navLogic';

describe('evaluateWaypoint', () => {
  const R = 25;

  it('crosses inside the trigger radius', () => {
    expect(evaluateWaypoint(10, 10, R)).toBe('cross');
  });

  it('does nothing while still approaching', () => {
    expect(evaluateWaypoint(200, 200, R)).toBeNull();
    expect(evaluateWaypoint(40, 40, R)).toBeNull();
  });

  it('detects an overshoot after passing close by', () => {
    // closest approach 30 m (never inside 25 m), now 56 m away → passed
    expect(evaluateWaypoint(56, 30, R)).toBe('overshoot');
  });

  it('does not treat GPS jitter near the closest point as overshoot', () => {
    expect(evaluateWaypoint(45, 30, R)).toBeNull();
  });

  it('does not arm when the rider never got close', () => {
    // closest 80 m (> 2.5 × 25), moving away — probably a different road, keep waiting
    expect(evaluateWaypoint(200, 80, R)).toBeNull();
  });
});

describe('approachDistance', () => {
  it('falls back to the default when speed is unknown', () => {
    expect(approachDistance(null)).toBe(APPROACH_DEFAULT_M);
    expect(approachDistance(NaN)).toBe(APPROACH_DEFAULT_M);
    expect(approachDistance(0)).toBe(APPROACH_DEFAULT_M);
  });

  it('scales with speed and stays within bounds', () => {
    expect(approachDistance(2)).toBe(APPROACH_MIN_M);           // walking pace
    expect(approachDistance(15)).toBeCloseTo(135);               // 54 km/h → 9 s
    expect(approachDistance(60)).toBe(APPROACH_MAX_M);           // 216 km/h
  });
});

describe('odometerStep', () => {
  const at = (lat: number, lon: number, time: number, accuracy = 5): Fix => ({ lat, lon, accuracy, time });
  // ~11.1 m per 0.0001° latitude
  const base = at(48.0, 11.0, 0);

  it('anchors on the first good fix without adding distance', () => {
    expect(odometerStep(null, base)).toEqual({ accept: true, meters: 0 });
  });

  it('ignores inaccurate fixes', () => {
    expect(odometerStep(base, at(48.001, 11.0, 10000, 80)).accept).toBe(false);
  });

  it('holds back tiny steps so standing still adds nothing', () => {
    expect(odometerStep(base, at(48.00002, 11.0, 1000)).accept).toBe(false);
  });

  it('adds real movement', () => {
    const step = odometerStep(base, at(48.0001, 11.0, 1000));
    expect(step.accept).toBe(true);
    expect(step.meters).toBeCloseTo(11.1, 0);
  });

  it('rejects impossible jumps', () => {
    // 1.1 km in one second
    expect(odometerStep(base, at(48.01, 11.0, 1000)).accept).toBe(false);
  });
});

describe('speedBetween', () => {
  it('computes metres per second', () => {
    const a: Fix = { lat: 48.0, lon: 11.0, accuracy: 5, time: 0 };
    const b: Fix = { lat: 48.0001, lon: 11.0, accuracy: 5, time: 1000 };
    expect(speedBetween(a, b)).toBeCloseTo(11.1, 0);
  });

  it('returns null without a usable previous fix', () => {
    const b: Fix = { lat: 48, lon: 11, accuracy: 5, time: 1000 };
    expect(speedBetween(null, b)).toBeNull();
    expect(speedBetween(b, b)).toBeNull();
  });
});
