import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/jobs");

  return (
    <div className="min-h-screen bg-graphite-50 dark:bg-graphite-950 flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-graphite-900 dark:text-white mb-4">
          <span className="text-graphite-900 dark:text-white">Batch</span>
          <span className="text-cyan">Base</span>
        </h1>
        <p className="text-base text-graphite-600 dark:text-graphite-300 mb-8">
          AI batch editing for real estate photographers.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-cyan text-white font-semibold rounded-lg hover:bg-cyan-600"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
