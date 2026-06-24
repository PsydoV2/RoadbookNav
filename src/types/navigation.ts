export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  arrowType: 'start' | 'straight' | 'slight-left' | 'left' | 'sharp-left' | 'slight-right' | 'right' | 'sharp-right' | 'u-turn' | 'finish';
  label: string;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  waypoints: Waypoint[];
}

export type TriggerRadius = 15 | 25 | 50;

export interface NavSettings {
  showCounter: boolean;
  showLabel: boolean;
  showOdometer: boolean;
  showNextPreview: boolean;
  showCompass: boolean;
  audioApproach: boolean;
  audioCrossed: boolean;
  vibration: boolean;
  triggerRadius: TriggerRadius;
}

export const DEFAULT_NAV_SETTINGS: NavSettings = {
  showCounter: true,
  showLabel: true,
  showOdometer: true,
  showNextPreview: true,
  showCompass: false,   // off by default — keeps the glance-screen minimal
  audioApproach: true,
  audioCrossed: true,
  vibration: true,
  triggerRadius: 25,
};

export const ARROW_TYPES: Waypoint['arrowType'][] = [
  'start',        'finish',
  'straight',     'u-turn',
  'slight-left',  'slight-right',
  'left',         'right',
  'sharp-left',   'sharp-right',
];

export const ARROW_FILE: Partial<Record<Waypoint['arrowType'], string>> = {
  straight:       '/arrows/arrow-up-sm-svgrepo-com.svg',
  'slight-left':  '/arrows/arrow-up-left-sm-svgrepo-com.svg',
  left:           '/arrows/arrow-left-sm-svgrepo-com.svg',
  'sharp-left':   '/arrows/arrow-down-left-sm-svgrepo-com.svg',
  'slight-right': '/arrows/arrow-up-right-sm-svgrepo-com.svg',
  right:          '/arrows/arrow-right-sm-svgrepo-com.svg',
  'sharp-right':  '/arrows/arrow-down-right-sm-svgrepo-com.svg',
  'u-turn':       '/arrows/arrow-down-sm-svgrepo-com.svg',
};

export const APPROACH_DISTANCE_M = 150;
