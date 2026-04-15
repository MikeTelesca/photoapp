const KEY = "command-palette-history-v1";
const MAX = 10;

export function addToHistory(query: string): void {
  if (typeof window === "undefined") return;
  if (!query || query.length < 2) return;

  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(q => q !== query);
    filtered.unshift(query);
    const trimmed = filtered.slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
