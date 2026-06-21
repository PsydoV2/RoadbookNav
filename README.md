# Roadbook Nav

A bare-minimum motorcycle navigation display that runs entirely offline after setup. Plan waypoints on a map at home, export a JSON file, import it on your phone, and ride — no cell signal required.

Built for trail riding and motorcycle rallies where paper tulip cards are still a thing.

---

## What it does

**Editor mode** — an interactive map where you click to place sequential waypoints, assign a direction arrow to each (straight, left, right, U-turn, etc.), and optionally label them. Multiple tracks can be open simultaneously. Export any track as a `.json` file.

**Navigation mode** — a full-screen display showing one thing at a time: a large directional arrow and a live distance countdown to the next waypoint. At 25 m, the display advances automatically and the phone vibrates. The screen stays on via the WakeLock API.

```
┌──────────────────────┐
│  ✕              3/7  │
│                      │
│    ╭──────────╮      │
│    │    →     │      │
│    ╰──────────╯      │
│                      │
│       1.8 km         │
│    → Forest Fork     │
└──────────────────────┘
```

---

## How it works technically

- **Distance** is computed with the Haversine formula in plain JavaScript. No map API, no geocoding.
- **GPS** comes from the browser's `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
- **Route data** lives entirely in `localStorage`. Nothing is sent anywhere.
- **Offline** works because the navigation mode makes zero network requests after the JSON is imported. The editor needs internet for OpenStreetMap tiles — use it at home.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, static export) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet 1.9 + react-leaflet (editor only) |
| Runtime | React 19 |
| Output | Static HTML/CSS/JS — no server needed |

---

## Local development

```bash
npm install
npm run dev
```

The dev build includes debug buttons in the navigation UI to step through waypoints manually without riding anywhere.

## Production build

```bash
npm run build
```

Outputs to `./out` — a fully static site. Drop it on any static host (Nginx, GitHub Pages, Vercel, Netlify, a USB stick).

---

## Deploying

Since the output is plain static files, deployment is straightforward:

**GitHub Pages / Netlify / Vercel** — point at the repo, set build command to `npm run build`, output directory to `out`.

**Self-hosted** — copy `./out` to any web server. No Node.js, no backend.

**Local file** — `npx serve out` or open `out/index.html` directly (note: GPS requires HTTPS in most browsers, so a local server is needed for navigation mode).

> The navigation mode requires HTTPS to access `navigator.geolocation` and the WakeLock API. The map editor works on HTTP.

---

## Installing as a PWA

For full offline capability the app needs to be installed to the home screen. The landing page detects your platform and shows the right instructions.

- **Android / Chrome** — tap the install button on the landing page
- **iOS Safari** — Share → Add to Home Screen
- **Desktop Chrome** — address bar install icon or browser menu

---

## File structure

```
src/
├── app/
│   ├── layout.tsx          # Global metadata, favicon, PWA config
│   ├── globals.css         # Tailwind import + overscroll reset
│   ├── page.tsx            # Landing page with phone mockup
│   ├── manifest.json       # PWA manifest
│   └── app/
│       └── page.tsx        # App shell — switches editor ↔ navigation
├── components/
│   ├── MapEditor.tsx       # Leaflet-based route planner (multi-track)
│   ├── MotorbikeUi.tsx     # Navigation display (Haversine, GPS, WakeLock)
│   └── InstallPwa.tsx      # Platform-aware PWA install prompt
└── types/
    └── navigation.ts       # Waypoint and Track interfaces
public/
└── arrows/                 # SVG direction icons used in both editor and nav
```

---

## Data format

Routes are stored and exported as plain JSON.

**Single track export** (compatible with older imports):
```json
[
  { "id": "...", "lat": 48.137, "lon": 11.576, "arrowType": "right", "label": "Forest Fork" },
  { "id": "...", "lat": 48.142, "lon": 11.589, "arrowType": "finish", "label": "" }
]
```

**Multi-track export** (full project backup):
```json
[
  {
    "id": "...",
    "name": "Stage 1",
    "color": "#ef4444",
    "waypoints": [ ... ]
  }
]
```

Import auto-detects the format. A `Waypoint[]` import creates a new track; a `Track[]` import adds all tracks to the current session.

---

## Arrow types

| Value | Direction |
|---|---|
| `start` | Starting point |
| `straight` | Straight ahead |
| `left` | Turn left |
| `right` | Turn right |
| `slight-left` | Bear left |
| `slight-right` | Bear right |
| `u-turn` | U-turn |
| `finish` | Destination |
