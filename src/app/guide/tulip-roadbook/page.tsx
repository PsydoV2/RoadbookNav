import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "@/components/GuideShell";
import { LAST_UPDATED, OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/guide/tulip-roadbook/";
const TITLE = "What Is a Tulip Roadbook? And How to Make a Digital One";
const DESCRIPTION =
  "How tulip roadbooks work in motorcycle rally and enduro — distances, tulip diagrams, notes — and how to build a digital roadbook you can ride fully offline.";

export const metadata: Metadata = {
  title: "What Is a Tulip Roadbook? How to Make a Digital One",
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: "article",
    siteName: SITE_NAME,
    url: PATH,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [OG_IMAGE],
  },
};

const STEPS: { name: string; text: string }[] = [
  {
    name: "Open the route editor at home",
    text: "Open roadbook.sfalter.de/app/ in a desktop or mobile browser while you still have internet — the editor loads OpenStreetMap tiles.",
  },
  {
    name: "Optionally load a GPX track",
    text: "If you already have a track, load it with the GPX button. It appears as an overlay line, and clicks close to it snap onto the line.",
  },
  {
    name: "Place a waypoint at every decision point",
    text: "Click the map at each junction, fork or turn. Pick the arrow the rider should follow there — straight, slight, normal or sharp left/right, keep left/right at a fork, a roundabout exit or U-turn — give it a short label and mark hazards with ! to !!!.",
  },
  {
    name: "Check order and positions",
    text: "Drag markers to fine-tune positions and reorder waypoints in the strip below the map. Build variants as separate tracks if you want alternatives.",
  },
  {
    name: "Send the roadbook to your phone",
    text: "Press Send to phone and scan the QR code with your phone camera — the route opens in the app and is saved there. Alternatively export the track as a JSON file and import it on the phone.",
  },
  {
    name: "Install the app on your phone",
    text: "Add Roadbook Nav to the home screen so it works offline. Use Preview to step through the roadbook once before you ride.",
  },
  {
    name: "Set the trigger radius and ride",
    text: "Choose 15, 25 or 50 m as trigger radius and start navigation. The screen shows one arrow and the distance to the next waypoint and advances automatically when you reach it.",
  },
];

export default function TulipRoadbookGuide() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${SITE_URL}${PATH}#article`,
        headline: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}${PATH}`,
        mainEntityOfPage: `${SITE_URL}${PATH}`,
        image: `${SITE_URL}${OG_IMAGE.url}`,
        inLanguage: "en",
        datePublished: LAST_UPDATED,
        dateModified: LAST_UPDATED,
        author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
        publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
        about: ["Tulip roadbook", "Rally navigation", "Motorcycle navigation"],
      },
      {
        "@type": "HowTo",
        "@id": `${SITE_URL}${PATH}#howto`,
        name: "How to make a digital tulip roadbook",
        description:
          "Plan a motorcycle roadbook on a map, export it and navigate it offline on your phone.",
        tool: [{ "@type": "HowToTool", name: "Smartphone with GPS" }],
        step: STEPS.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
          url: `${SITE_URL}${PATH}#step-${i + 1}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Tulip roadbook guide", item: `${SITE_URL}${PATH}` },
        ],
      },
    ],
  };

  return (
    <GuideShell path={PATH} crumb="Guide" schema={schema}>
      <header className="flex flex-col gap-5">
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight">
          What is a tulip roadbook? And how to make a digital one
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          A tulip roadbook is a list of instructions for navigating a route
          without a map: at each decision point it tells you how far to ride
          and which way to go. It is the standard navigation format in rally
          raid, enduro and adventure riding.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Where the name comes from</h2>
        <p className="text-gray-400 leading-relaxed">
          The style of diagram is named after the Dutch Tulip Rally
          (Tulpenrallye), where it became popular in the 1950s. Instead of a
          map, each instruction is a small drawing of the junction: a dot
          marks where you arrive, a line with an arrowhead shows the road you
          leave on. Drawn from above, the shape loosely resembles a tulip.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">What one roadbook entry contains</h2>
        <p className="text-gray-400 leading-relaxed">
          Paper roadbooks are printed as a roll or booklet of rows. Each row
          is one decision point and usually has three columns:
        </p>
        <dl className="flex flex-col gap-4 text-sm">
          {[
            [
              "Distance",
              "The total distance from the start, often with the partial distance since the previous entry. Riders compare it with a trip meter on the handlebars.",
            ],
            [
              "Tulip diagram",
              "The junction seen from above, with the dot where you arrive and the arrow showing which exit to take.",
            ],
            [
              "Notes",
              "Extra information: compass heading, landmarks, surface, and danger markings for hazards such as holes, drops or crests.",
            ],
          ].map(([term, desc]) => (
            <div key={term} className="flex flex-col gap-1 border-l border-white/15 pl-4">
              <dt className="text-white font-semibold">{term}</dt>
              <dd className="text-gray-400 leading-relaxed">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Paper roadbook vs. digital roadbook</h2>
        <p className="text-gray-400 leading-relaxed">
          A paper roadbook needs a holder on the handlebars and a trip meter
          you correct by hand whenever your distance drifts from the book. A
          digital roadbook uses the phone&apos;s GPS instead: it knows where
          the next waypoint is, counts down the distance live and moves to the
          next instruction on its own. No scrolling, no recalibrating.
        </p>
        <p className="text-gray-400 leading-relaxed">
          Roadbook Nav reduces each entry to what you can read at a glance on
          a bumpy trail — one large direction arrow and one distance. It works
          without mobile signal, because the route is stored on the phone and
          the distance is calculated from GPS coordinates alone.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-black">How to make a digital roadbook in 7 steps</h2>
        <ol className="flex flex-col gap-6">
          {STEPS.map((s, i) => (
            <li key={s.name} id={`step-${i + 1}`} className="flex gap-4">
              <span className="text-gray-500 font-mono text-sm pt-1 w-6 flex-shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold">{s.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Tips for a roadbook that is easy to ride</h2>
        <ul className="flex flex-col gap-3 text-gray-400 text-sm leading-relaxed">
          {[
            "Only add a waypoint where a decision is needed. Too many entries means too much looking down.",
            "Put the waypoint slightly into the exit you want, not in the middle of the junction, so the arrow points the right way when it triggers.",
            "Use a tighter trigger radius (15 m) on slow, twisty trails with close junctions, and a wider one (50 m) on fast tracks or where GPS is weak under dense trees.",
            "Keep labels short: a landmark or warning you can read in under a second.",
            "Install the app and import the route before you leave home. Offline mode only works once it is on the home screen.",
          ].map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="text-gray-700 select-none flex-shrink-0">—</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-5 border-t border-white/10 pt-10">
        <h2 className="text-2xl font-black">Build your first roadbook</h2>
        <p className="text-gray-400 leading-relaxed">
          The editor runs in the browser. You don&apos;t need an account or an
          install to plan a route.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/"
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-colors"
          >
            Open the editor →
          </Link>
          <Link
            href="/#how-it-works"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            How Roadbook Nav works
          </Link>
        </div>
      </section>
    </GuideShell>
  );
}
