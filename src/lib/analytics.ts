// Thin wrapper around the self-hosted Umami script loaded in the root layout.
// No-ops when the script is blocked or offline — analytics must never break the app.

type UmamiData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiData) => void };
  }
}

export type AnalyticsEvent =
  | 'demo-loaded'
  | 'example-imported'
  | 'export-json'
  | 'export-gpx'
  | 'import-json'
  | 'import-gpx'
  | 'share-opened'
  | 'share-link-copied'
  | 'share-native'
  | 'shared-route-imported'
  | 'navigation-started'
  | 'route-completed'
  | 'ride-gpx-downloaded';

export function trackEvent(event: AnalyticsEvent, data?: UmamiData) {
  try {
    window.umami?.track(event, data);
  } catch {
    // ignore
  }
}
