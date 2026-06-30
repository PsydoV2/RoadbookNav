import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-8 text-center gap-6">
      <span className="text-gray-700 font-mono text-sm">404</span>
      <h1 className="text-4xl font-black tracking-tight">Page not found.</h1>
      <p className="text-gray-400 text-sm max-w-xs">
        Looks like you rode off the map. No waypoint here.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm"
      >
        Back to start
      </Link>
    </main>
  );
}
