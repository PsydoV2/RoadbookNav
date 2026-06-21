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
