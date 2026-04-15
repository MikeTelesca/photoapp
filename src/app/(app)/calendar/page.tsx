import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CalendarDayPopover } from "@/components/calendar/calendar-day-popover";

export const dynamic = "force-dynamic";

type CalendarJob = {
  id: string;
  address: string;
  colorLabel: string | null;
  createdAt: Date;
  status: string;
};

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

function getDotColor(colorLabel: string | null): string {
  if (colorLabel && COLOR_MAP[colorLabel]) return COLOR_MAP[colorLabel];
  return "bg-graphite-500";
}

function getInitials(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function parseMonthParam(param: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    if (y >= 1970 && y <= 3000 && m >= 1 && m <= 12) {
      return { year: y, month: m - 1 };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const params = await searchParams;
  const { year, month } = parseMonthParam(params.month);

  const session = await auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  // Month range (inclusive start, exclusive end)
  const startOfMonth = new Date(year, month, 1);
  const startOfNextMonth = new Date(year, month + 1, 1);

  const where: {
    createdAt: { gte: Date; lt: Date };
    status: { not: string };
    photographerId?: string;
  } = {
    createdAt: { gte: startOfMonth, lt: startOfNextMonth },
    status: { not: "deleted" },
  };
  if (userRole !== "admin" && userId) {
    where.photographerId = userId;
  }

  let jobs: CalendarJob[] = [];
  try {
    const rows = await prisma.job.findMany({
      where,
      select: {
        id: true,
        address: true,
        colorLabel: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });
    jobs = rows;
  } catch (err) {
    console.error("Failed to load jobs for calendar:", err);
  }

  // Bucket jobs by day-of-month
  const jobsByDay = new Map<number, CalendarJob[]>();
  for (const j of jobs) {
    const d = new Date(j.createdAt);
    // Use local date (same locale the server renders with)
    const day = d.getDate();
    const list = jobsByDay.get(day) ?? [];
    list.push(j);
    jobsByDay.set(day, list);
  }

  // Grid: start from Sunday on/before day 1, end at Saturday on/after last day
  const firstDayWeekday = startOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDayWeekday = new Date(year, month, daysInMonth).getDay();
  const leadingBlanks = firstDayWeekday;
  const trailingBlanks = 6 - lastDayWeekday;

  const cells: Array<{ day: number | null; isToday: boolean }> = [];
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  for (let i = 0; i < leadingBlanks; i++) cells.push({ day: null, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      isToday: isCurrentMonth && today.getDate() === d,
    });
  }
  for (let i = 0; i < trailingBlanks; i++) cells.push({ day: null, isToday: false });

  // Prev / next month
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const prevMonthParam = formatMonthParam(prev.getFullYear(), prev.getMonth());
  const nextMonthParam = formatMonthParam(next.getFullYear(), next.getMonth());

  // Day popover data (optional ?day=D)
  const selectedDay =
    params.day && /^\d+$/.test(params.day)
      ? Math.min(Math.max(parseInt(params.day, 10), 1), daysInMonth)
      : null;
  const selectedJobs = selectedDay ? jobsByDay.get(selectedDay) ?? [] : [];
  const currentMonthParam = formatMonthParam(year, month);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-graphite-900 dark:text-white tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-0.5">
            Jobs by creation date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${prevMonthParam}`}
            className="p-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-800 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Link>
          <div className="px-3 py-1.5 min-w-[160px] text-center text-sm font-semibold text-graphite-900 dark:text-white">
            {MONTH_NAMES[month]} {year}
          </div>
          <Link
            href={`/calendar?month=${nextMonthParam}`}
            className="p-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-800 transition-colors"
            aria-label="Next month"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
          <Link
            href="/calendar"
            className="ml-2 px-3 py-1.5 rounded-lg bg-cyan text-white text-xs font-semibold hover:bg-cyan-light transition-colors"
          >
            Today
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-graphite-900 rounded-xl border border-graphite-200 dark:border-graphite-800 overflow-hidden">
        <div className="grid grid-cols-7 bg-graphite-50 dark:bg-graphite-800/50 border-b border-graphite-200 dark:border-graphite-800">
          {WEEKDAY_NAMES.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400 text-center"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (cell.day === null) {
              return (
                <div
                  key={idx}
                  className="min-h-[96px] md:min-h-[112px] border-b border-r border-graphite-100 dark:border-graphite-800 bg-graphite-50/50 dark:bg-graphite-900/50"
                />
              );
            }
            const dayJobs = jobsByDay.get(cell.day) ?? [];
            const count = dayJobs.length;
            const dots = dayJobs.slice(0, 3);
            const href = `/calendar?month=${currentMonthParam}&day=${cell.day}`;
            const isSelected = selectedDay === cell.day;
            return (
              <Link
                key={idx}
                href={href}
                scroll={false}
                className={`min-h-[96px] md:min-h-[112px] border-b border-r border-graphite-100 dark:border-graphite-800 p-2 flex flex-col gap-1.5 transition-colors ${
                  isSelected
                    ? "bg-cyan/5 ring-1 ring-cyan ring-inset"
                    : "hover:bg-graphite-50 dark:hover:bg-graphite-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                      cell.isToday
                        ? "bg-cyan text-white"
                        : "text-graphite-700 dark:text-graphite-300"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-graphite-900 dark:bg-graphite-700 text-white">
                      {count}
                    </span>
                  )}
                </div>
                {count > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-auto">
                    {dots.map((j) => (
                      <span
                        key={j.id}
                        title={j.address}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white ${getDotColor(
                          j.colorLabel
                        )}`}
                      >
                        {getInitials(j.address)}
                      </span>
                    ))}
                    {count > 3 && (
                      <span className="text-[10px] text-graphite-500 dark:text-graphite-400 font-medium">
                        +{count - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <CalendarDayPopover
          year={year}
          month={month}
          day={selectedDay}
          jobs={selectedJobs.map((j) => ({
            id: j.id,
            address: j.address,
            colorLabel: j.colorLabel,
            status: j.status,
            createdAt: j.createdAt.toISOString(),
          }))}
          monthParam={currentMonthParam}
        />
      )}
    </div>
  );
}
