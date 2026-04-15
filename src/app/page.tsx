import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-graphite-50 to-white dark:from-graphite-900 dark:to-graphite-950">
      {/* Top bar */}
      <header className="border-b border-graphite-100 dark:border-graphite-800 bg-white/80 dark:bg-graphite-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="text-lg font-bold text-graphite-900 dark:text-white">
            ATH AI Editor
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/whats-new" className="text-xs text-graphite-500 dark:text-graphite-400 hover:text-cyan hidden sm:inline">
              What&apos;s new
            </Link>
            <Link href="/help" className="text-xs text-graphite-500 dark:text-graphite-400 hover:text-cyan hidden sm:inline">
              Help
            </Link>
            <Link href="/status" className="text-xs text-graphite-500 dark:text-graphite-400 hover:text-cyan hidden sm:inline">
              Status
            </Link>
            <Link href="/login" className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-graphite-900 dark:text-white mb-6 tracking-tight">
          AI photo editing<br />for real estate
        </h1>
        <p className="text-lg text-graphite-600 dark:text-graphite-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          Drop a Dropbox folder of bracketed photos. Get HDR-merged, color-corrected, MLS-ready edits in minutes. Built for working photographers.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/login"
            className="inline-block px-6 py-3 bg-cyan text-white font-semibold rounded-lg text-base hover:bg-cyan-600">
            Get started &rarr;
          </Link>
          <Link href="/help"
            className="inline-block px-6 py-3 border border-graphite-200 dark:border-graphite-700 dark:text-graphite-200 rounded-lg text-base hover:bg-graphite-50 dark:hover:bg-graphite-800">
            See how it works
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature
            icon="✨"
            title="HDR auto-merge"
            desc="Bracketed exposures (3 or 5) merge into a single optimized image. Window pull, vertical line straightening, perspective correction — all automatic."
          />
          <Feature
            icon="🎨"
            title="4 editing presets"
            desc="Standard, Bright & Airy, Luxury, MLS Standard, Flambient. Plus customizable prompts and seasonal style variants."
          />
          <Feature
            icon="📦"
            title="Dropbox-first"
            desc="Paste a shared link. Outputs go back to your Dropbox folder. No re-uploads. Or upload files directly."
          />
          <Feature
            icon="🤝"
            title="Client-ready delivery"
            desc="Generate password-protected share links. Email galleries to clients with one click. Track ratings and comments."
          />
          <Feature
            icon="🧾"
            title="Invoicing built-in"
            desc="Generate branded PDF invoices per job. Track paid status. CSV exports for bookkeeping."
          />
          <Feature
            icon="📊"
            title="Per-photo control"
            desc="Approve/reject with A/R keys. Re-enhance with different presets. Crop suggestions. Photo ratings. AI auto-tagging."
          />
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-graphite-900 dark:text-white mb-6">
          Built for serious workflows
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <Stat number="$0.07" label="per photo" />
          <Stat number="~30s" label="per enhance" />
          <Stat number="4K" label="output res" />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-graphite-100 dark:border-graphite-800 bg-white/50 dark:bg-graphite-900/50 py-12 mt-12">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-graphite-900 dark:text-white mb-3">
            Ready to start?
          </h2>
          <p className="text-sm text-graphite-500 dark:text-graphite-400 mb-6">
            Sign up free, drop in your first Dropbox link, and watch your job get done in minutes.
          </p>
          <Link href="/login"
            className="inline-block px-6 py-3 bg-cyan text-white font-semibold rounded-lg hover:bg-cyan-600">
            Sign in to start &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-6 text-center text-[11px] text-graphite-400">
        ATH Media &middot; AI photo editing for real estate &middot;{" "}
        <Link href="/status" className="hover:underline">Status</Link>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800 p-5">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-graphite-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-graphite-500 dark:text-graphite-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-cyan">{number}</div>
      <div className="text-xs text-graphite-500 dark:text-graphite-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
