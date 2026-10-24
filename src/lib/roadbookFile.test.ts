import { describe, expect, it } from 'vitest';
import type { Track } from '@/types/navigation';
import { FILE_FORMAT, ImportError, parseRoadbookJson, rideToGpx, serializeTracks, trackToGpx } from './roadbookFile';
import { decodeTrack, encodeTrack, readShareHash, buildShareUrl } from './share';

const track: Track = {
  id: 't1',
  name: 'Forest <Loop> & more',
  color: '#ef4444',
  waypoints: [
    { id: 'a', lat: 48.11, lon: 11.45, arrowType: 'start', label: 'Trailhead' },
    { id: 'b', lat: 48.1135, lon: 11.456, arrowType: 'roundabout', label: '', exit: 3 },
    { id: 'c', lat: 48.118, lon: 11.4585, arrowType: 'keep-left', label: 'Creek', danger: 2 },
    { id: 'd', lat: 48.119, lon: 11.442, arrowType: 'finish', label: 'Hut' },
  ],
};

describe('JSON round trip', () => {
  it('serializes a versioned file and reads it back', () => {
    const text = serializeTracks([track]);
    expect(JSON.parse(text).format).toBe(FILE_FORMAT);

    const [imported] = parseRoadbookJson(text, 'fallback');
    expect(imported.name).toBe(track.name);
    expect(imported.color).toBe(track.color);
    expect(imported.waypoints.map((w) => w.arrowType)).toEqual(['start', 'roundabout', 'keep-left', 'finish']);
    expect(imported.waypoints[1].exit).toBe(3);
    expect(imported.waypoints[2].danger).toBe(2);
  });

  it('assigns fresh waypoint ids on import', () => {
    const [imported] = parseRoadbookJson(serializeTracks([track]), 'x');
    expect(imported.waypoints.map((w) => w.id)).not.toContain('a');
  });

  it('reads the legacy bare waypoint array', () => {
    const legacy = JSON.stringify([{ id: 'x', lat: 1, lon: 2, arrowType: 'left', label: 'L' }]);
    const [imported] = parseRoadbookJson(legacy, 'my-route');
    expect(imported.name).toBe('my-route');
    expect(imported.waypoints[0]).toMatchObject({ lat: 1, lon: 2, arrowType: 'left', label: 'L' });
  });

  it('reads the legacy bare track array', () => {
    const legacy = JSON.stringify([{ id: 't', name: 'A', color: '#fff', waypoints: [] }]);
    expect(parseRoadbookJson(legacy, 'x')).toEqual([{ name: 'A', color: '#fff', waypoints: [] }]);
  });

  it('drops invalid optional fields instead of failing', () => {
    const text = JSON.stringify([{ lat: 1, lon: 2, arrowType: 'left', label: '', danger: 9, exit: 2 }]);
    const [imported] = parseRoadbookJson(text, 'x');
    expect(imported.waypoints[0].danger).toBeUndefined();
    expect(imported.waypoints[0].exit).toBeUndefined();   // exit only applies to roundabouts
  });

  it('rejects broken or foreign files with a readable error', () => {
    expect(() => parseRoadbookJson('{nope', 'x')).toThrow(ImportError);
    expect(() => parseRoadbookJson('{"hello":1}', 'x')).toThrow(ImportError);
    expect(() => parseRoadbookJson(JSON.stringify([{ lat: 999, lon: 0, arrowType: 'left', label: '' }]), 'x')).toThrow(ImportError);
    expect(() => parseRoadbookJson(JSON.stringify({ format: FILE_FORMAT, version: 99, tracks: [] }), 'x')).toThrow(/newer version/);
  });
});

describe('bundled example / demo route', () => {
  it('is a valid roadbook from start to finish', async () => {
    const { demoTrack } = await import('./demo');
    const { waypoints } = demoTrack();
    expect(waypoints.length).toBeGreaterThan(1);
    expect(waypoints[0].arrowType).toBe('start');
    expect(waypoints[waypoints.length - 1].arrowType).toBe('finish');
  });
});

describe('GPX export', () => {
  it('writes escaped waypoints, extensions and a route', () => {
    const gpx = trackToGpx(track);
    expect(gpx).toContain('<name>Forest &lt;Loop&gt; &amp; more</name>');
    expect(gpx).toContain('<type>roundabout</type>');
    expect(gpx).toContain('<rbn:exit>3</rbn:exit>');
    expect(gpx).toContain('<rbn:danger>2</rbn:danger>');
    expect(gpx).toContain('<name>WP 2</name>');   // unlabeled waypoint
    expect(gpx.match(/<rtept /g)).toHaveLength(4);
  });

  it('writes a recorded ride as a timed track', () => {
    const gpx = rideToGpx('Ride', [
      { lat: 48, lon: 11, accuracy: 5, time: Date.UTC(2026, 9, 24, 10) },
      { lat: 48.001, lon: 11, accuracy: 5, time: Date.UTC(2026, 9, 24, 10, 1) },
    ]);
    expect(gpx.match(/<trkpt /g)).toHaveLength(2);
    expect(gpx).toContain('<time>2026-10-24T10:00:00.000Z</time>');
  });
});

describe('share links', () => {
  it('round-trips a track through the URL hash', async () => {
    const encoded = await encodeTrack(track);
    const url = buildShareUrl('https://roadbook.sfalter.de', encoded);
    const back = await decodeTrack(readShareHash(new URL(url).hash)!);

    expect(back.name).toBe(track.name);
    expect(back.waypoints).toHaveLength(4);
    expect(back.waypoints[1]).toMatchObject({ arrowType: 'roundabout', exit: 3, label: '' });
    expect(back.waypoints[2]).toMatchObject({ arrowType: 'keep-left', danger: 2, label: 'Creek' });
    expect(back.waypoints[0].lat).toBeCloseTo(48.11, 5);
  });

  it('compresses — a 100-waypoint route fits comfortably in a QR code', async () => {
    const long: Track = {
      ...track,
      waypoints: Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        lat: 48 + i * 0.001,
        lon: 11 + i * 0.0007,
        arrowType: i % 2 ? 'left' : 'right',
        label: i % 5 ? '' : `Junction ${i}`,
      })),
    };
    expect((await encodeTrack(long)).length).toBeLessThan(1800);
  });

  it('rejects damaged links', async () => {
    await expect(decodeTrack('zNOT-VALID')).rejects.toThrow(ImportError);
    await expect(decodeTrack('xabc')).rejects.toThrow(ImportError);
  });
});
