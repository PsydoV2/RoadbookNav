# Roadbook Nav

A bare-minimum motorcycle navigation display that runs entirely offline after setup. Plan waypoints on a map at home, scan a QR code with your phone, and ride — no cell signal required.

Built for trail riding and motorcycle rallies where paper tulip cards are still a thing.

---

## What it does

**Editor mode** — an interactive map where you click to place sequential waypoints, assign a symbol to each (straight, slight/normal/sharp left or right, keep left/right at a fork, roundabout with exit number, U-turn, start, finish), optionally label them and mark hazards with `!` / `!!` / `!!!`. Multiple tracks can be open simultaneously.

- **Send to phone** — the route is compressed into a link (`/app/#r=…`) and shown as a QR code. Scanning it on the phone opens and saves the route; nothing is uploaded.
- **Files** — import Roadbook Nav JSON or GPX (track as snap-to overlay, plus roadbook waypoints from our own GPX export); export JSON, GPX, or all tracks at once.
- **Preview** — step through the roadbook without GPS to check every instruction.

**Navigation mode** — a full-screen display showing one thing at a time: a large symbol and a live distance countdown to the next waypoint. When you enter the trigger radius the display advances automatically, the phone vibrates, and a beep plays. The screen stays on via the WakeLock API.

```
┌──────────────────────┐
│  ✕  •        3/7  ≡  │
│                      │
│    ╭──────────╮ !!   │
│    │    →     │      │
│    ╰──────────╯      │
│                      │
│       1.8 km         │
│    → Forest Fork     │
│ [−] 12.34 km [+]  ↗  │
│ [← Prev] [Hold skip] │
└──────────────────────┘
```

- **Trip meter** from GPS (jitter-filtered), with ±10 m correction and reset, next to the planned route distance.
- **Approach warning** about 9 s before each waypoint, based on speed; hazard waypoints get a distinct triple beep.
- **Resume** — progress, trip meter and recorded track are saved while riding; restarting the route offers to continue.
- **Ride as GPX** — download the track you actually rode.
- **Sunlight mode**, landscape layout, large glove-friendly buttons, hold-to-skip, hold-to-exit.
- GPS warnings only after 15 s without a fix, with readable messages.

A settings panel toggles counter, label, trip meter, next-waypoint preview, compass, sunlight mode, audio and vibration. The auto-advance trigger radius is adjustable: 15 m, 25 m, or 50 m.

---

## How it works technically

- **Distance** is computed with the Haversine formula in plain JavaScript (straight-line). No map API, no geocoding.
- **GPS** comes from one `navigator.geolocation.watchPosition` subscription per ride with `enableHighAccuracy: true`.
- **Route data** lives entirely in `localStorage`. Nothing is sent anywhere. Share links carry the route in the URL hash, which never reaches a server.
- **Audio** uses one shared `AudioContext` that is unlocked inside the tap that starts navigation, so the first beep isn't swallowed by mobile autoplay rules.
- **Offline** works because the navigation mode makes zero network requests. The editor needs internet for OpenStreetMap tiles — use it at home.
- **Analytics** — a few anonymous [Umami](https://umami.is) events (`navigation-started`, `route-completed`, `share-opened`, …) via `src/lib/analytics.ts`; no-ops when blocked.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, static export) |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet 1.9 + react-leaflet v5 (editor only) |
| Runtime | React 19 |
| PWA | @ducanh2912/next-pwa (Workbox) |
| QR codes | qrcode |
| Tests | Vitest |
| Output | Static HTML/CSS/JS — no server needed |

---

## Local development

```bash
npm install
npm run dev
npm test        # unit tests for geo, navigation logic, file formats and share links
```

Use **Preview** in the editor to step through waypoints without riding anywhere.

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
│   ├── layout.tsx              # Global metadata, favicon, PWA config, Umami script
│   ├── page.tsx                # Landing page
│   ├── app/page.tsx            # App shell — editor ↔ navigation, resume prompt, share-link import
│   └── guide/*/page.tsx        # SEO guides (tulip roadbook, planning, phone setup)
├── components/
│   ├── MapEditor.tsx           # Route planner (multi-track, import/export, share)
│   ├── editor/                 # Editor parts: map helpers, waypoint modal, strip, dialogs, share dialog
│   ├── MotorbikeUi.tsx         # Navigation display (GPS, trip meter, resume, preview)
│   ├── NavSettingsPanel.tsx    # Bottom sheet: display, audio, trigger radius, trip
│   ├── ArrowGlyph.tsx          # Shared waypoint symbols + hazard badge
│   ├── HoldButton.tsx          # Press-and-hold buttons (exit, skip, reset)
│   ├── GuideShell.tsx          # Shared frame for guide pages
│   ├── InstallPwa.tsx          # Platform-aware PWA install prompt
│   └── ServiceWorkerRegistration.tsx
├── lib/
│   ├── geo.ts                  # Haversine, bearing, formatting
│   ├── navLogic.ts             # Crossing/overshoot, approach distance, trip meter filter
│   ├── navProgress.ts          # Saved ride progress per track
│   ├── roadbookFile.ts         # Versioned JSON + GPX import/export
│   ├── share.ts                # Route ↔ compressed URL hash
│   ├── tracks.ts               # Track helpers, demo route
│   ├── audio.ts                # Shared AudioContext + beeps
│   ├── analytics.ts            # Umami event wrapper
│   └── site.ts                 # SEO constants, FAQ, guide list
└── types/
    └── navigation.ts           # Waypoint/Track types + shared constants
public/
├── arrows/                     # SVG direction icons
└── examples/forest-loop.json   # Example route (/app/?example=forest-loop)
```

---

## Data format

Routes are exported as versioned JSON:

```json
{
  "format": "roadbook-nav",
  "version": 1,
  "exportedAt": "2026-10-24T10:00:00.000Z",
  "tracks": [
    {
      "name": "Stage 1",
      "color": "#ef4444",
      "waypoints": [
        { "id": "...", "lat": 48.137, "lon": 11.576, "arrowType": "keep-right", "label": "Forest Fork" },
        { "id": "...", "lat": 48.140, "lon": 11.580, "arrowType": "roundabout", "label": "", "exit": 2 },
        { "id": "...", "lat": 48.142, "lon": 11.589, "arrowType": "finish", "label": "", "danger": 1 }
      ]
    }
  ]
}
```

`danger` (1–3) and `exit` (1–6, roundabouts only) are optional. Import also accepts the older formats — a bare `Waypoint[]` (single track) and a bare `Track[]` (all tracks) — and assigns fresh ids on import. Files from a newer app version are rejected with a message instead of being misread.

GPX export writes every waypoint as `<wpt>` (with `<type>` = arrow type and `rbn:danger` / `rbn:exit` extensions) plus a `<rte>`, so other tools can read it and Roadbook Nav can import it back losslessly.

---

## Arrow types

| Value | Direction |
|---|---|
| `start` | Starting point |
| `straight` | Straight ahead |
| `slight-left` | Bear left |
| `left` | Turn left |
| `sharp-left` | Sharp left |
| `slight-right` | Bear right |
| `right` | Turn right |
| `sharp-right` | Sharp right |
| `keep-left` | Keep left at a fork |
| `keep-right` | Keep right at a fork |
| `roundabout` | Roundabout (optional `exit` number) |
| `u-turn` | U-turn |
| `finish` | Destination |
