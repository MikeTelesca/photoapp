// Client-side date formatter that respects user timezone from localStorage
export function formatUserDate(
  date: Date | string | number,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (typeof window === "undefined") return d.toLocaleDateString();

  const tz = localStorage.getItem("user-timezone") || undefined;
  try {
    return d.toLocaleString(undefined, {
      timeZone: tz,
      ...opts,
    });
  } catch {
    return d.toLocaleString();
  }
}

export function formatUserDateOnly(date: Date | string | number): string {
  return formatUserDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatUserDateTime(date: Date | string | number): string {
  return formatUserDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
