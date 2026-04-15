export interface DashboardWidget {
  key: string;
  label: string;
  defaultVisible: boolean;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { key: "onboarding", label: "Onboarding checklist", defaultVisible: true },
  { key: "inbox", label: "Inbox (review queue)", defaultVisible: true },
  { key: "quick-actions", label: "Quick actions", defaultVisible: true },
  { key: "cost-tracker", label: "This month cost", defaultVisible: true },
  { key: "recent-activity", label: "Recent activity", defaultVisible: true },
  { key: "activity-feed", label: "Activity feed", defaultVisible: true },
];

const STORAGE_KEY = "dashboard-widgets-v1";

export function loadVisibility(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveVisibility(visibility: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
}

export function isVisible(key: string): boolean {
  if (typeof window === "undefined") return true;
  const visibility = loadVisibility();
  const widget = DASHBOARD_WIDGETS.find((w) => w.key === key);
  if (widget && key in visibility) return visibility[key];
  return widget?.defaultVisible ?? true;
}
