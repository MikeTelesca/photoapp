const KEY = "recently-viewed-jobs-v1";
const MAX = 5;

export interface RecentJob {
  id: string;
  address: string;
  visitedAt: number;
}

export function trackVisit(job: { id: string; address: string }): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecentJob[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(j => j.id !== job.id);
    filtered.unshift({ id: job.id, address: job.address, visitedAt: Date.now() });
    const trimmed = filtered.slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getRecent(): RecentJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
