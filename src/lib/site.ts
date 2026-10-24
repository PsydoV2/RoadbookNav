// Single source of truth for site-wide SEO values. No trailing slash on SITE_URL.
export const SITE_URL = "https://roadbook.sfalter.de";
export const SITE_NAME = "Roadbook Nav";

// Bump when page content changes — feeds sitemap lastmod and schema dateModified.
export const LAST_UPDATED = "2026-10-24";

export const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Roadbook Nav — the paper tulip card, digitised: a phone showing one direction arrow and a 1.7 km distance countdown",
};

// Feeds the sitemap, the guide footer links and the landing page
export const GUIDES: { path: string; title: string }[] = [
  { path: "/guide/tulip-roadbook/", title: "What is a tulip roadbook, and how to make a digital one" },
  { path: "/guide/plan-enduro-roadbook/", title: "How to plan a roadbook for an enduro or trail ride" },
  { path: "/guide/phone-as-roadbook/", title: "Using your phone as a roadbook device: mount, power, settings" },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "How does motorcycle navigation work without internet in a forest?",
    a: "You plan the route at home with a regular internet connection (the map editor needs map tiles) and export it as a JSON file. On your bike, import it into the app — from that point the only thing running is your phone's GPS receiver and a distance formula (Haversine). No pings, no map tiles, no fallback API.",
  },
  {
    q: "What is a digital roadbook?",
    a: "A digital roadbook is the paper tulip roadbook strapped to rally handlebars, digitised. Each entry shows one instruction — a direction and a distance. Roadbook Nav does the same on a phone screen, advances automatically as you reach each waypoint, and keeps it to the minimum: one arrow, one number.",
  },
  {
    q: "Does it work as a PWA / installable app?",
    a: "Yes. Add it to your home screen from your mobile browser. The navigation mode then runs entirely offline. The map editor requires internet to load OpenStreetMap tiles, so use it at home before you leave.",
  },
  {
    q: "Does Roadbook Nav work on iPhone?",
    a: "Yes. Open it in Safari and choose Share → Add to Home Screen to install it. Navigation, the distance countdown and audio cues work on iOS; vibration does not, because Safari on iOS does not support the Vibration API.",
  },
  {
    q: "Can I import a GPX track?",
    a: "Yes. In the editor you can load a GPX file as an overlay line on the map. Clicks close to that line snap onto it, so you can place your roadbook waypoints exactly along an existing track. Navigation itself always runs on your waypoints, not on the raw GPX. You can also export a roadbook as GPX, and download the track you actually rode as GPX after the ride.",
  },
  {
    q: "How close do I need to get to a waypoint?",
    a: "The display advances when you enter the trigger radius around a waypoint. It is 25 m by default and can be set to 15 m or 50 m in the navigation settings — tighter for slow technical trails, wider for fast tracks or poor GPS reception.",
  },
  {
    q: "How do I get a route from my computer to my phone?",
    a: "Plan the route on your computer and press \"Send to phone\". Scan the QR code with your phone camera, and the route opens in Roadbook Nav on the phone and is saved there. The whole route is inside the link itself, so nothing is uploaded to a server. You can also copy the link, use your phone's share menu, or move the exported JSON file by hand.",
  },
  {
    q: "Is there a trip meter like on a rally bike?",
    a: "Yes. The trip meter adds up the distance you actually ride from GPS, and ignores jitter while you stand still. You can correct it in 10 m steps with the − and + buttons and reset it in the settings. Next to it you see the planned route distance to the current waypoint, so you can compare the two like with a paper roadbook.",
  },
  {
    q: "What happens if my phone turns off or I close the app mid-ride?",
    a: "Your progress is saved on the device as you ride. When you start navigation on the same route again, Roadbook Nav asks whether to resume at the waypoint where you stopped, with the same trip meter and recorded track.",
  },
  {
    q: "Is it free, and do I need an account?",
    a: "It is free and needs no account or sign-up. Routes are stored in your browser's localStorage and in the JSON files you export — nothing is sent to a server, and your location never leaves your device.",
  },
];
