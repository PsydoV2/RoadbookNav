export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  arrowType: 'start' | 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'finish';
  label: string;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  waypoints: Waypoint[];
}

export interface NavSettings {
  showCounter: boolean;      // "3 / 7"
  showLabel: boolean;        // waypoint label below distance
  showOdometer: boolean;     // cumulative km along route
  showNextPreview: boolean;  // next waypoint arrow + distance
  audioApproach: boolean;    // beep at 150 m
  audioCrossed: boolean;     // double-beep when waypoint crossed
}

export const DEFAULT_NAV_SETTINGS: NavSettings = {
  showCounter: true,
  showLabel: true,
  showOdometer: true,
  showNextPreview: true,
  audioApproach: true,
  audioCrossed: true,
};
