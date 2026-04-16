import Link from "next/link";
import { signOut } from "@/lib/auth";

type Active = "jobs" | "agents" | "presets" | "users" | "settings" | null;

type Props = {
  active: Active;
  isAdmin: boolean;
};

// Shared sticky top nav. Matches /jobs styling so pages feel unified.
export function AppNav({ active, isAdmin }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-graphite-900 bg-graphite-950/80 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/jobs" className="font-semibold text-[15px] tracking-tight">
          <span className="text-white">Batch</span>
          <span className="text-cyan">Base</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/jobs" label="Jobs" active={active === "jobs"} />
          <NavLink href="/agents" label="Agents" active={active === "agents"} />
          <NavLink href="/presets" label="Presets" active={active === "presets"} />
          {isAdmin && <NavLink href="/users" label="Users" active={active === "users"} />}
          <NavLink href="/settings/dropbox" label="Settings" active={active === "settings"} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="px-3 h-8 flex items-center rounded-lg text-graphite-400 hover:text-red-300 hover:bg-red-950/20"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "px-3 h-8 flex items-center rounded-lg text-white font-medium bg-graphite-900"
          : "px-3 h-8 flex items-center rounded-lg text-graphite-400 hover:text-white hover:bg-graphite-900"
      }
    >
      {label}
    </Link>
  );
}
