"use client";
import { useState, useEffect } from "react";
import { getDateFormat, setDateFormat, type DateFormat } from "@/lib/date-format";

const SAMPLES: Record<DateFormat, string> = {
  us: "Apr 14, 2026",
  eu: "14 Apr 2026",
  iso: "2026-04-14",
  relative: "3 hours ago",
};

export function DateFormatPicker() {
  const [format, setFormatState] = useState<DateFormat>("us");

  useEffect(() => {
    setFormatState(getDateFormat());
  }, []);

  function change(f: DateFormat) {
    setFormatState(f);
    setDateFormat(f);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        How dates display across the app.
      </div>
      <div className="grid grid-cols-2 gap-1">
        {(["us", "eu", "iso", "relative"] as DateFormat[]).map(f => (
          <button key={f} onClick={() => change(f)}
            className={`text-xs px-3 py-2 rounded border ${format === f ? "bg-cyan text-white border-cyan" : "border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"}`}>
            <div className="font-semibold uppercase">{f}</div>
            <div className="text-[10px] opacity-80 mt-0.5">{SAMPLES[f]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
