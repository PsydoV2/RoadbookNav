## 🏍️ STATIC-EXPORT AI DEVELOPER PROMPT & SPECIFICATION## 1. CONTEXT & PROJECT GOAL

We are building a highly focused, offline-first Progressive Web App (PWA) called "Minimalist Roadbook Nav".
The application will be built as a fully static HTML export (using Next.js static HTML export) to be hosted completely serverless or locally.
The purpose is motorcycle navigation in remote areas without an internet connection. The application has two main interfaces:

1.  Editor Mode: A map-based route planner where users click to place sequential coordinates, assign custom text instructions, and define a turn arrow.
2.  Navigation Mode: A high-contrast, distraction-free "Roadbook" view mimicking the provided reference image. It displays only a massive arrow and a live distance countdown. It shifts automatically to the next waypoint when the user enters a 25-meter radius around the current coordinate.

---

## 2. TECH STACK & CONFIGURATION (STATIC EXPORT MODE)

- Framework: Next.js 16.2.9 (App Router, strict TypeScript)
- Runtime & Compiler: React 19.2 + Stable Turbopack
- Styling: Tailwind CSS v4 (Mobile-First, OLED-optimized Black palette)
- Map Library: Leaflet 1.9.4 & react-leaflet (Client-side only)
- State & Sync: React Local State + continuous persistence to localStorage

## 🔧 Strict Static Export Configuration (next.config.ts)

Your configuration must enforce static generation so that npm run build outputs plain HTML/CSS/JS assets inside the ./out directory.

import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
output: 'export', // Enforces full static HTML export
trailingSlash: true, // Ensures clean folder structures for static servers
reactStrictMode: true,
};
export default nextConfig;

---

## 3. FILE TREE ARCHITECTURE

You must generate the project matching exactly this folder structure:

.
├── src/
│ ├── app/
│ │ ├── layout.tsx # Global layout & SEO metadata
│ │ ├── page.tsx # Static SEO/AEO Landingpage
│ │ ├── app/
│ │ │ └── page.tsx # Main Application Switcher (Client Component)
│ │ └── manifest.json # PWA Configuration file
│ ├── components/
│ │ ├── MapEditor.tsx # Interactive Route Planner (Client Component)
│ │ └── MotorbikeUi.tsx # Screen-Optimized Roadbook UI (Client Component)
│ └── types/
│ └── navigation.ts # TypeScript interfaces

---

## 4. DETAILED COMPONENT SPECIFICATIONS## 📄 src/types/navigation.ts

export interface Waypoint {
id: string;
lat: number;
lon: number;
arrowType: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'finish';
label: string;
}

## 📄 src/app/page.tsx (SEO & AEO Static Landing Page)

- Visuals: Modern, minimal marketing page detailing the app’s purpose.
- SEO Elements: Standardized static metadata exports. Title: "Minimalistisches Motorrad Roadbook | Offline GPS Pfeil-Navi". Meta-Description: Motorrad Roadbook App, Minimalistisches Motorrad Navi, Offline GPS Navigation Wald.
- AEO Optimization: Since Next.js generates real HTML during export, include an explicit inline FAQ section utilizing Structured Data (JSON-LD) inside a <script> tag to answer: "Wie funktioniert Motorrad-Navigation ohne Internet im Wald?" and "Was ist ein digitales Roadbook?".
- Action Link: A prominent action button routing directly to /app/ (with a trailing slash due to the static export routing rules).

## 📄 src/app/app/page.tsx (App Container)

- Must be a Client Component ("use client";).
- Reads the initial active_route state from localStorage on mount.
- Renders MapEditor if state isNavigating === false.
- Renders MotorbikeUi if state isNavigating === true.
- SSR Hydration Guard: Dynamic import with ssr: false must be enforced for MapEditor to prevent Leaflet window reference exceptions during Next.js 16 build-time pre-rendering.

## 📄 src/components/MotorbikeUi.tsx (The Reference UI)

This component must strictly mimic the user-provided screenshot asset:

- Style Rules: Dark mode locked (bg-black). Layout matches w-screen h-screen flex flex-col justify-between items-center py-12 select-none.
- Top Bar: A clean, sleek exit trigger (✕) located on the top left.
- Center Canvas: A perfect dark grey circle (bg-[#151515] w-72 h-72 rounded-full) embedding a crisp, white vector SVG arrow. The SVG must dynamically transition or rotate matching the current arrowType.
- Bottom Bar: Heavy text sizing mapping the distance countdown (X.XX km left or XXX m left) and destination label beneath (to [Waypoint Label]) in a secondary low-brightness color (text-gray-400).
- Core APIs to write:

1. Haversine Formula: Mathematical distance check computed entirely client-side using JavaScript (No Map-APIs or internet lookups allowed). 2. Geolocation Watch API: High accuracy parameters activated (enableHighAccuracy: true, maximumAge: 0) to dynamically update distance metrics. 3. Auto-Advancement Logic: Trigger an active step increment (currentIndex++) when the computed distance to the current coordinate drops below 25 meters. 4. Haptic Engine: Invoke navigator.vibrate(400) upon every successfully crossed checkpoint. 5. Screen Lock: Use the browser's navigator.wakeLock.request('screen') API to keep the smartphone screen illuminated continuously without sleeping or dimming.

## 📄 src/components/MapEditor.tsx (The Route Generator)

- Uses react-leaflet to display an interactive canvas map.
- Listens for click events on the map view. When clicked, it renders a custom HTML modal or popup requiring a text label input field and a radio/button-matrix to choose the arrowType.
- Renders custom markers for every created coordinate and links them chronologically with an explicit red L.polyline.
- Includes a utility menu containing:
- Export Action: Bundles the state array into a single .json file string and triggers a local browser asset download.
  - Import Action: Handles an uploaded .json configuration file, validates the array layout structure, and loads it into the state/localStorage.

---

## 5. RECONCILIATION & QUALITY CONTROL CRITERIA FOR STATIC EXPORTS

Before finishing the generation loop, verify these strict static-hosting rules:

1.  No Next.js Node Features: Do not use dynamic server functions (headers(), cookies(), or dynamic Route Handlers). Everything must run strictly in-browser.
2.  0% Data Footprint: Once the route file is imported, the entire navigation process must run with airplane-mode active (no data pings, no map tile fetches).
3.  Tailwind Design Compliance: Colors must strictly focus on high-readability (#000000, #ffffff, #151515, and clear typography scaling). No colorful clutter on the motorcycle screen dashboard.
