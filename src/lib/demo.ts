// The demo route is the same file the landing page offers as an example,
// bundled so "Load a demo route" works offline and instantly.

import example from '../../public/examples/forest-loop.json';
import { parseRoadbookJson, type ImportedTrack } from './roadbookFile';

export function demoTrack(): ImportedTrack {
  // Parsing gives fresh waypoint ids, so loading the demo twice never collides
  const [track] = parseRoadbookJson(JSON.stringify(example), 'Demo Route');
  return track;
}
