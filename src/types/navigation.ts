export type ArrowType =
  | 'start' | 'finish'
  | 'straight' | 'u-turn'
  | 'slight-left' | 'slight-right'
  | 'left' | 'right'
  | 'sharp-left' | 'sharp-right'
  | 'keep-left' | 'keep-right'
  | 'roundabout';

export type DangerLevel = 1 | 2 | 3;

export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  arrowType: ArrowType;
  label: string;
  danger?: DangerLevel;   // tulip-style hazard marking: ! / !! / !!!
  exit?: number;          // roundabout exit to take (1-based)
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
  sunlightMode: boolean;
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
  sunlightMode: false,
  triggerRadius: 25,
};

export const ARROW_TYPES: ArrowType[] = [
  'start',        'finish',
  'straight',     'u-turn',
  'slight-left',  'slight-right',
  'left',         'right',
  'sharp-left',   'sharp-right',
  'keep-left',    'keep-right',
  'roundabout',
];

export const ARROW_LABELS: Record<ArrowType, string> = {
  start:          'Start',
  finish:         'Finish',
  straight:       'Straight',
  'u-turn':       'U-turn',
  'slight-left':  'Bear left',
  'slight-right': 'Bear right',
  left:           'Left',
  right:          'Right',
  'sharp-left':   'Sharp left',
  'sharp-right':  'Sharp right',
  'keep-left':    'Keep left (fork)',
  'keep-right':   'Keep right (fork)',
  roundabout:     'Roundabout',
};

export const ARROW_FILE: Partial<Record<ArrowType, string>> = {
  straight:       '/arrows/arrow-up-sm-svgrepo-com.svg',
  'slight-left':  '/arrows/arrow-up-left-sm-svgrepo-com.svg',
  left:           '/arrows/arrow-left-sm-svgrepo-com.svg',
  'sharp-left':   '/arrows/arrow-down-left-sm-svgrepo-com.svg',
  'slight-right': '/arrows/arrow-up-right-sm-svgrepo-com.svg',
  right:          '/arrows/arrow-right-sm-svgrepo-com.svg',
  'sharp-right':  '/arrows/arrow-down-right-sm-svgrepo-com.svg',
  'u-turn':       '/arrows/arrow-down-sm-svgrepo-com.svg',
};

export const DANGER_LEVELS: DangerLevel[] = [1, 2, 3];

export const MAX_ROUNDABOUT_EXIT = 6;
