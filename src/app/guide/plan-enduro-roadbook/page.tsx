import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "@/components/GuideShell";
import { LAST_UPDATED, OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/guide/plan-enduro-roadbook/";
const TITLE = "How to Plan a Roadbook for an Enduro or Trail Ride";
const DESCRIPTION =
  "Where to put waypoints, which symbol to use at forks and roundabouts, how to mark hazards and how to check the roadbook before you ride — a practical guide for enduro and trail riders.";

export const metadata: Metadata = {
  title: TITLE,
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
    name: "Start from a track",
    text: "Load the GPX of your planned ride in the editor (Files → Import). It appears as an orange line, and waypoints you click near it snap onto it.",
  },
  {
    name: "Mark only the decisions",
    text: "Walk the line from start to finish and add a waypoint wherever the rider has to choose: junctions, forks, roundabouts, places where the main track bends off.",
  },
  {
    name: "Pick the symbol the rider will see",
    text: "Use left/right for real turns, keep left/right where a track forks into two similar branches, and the roundabout symbol with the exit number for roundabouts.",
  },
  {
    name: "Mark hazards",
    text: "Add ! / !! / !!! to waypoints just before holes, drops, crests, fords or loose descents. The rider gets a different warning sound before them.",
  },
  {
    name: "Preview the roadbook",
    text: "Press Preview and step through every waypoint. Check that each arrow makes sense when you only see the arrow, not the map.",
  },
  {
    name: "Send it to the phone",
    text: "Press Send to phone, scan the QR code, and start navigation once on the phone at home to check GPS and sound.",
  },
];

export default function PlanEnduroRoadbookGuide() {
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
        about: ["Enduro navigation", "Roadbook planning", "Trail riding"],
      },
      {
        "@type": "HowTo",
        "@id": `${SITE_URL}${PATH}#howto`,
        name: "How to plan an enduro roadbook",
        description: "Turn a GPX track into a roadbook with one instruction per decision point.",
        tool: [{ "@type": "HowToTool", name: "GPX track of the planned ride" }],
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
          { "@type": "ListItem", position: 2, name: "Plan an enduro roadbook", item: `${SITE_URL}${PATH}` },
        ],
      },
    ],
  };

  return (
    <GuideShell path={PATH} crumb="Guide" schema={schema}>
      <header className="flex flex-col gap-5">
        <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight">
          How to plan a roadbook for an enduro or trail ride
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          A good roadbook is short. It tells the rider what to do only where
          there is a choice to make, with a symbol that can be read in half a
          second on a bumpy trail. This guide shows how to get there from a
          GPX track.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-black">The workflow in 6 steps</h2>
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
        <h2 className="text-2xl font-black">Where exactly to put a waypoint</h2>
        <p className="text-gray-400 leading-relaxed">
          The display switches to the next instruction as soon as you are
          inside the trigger radius (15, 25 or 50 m). That has two
          consequences for planning:
        </p>
        <ul className="flex flex-col gap-3 text-gray-400 text-sm leading-relaxed">
          {[
            "Place the waypoint a few metres into the exit you want, not in the middle of the junction. Then the next instruction appears as you leave the junction, pointing the right way.",
            "Keep waypoints at least two trigger radii apart. Two junctions 30 m apart with a 25 m radius would trigger almost at the same time — use the 15 m radius on tight trails, or combine both into one instruction.",
            "On long sections without a decision, you don't need any waypoint. The distance countdown simply runs down to the next one.",
            "If you miss a waypoint by a little, navigation still continues: once you clearly move away after passing close by, it counts as passed.",
          ].map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="text-gray-700 select-none flex-shrink-0">—</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Choosing the right symbol</h2>
        <dl className="flex flex-col gap-4 text-sm">
          {[
            ["Left / right", "A clear turn onto another track or road. Use slight or sharp to describe the angle the rider actually sees."],
            ["Keep left / keep right", "A fork where two similar branches split. It tells the rider not to turn hard, just to stay on one side."],
            ["Roundabout + exit", "Count the exits from where you enter, including small tracks if they look like exits on the ground. The exit number is shown inside the symbol."],
            ["Straight", "Useful where a bigger track turns off but you continue straight — it confirms that doing nothing is right."],
            ["U-turn", "For out-and-back sections, a viewpoint or a dead end you ride into on purpose."],
          ].map(([term, desc]) => (
            <div key={term} className="flex flex-col gap-1 border-l border-white/15 pl-4">
              <dt className="text-white font-semibold">{term}</dt>
              <dd className="text-gray-400 leading-relaxed">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Marking hazards with ! / !! / !!!</h2>
        <p className="text-gray-400 leading-relaxed">
          Rally roadbooks use exclamation marks for danger, and riders learn to
          slow down when they see them. Roadbook Nav uses the same marks. Use
          them sparingly, otherwise riders stop taking them seriously:
        </p>
        <ul className="flex flex-col gap-2 text-gray-400 text-sm leading-relaxed">
          <li><strong className="text-amber-400">!</strong> — caution: a rut, a bump, loose gravel in a bend.</li>
          <li><strong className="text-orange-500">!!</strong> — danger: a hole, a step, a blind crest. Slow down clearly.</li>
          <li><strong className="text-red-500">!!!</strong> — serious danger: a drop, a ford of unknown depth, a crossing with traffic. Be ready to stop.</li>
        </ul>
        <p className="text-gray-400 leading-relaxed">
          Put the hazard on the waypoint <em>before</em> it. The rider then
          gets a distinct triple warning sound — and a vibration on Android —
          about nine seconds before reaching it.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black">Check distances, but don&apos;t trust them blindly</h2>
        <p className="text-gray-400 leading-relaxed">
          The editor shows straight-line distances between waypoints. On a
          twisty trail, the real distance is longer. While riding, the trip
          meter counts what you actually ride, and next to it you see the
          planned route distance, so you can judge how far off the plan you
          are. Correct the trip meter with − and + in 10 m steps, like on a
          rally odometer.
        </p>
      </section>

      <section className="flex flex-col gap-5 border-t border-white/10 pt-10">
        <h2 className="text-2xl font-black">Try it with an example</h2>
        <p className="text-gray-400 leading-relaxed">
          Open a short example roadbook with forks and hazard marks in the
          editor and step through it with Preview.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/?example=forest-loop"
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-colors"
          >
            Open the example →
          </Link>
          <Link
            href="/app/"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            Start an empty roadbook
          </Link>
        </div>
      </section>
    </GuideShell>
  );
}
