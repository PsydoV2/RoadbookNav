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
  audioApproach: true,
  audioCrossed: true,
  vibration: true,
  triggerRadius: 25,
};
