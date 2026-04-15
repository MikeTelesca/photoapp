"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";

type Job = {
  id: string;
  address: string;
  colorLabel: string | null;
  status: string;
  createdAt: string;
};

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

function dotColor(c: string | null) {
  return (c && COLOR_MAP[c]) || "bg-graphite-500";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarDayPopover({
  year,
  month,
  day,
  jobs,
  monthParam,
}: {
  year: number;
  month: number;
  day: number;
  jobs: Job[];
  monthParam: string;
}) {
  const router = useRouter();
  const close = () => router.push(`/calendar?month=${monthParam}`, { scroll: false });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end md:pr-6">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className="relative w-full md:w-[400px] max-w-full h-full md:h-auto md:max-h-[calc(100vh-3rem)] md:rounded-xl bg-white dark:bg-graphite-900 border-l md:border border-graphite-200 dark:border-graphite-800 shadow-xl flex flex-col"
        role="dialog"
        aria-label={`Jobs on ${MONTH_NAMES[month]} ${day}, ${year}`}
      >
        <div className="px-5 py-4 border-b border-graphite-200 dark:border-graphite-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-graphite-400">
              {MONTH_NAMES[month]} {day}, {year}
            </div>
            <div className="text-sm font-semibold text-graphite-900 dark:text-white mt-0.5">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="p-1.5 rounded-lg text-graphite-400 hover:text-graphite-700 dark:hover:text-graphite-200 hover:bg-graphite-100 dark:hover:bg-graphite-800 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {jobs.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-graphite-500 dark:text-graphite-400">
              No jobs on this day.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {jobs.map((j) => {
                const time = new Date(j.createdAt);
                const hh = time.getHours().toString().padStart(2, "0");
                const mm = time.getMinutes().toString().padStart(2, "0");
                return (
                  <li key={j.id}>
                    <Link
                      href={`/review/${j.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-graphite-100 dark:hover:bg-graphite-800 transition-colors"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor(
                          j.colorLabel
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-graphite-900 dark:text-white truncate">
                          {j.address || "(no address)"}
                        </div>
                        <div className="text-[11px] text-graphite-500 dark:text-graphite-400 mt-0.5 capitalize">
                          {j.status} · {hh}:{mm}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
