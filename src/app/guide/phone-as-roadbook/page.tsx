import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "@/components/GuideShell";
import { LAST_UPDATED, OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/guide/phone-as-roadbook/";
const TITLE = "Using Your Phone as a Motorcycle Roadbook Device";
const DESCRIPTION =
  "How to set up a smartphone as an offline roadbook on a motorcycle: mounting, power, offline install, screen settings for sun and gloves, and what to check before you ride.";

export const metadata: Metadata = {
  title: "Phone as a Motorcycle Roadbook: Mount, Power, Settings",
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

const CHECKLIST = [
  "Roadbook Nav is installed on the home screen (that is what makes it work offline).",
  "The route is on the phone: scanned from the QR code or imported as a file.",
  "Location permission is allowed for the app — start navigation once at home to check.",
  "You stepped through the roadbook with Preview at least once.",
  "Volume is up, or you use a headset — the beeps are your early warning.",
  "The phone is charging from the bike, and the trip meter is reset.",
];

export default function PhoneAsRoadbookGuide() {
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
        about: ["Motorcycle phone mount", "Offline navigation", "Digital roadbook"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Phone as roadbook", item: `${SITE_URL}${PATH}` },
        ],
      },
    ],
  };

  return (
    <GuideShell path={PATH} crumb="Guide" schema={schema}>
      <header className="flex flex-col gap-5">
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight">
          Using your phone as a motorcycle roadbook device
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          A dedicated rally computer costs hundreds. The phone in your pocket
          already has GPS, a bright screen and a speaker. With the right mount,
          power and settings it makes a good offline roadbook for trail rides,
          enduro and training.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Mount: stable and damped</h2>
        <ul className="flex flex-col gap-3 text-gray-400 text-sm leading-relaxed">
          {[
            "Mount the phone where you can see it with a short glance down, ideally on the handlebar clamp or a roadbook tower — not on the tank.",
            "Use a mount with a vibration damper. Phone makers warn that strong, high-frequency vibration — typical for single-cylinder and high-power engines — can damage the image stabilisation of phone cameras.",
            "Choose landscape or portrait as you like: the navigation screen adapts. Landscape puts the arrow and the distance side by side, which suits wide handlebar mounts.",
            "Check that you can reach the bottom buttons with gloves. They are large on purpose.",
          ].map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="text-gray-700 select-none flex-shrink-0">—</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Power and heat</h2>
        <p className="text-gray-400 leading-relaxed">
          Roadbook Nav keeps the screen on for the whole ride and asks for a
          GPS position every second, so expect the battery to drain faster than
          usual. On rides longer than an hour or two, charge from the bike via
          USB. In strong sun, a phone that is charging and showing a bright
          screen can get hot and dim the display — a mount with a sun visor or
          some airflow helps.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Install it so it works offline</h2>
        <p className="text-gray-400 leading-relaxed">
          Open the site on the phone and add it to the home screen (Android:
          browser menu → Install app; iPhone: Safari → Share → Add to Home
          Screen). Only the installed app is guaranteed to start without a
          signal. Then get your route onto the phone: plan on your computer,
          press <em>Send to phone</em> and scan the QR code with the phone
          camera.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Settings that matter on the bike</h2>
        <dl className="flex flex-col gap-4 text-sm">
          {[
            ["Sunlight mode", "Switches to black on white. In direct sun this is usually easier to read than the dark default."],
            ["Trigger radius", "15 m for slow, tight trails with close junctions; 25 m for most rides; 50 m for fast tracks or under dense trees where GPS is less accurate."],
            ["Approach beep", "Sounds about nine seconds before each waypoint, based on your speed. Hazard waypoints get a different, triple beep."],
            ["Trip meter", "Counts the distance you really ride. Correct it with − / + in 10 m steps; reset it in the settings by holding the button."],
            ["Hold to skip", "Skipping a waypoint needs a short hold, so a bump or a glove can't skip one by accident. Prev is a normal tap."],
          ].map(([term, desc]) => (
            <div key={term} className="flex flex-col gap-1 border-l border-white/15 pl-4">
              <dt className="text-white font-semibold">{term}</dt>
              <dd className="text-gray-400 leading-relaxed">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">GPS tips</h2>
        <ul className="flex flex-col gap-3 text-gray-400 text-sm leading-relaxed">
          {[
            "Start navigation under open sky and wait a few seconds for the dot in the top bar to turn green (accuracy better than 10 m) or yellow (better than 30 m).",
            "Short signal gaps under trees or in tunnels are normal. The warning only appears after about 15 seconds without a position.",
            "If the phone switches off or the app is closed, start navigation again: it offers to resume at the same waypoint with the same trip meter.",
            "After the ride you can download the track you actually rode as GPX from the finish screen or the settings.",
          ].map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="text-gray-700 select-none flex-shrink-0">—</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Checklist before you ride</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex gap-3 text-gray-300">
              <span className="text-gray-600 select-none flex-shrink-0">☐</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-5 border-t border-white/10 pt-10">
        <h2 className="text-2xl font-black">Set it up now</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/#install"
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-colors"
          >
            Install on this device →
          </Link>
          <Link
            href="/app/"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            Open the editor
          </Link>
        </div>
      </section>
    </GuideShell>
  );
}
