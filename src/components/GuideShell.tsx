import Link from "next/link";
import { GUIDES } from "@/lib/site";

// Shared frame for /guide/* pages: nav, breadcrumb, related guides, footer.
export default function GuideShell({
  path,
  crumb,
  schema,
  children,
}: {
  path: string;
  crumb: string;
  schema: object;
  children: React.ReactNode;
}) {
  const related = GUIDES.filter((g) => g.path !== path);

  return (
    <main className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <Link href="/" className="font-bold tracking-tight">
          Roadbook Nav
        </Link>
        <Link
          href="/app/"
          className="px-4 py-2 text-sm font-semibold bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
        >
          Open App
        </Link>
      </nav>

      <article className="max-w-2xl mx-auto px-6 sm:px-8 pt-32 pb-24 flex flex-col gap-12">
        <ol className="flex gap-2 text-xs text-gray-500 -mb-7" aria-label="Breadcrumb">
          <li>
            <Link href="/" className="hover:text-gray-300">
              Roadbook Nav
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-gray-400">{crumb}</li>
        </ol>

        {children}

        {related.length > 0 && (
          <section className="flex flex-col gap-4 border-t border-white/10 pt-10">
            <h2 className="text-gray-500 text-sm font-normal uppercase tracking-widest">
              More guides
            </h2>
            <ul className="flex flex-col gap-3">
              {related.map((g) => (
                <li key={g.path}>
                  <Link
                    href={g.path}
                    className="text-white underline underline-offset-4 hover:text-gray-300"
                  >
                    {g.title} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <footer className="border-t border-white/10 px-8 py-6 text-center text-gray-500 text-xs">
        <Link href="/" className="hover:text-gray-300">
          Roadbook Nav
        </Link>{" "}
        · Built for people who ride where there&apos;s no signal.
      </footer>
    </main>
  );
}
