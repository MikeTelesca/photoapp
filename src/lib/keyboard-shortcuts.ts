export interface Shortcut {
  id: string;
  label: string;
  defaultKey: string;
}

export const SHORTCUTS: Shortcut[] = [
  { id: "approve", label: "Approve photo", defaultKey: "a" },
  { id: "reject", label: "Reject photo", defaultKey: "r" },
  { id: "next", label: "Next photo", defaultKey: "ArrowRight" },
  { id: "prev", label: "Previous photo", defaultKey: "ArrowLeft" },
  { id: "favorite", label: "Toggle favorite", defaultKey: "f" },
  { id: "reenhance", label: "Re-enhance photo", defaultKey: "e" },
  { id: "slider", label: "Toggle slider view", defaultKey: "s" },
  { id: "zoom", label: "Toggle zoom", defaultKey: "z" },
  { id: "help", label: "Show help overlay", defaultKey: "?" },
];

const STORAGE_KEY = "keyboard-bindings-v1";

export function loadBindings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveBindings(bindings: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function getKey(id: string): string {
  const bindings = loadBindings();
  const def = SHORTCUTS.find(s => s.id === id)?.defaultKey || "";
  return bindings[id] || def;
}

export function getActionForKey(key: string): string | null {
  const bindings = loadBindings();
  // Check custom bindings first
  for (const [id, k] of Object.entries(bindings)) {
    if (k.toLowerCase() === key.toLowerCase()) return id;
  }
  // Fall back to defaults
  for (const s of SHORTCUTS) {
    if (!(s.id in bindings) && s.defaultKey.toLowerCase() === key.toLowerCase()) return s.id;
  }
  return null;
}
