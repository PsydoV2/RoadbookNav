import Link from 'next/link';
import InstallPwa from '@/components/InstallPwa';

export default function Home() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does motorcycle navigation work without internet in a forest?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Plan your route at home using the map editor and export it as a single JSON file. On your bike, import that file into the app. From that point everything runs offline — the app computes your distance to each waypoint using GPS coordinates and the Haversine formula, no internet connection required.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is a digital roadbook?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A digital roadbook is the modern equivalent of the paper tulip cards used in motorcycle rallies. Instead of a roll of paper on the handlebars, a screen shows one waypoint at a time — direction arrow and distance. This app strips it down further: one large arrow, one countdown. Nothing else.',
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <span className="font-bold tracking-tight">Roadbook Nav</span>
        <Link
          href="/app/"
          className="px-4 py-2 text-sm font-semibold bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
        >
          Open App
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col md:flex-row items-center justify-center gap-16 px-8 pt-24 pb-20 max-w-6xl mx-auto">
        <div className="flex flex-col gap-6 max-w-lg">
          <h1 className="text-5xl md:text-6xl font-black leading-[1.05] tracking-tight">
            Navigate forests.<br />No signal<br />required.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            A bare-minimum roadbook display for motorcycle trips. Plan waypoints at home,
            export a JSON, import on your phone, ride. No live maps. No accounts. No tracking.
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Link
              href="/app/"
              className="px-7 py-4 bg-white text-black font-bold text-base rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
            >
              Open the app →
            </Link>
            <a href="#how-it-works" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              How it works ↓
            </a>
          </div>
        </div>

        {/* Phone mockup */}
        <PhoneMockup />
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t border-white/10 py-24 px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500 text-sm uppercase tracking-widest mb-10">How it works</p>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                n: '01',
                title: 'Plan',
                body: 'Open the map editor at home. Click to place waypoints. Assign a direction to each — straight, left, sharp right, U-turn. Export as a single .json file.',
              },
              {
                n: '02',
                title: 'Load',
                body: 'Open the app on your phone. Import the JSON. Two seconds. No sync, no cloud, no account. The route lives in your browser\'s local storage.',
              },
              {
                n: '03',
                title: 'Ride',
                body: 'A full-screen arrow and a live distance countdown. At 25 m from each waypoint, the display advances automatically and the phone vibrates.',
              },
            ].map((step) => (
              <div key={step.n} className="flex flex-col gap-3">
                <span className="text-gray-700 font-mono text-sm">{step.n}</span>
                <h2 className="font-bold text-xl">{step.title}</h2>
                <p className="text-gray-400 leading-relaxed text-sm">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What it doesn't do ── */}
      <section className="border-t border-white/10 py-24 px-8 bg-[#050505]">
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-16">
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-8">What it doesn&apos;t do</p>
            <ul className="flex flex-col gap-3 text-gray-400 text-sm">
              {[
                'Fetch map tiles while navigating',
                'Send your location anywhere',
                'Require an account or sign-up',
                'Store data outside your own device',
                'Work as a turn-by-turn road navigator',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-gray-700 mt-0.5 select-none">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-8">Under the hood</p>
            <ul className="flex flex-col gap-3 text-sm">
              {[
                ['Distance', 'Haversine formula, pure JavaScript'],
                ['Trigger radius', '25 m around each waypoint'],
                ['Screen', 'WakeLock API keeps the display on'],
                ['Haptics', 'navigator.vibrate(400) at each point'],
                ['Storage', 'localStorage — no server involved'],
                ['Build', 'Next.js static export, runs anywhere'],
              ].map(([label, value]) => (
                <li key={label} className="flex gap-3">
                  <span className="text-gray-600 w-28 flex-shrink-0">{label}</span>
                  <span className="text-gray-300">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Install ── */}
      <section className="border-t border-white/10 py-24 px-8">
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div className="flex flex-col gap-5">
            <p className="text-gray-500 text-sm uppercase tracking-widest">Install it before you leave</p>
            <h2 className="text-3xl font-black leading-tight">
              Offline only works<br />when installed.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              The navigation mode has zero network requirements — but your browser only grants
              full offline capability to apps installed on the home screen. Add it once at home,
              and it works without a signal anywhere.
            </p>
            <p className="text-gray-600 text-xs">
              The map editor still needs internet to load OpenStreetMap tiles.
              Use it at home, then install and go.
            </p>
          </div>
          <div className="flex flex-col gap-8 pt-1">
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Your device</p>
              <InstallPwa />
            </div>
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Or open the app directly</p>
              <Link
                href="/app/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/20 text-sm text-white hover:bg-white/10 transition-colors self-start"
              >
                Open in browser →
              </Link>
              <p className="text-gray-600 text-xs">
                Works without installing, but requires internet for navigation in this mode.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-white/10 py-24 px-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-sm uppercase tracking-widest mb-10">FAQ</p>
          <div className="flex flex-col gap-10">
            <div>
              <h3 className="font-semibold text-white mb-2">
                How does motorcycle navigation work without internet in a forest?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                You plan the route at home with a regular internet connection (the map editor needs tiles).
                Export a JSON. On your bike, import it into the app — from that point the only thing
                running is the GPS receiver in your phone and a distance formula. No pings, no tiles, no fallback API.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                What is a digital roadbook?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                The paper tulip cards strapped to rally handlebars, digitised. Each card shows
                one instruction — a direction and a distance. This app does the same thing on a phone screen,
                advances automatically as you ride, and keeps it to the minimum: one arrow, one number.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                Does it work as a PWA / installable app?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Yes. Add it to your home screen from your mobile browser. The navigation mode runs
                entirely offline. The map editor requires internet to load OpenStreetMap tiles,
                so use that at home before you leave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/10 py-24 px-8 text-center">
        <p className="text-gray-500 text-sm mb-6">No install required. Runs in the browser.</p>
        <Link
          href="/app/"
          className="inline-block px-10 py-5 bg-white text-black font-bold text-lg rounded-2xl hover:bg-gray-100 active:scale-95 transition-all"
        >
          Open Roadbook Nav →
        </Link>
      </section>

      <footer className="border-t border-white/10 px-8 py-6 text-center text-gray-700 text-xs">
        Built for people who ride where there&apos;s no signal.
      </footer>
    </main>
  );
}

// ── Phone mockup ─────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative flex-shrink-0" style={{ width: 260, height: 530 }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-[2.8rem] opacity-20 blur-2xl"
        style={{ background: 'radial-gradient(ellipse at center, #ffffff 0%, transparent 70%)' }}
      />

      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[2.6rem] border-2 border-white/20 bg-[#0a0a0a] shadow-2xl overflow-hidden">

        {/* Dynamic island */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-black rounded-full z-10" />

        {/* Screen — nav UI */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-10 pt-14 select-none">

          {/* Top bar */}
          <div className="w-full flex items-center justify-between px-5">
            <span className="text-gray-600 text-sm">✕</span>
            <span className="text-gray-600 text-xs tabular-nums">3 / 7</span>
          </div>

          {/* Arrow circle */}
          <div
            className="rounded-full bg-[#151515] flex items-center justify-center"
            style={{ width: 168, height: 168 }}
          >
            <img
              src="/arrows/arrow-right-sm-svgrepo-com.svg"
              width={110}
              height={110}
              alt="right turn"
              style={{ filter: 'invert(1)' }}
              draggable={false}
            />
          </div>

          {/* Distance + label */}
          <div className="flex flex-col items-center gap-1.5 text-center px-4">
            <span className="text-[2.8rem] font-black tabular-nums leading-none">1.8 km</span>
            <span className="text-gray-400 text-sm">→ Forest Fork</span>
          </div>
        </div>

        {/* Subtle screen reflection */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[2.6rem]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Side buttons */}
      <div className="absolute right-[-3px] top-28 w-[3px] h-10 bg-white/15 rounded-r-sm" />
      <div className="absolute left-[-3px] top-24 w-[3px] h-8 bg-white/15 rounded-l-sm" />
      <div className="absolute left-[-3px] top-36 w-[3px] h-8 bg-white/15 rounded-l-sm" />
    </div>
  );
}
