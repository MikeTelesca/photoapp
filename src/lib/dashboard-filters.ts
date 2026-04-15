export interface SavedFilter {
  id: string;
  name: string;
  search?: string;
  status?: string;
  preset?: string;
  tag?: string;
  createdAt: number;
}

const KEY = "dashboard-saved-filters-v1";

export function loadFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFilter(filter: Omit<SavedFilter, "id" | "createdAt">): SavedFilter {
  const all = loadFilters();
  const newFilter: SavedFilter = {
    ...filter,
    id: `f-${Date.now()}`,
    createdAt: Date.now(),
  };
  all.unshift(newFilter);
  // Cap at 10 saved filters
  const trimmed = all.slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  return newFilter;
}

export function deleteFilter(id: string) {
  const all = loadFilters().filter(f => f.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}
