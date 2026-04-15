"use client";

const KEY = "date-format-v1";

export type DateFormat = "us" | "eu" | "iso" | "relative";

export function getDateFormat(): DateFormat {
  if (typeof window === "undefined") return "us";
  const v = localStorage.getItem(KEY);
  if (v === "us" || v === "eu" || v === "iso" || v === "relative") return v;
  return "us";
}

export function setDateFormat(format: DateFormat) {
  localStorage.setItem(KEY, format);
  window.dispatchEvent(new CustomEvent("date-format-changed", { detail: format }));
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const format = getDateFormat();
  switch (format) {
    case "us":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    case "eu":
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    case "iso":
      return d.toISOString().slice(0, 10);
    case "relative":
      return formatRelative(d);
  }
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const format = getDateFormat();
  if (format === "iso") return d.toISOString().replace("T", " ").slice(0, 16);
  if (format === "relative") return formatRelative(d);
  return formatDate(date) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return future ? `in ${hrs}h` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return future ? `in ${days}d` : `${days}d ago`;
  return d.toLocaleDateString();
}
