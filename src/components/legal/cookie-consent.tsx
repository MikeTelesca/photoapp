"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent-v1";

interface Consent {
  necessary: true; // always
  preferences: boolean;
  analytics: boolean;
  acceptedAt: number;
}

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setTimeout(() => setShow(true), 800); // small delay so it doesn't pop instantly
    }
  }, []);

  function save(consent: Partial<Consent>) {
    const full: Consent = {
      necessary: true,
      preferences: consent.preferences ?? true,
      analytics: consent.analytics ?? false,
      acceptedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    setShow(false);
    setShowCustomize(false);
  }

  function acceptAll() {
    save({ preferences: true, analytics: true });
  }

  function declineOptional() {
    save({ preferences: false, analytics: false });
  }

  function saveCustom() {
    save({ preferences, analytics });
  }

  if (!show) return null;

  if (showCustomize) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl p-4">
        <h3 className="text-sm font-bold text-graphite-900 dark:text-white mb-2">Cookie preferences</h3>
        <div className="space-y-2 mb-3">
          <CookieRow label="Necessary" desc="Required for sign-in and security. Always on." enabled={true} disabled />
          <CookieRow label="Preferences" desc="Remember your theme, layout, and shortcut customizations." enabled={preferences} onChange={setPreferences} />
          <CookieRow label="Analytics" desc="Help us understand usage patterns. Anonymous." enabled={analytics} onChange={setAnalytics} />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowCustomize(false)}
            className="text-xs px-3 py-1.5 rounded text-graphite-500">Back</button>
          <button onClick={saveCustom}
            className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold">Save preferences</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl p-4">
      <h3 className="text-sm font-bold text-graphite-900 dark:text-white mb-2">🍪 Cookies</h3>
      <p className="text-xs text-graphite-600 dark:text-graphite-300 mb-3">
        We use cookies for sign-in, your preferences (theme, shortcuts), and to keep the app working. You can customize what's allowed.
      </p>
      <div className="flex flex-wrap gap-2 justify-end">
        <button onClick={declineOptional}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
          Necessary only
        </button>
        <button onClick={() => setShowCustomize(true)}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
          Customize
        </button>
        <button onClick={acceptAll}
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold">
          Accept all
        </button>
      </div>
    </div>
  );
}

function CookieRow({ label, desc, enabled, onChange, disabled }: { label: string; desc: string; enabled: boolean; onChange?: (v: boolean) => void; disabled?: boolean; }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-graphite-50 dark:border-graphite-800 last:border-b-0">
      <div className="flex-1">
        <div className="text-xs font-semibold dark:text-white">{label}</div>
        <div className="text-[11px] text-graphite-500 dark:text-graphite-400">{desc}</div>
      </div>
      <button disabled={disabled} onClick={() => onChange?.(!enabled)}
        className={`relative w-9 h-5 rounded-full flex-shrink-0 ${
          disabled ? "bg-emerald-300 cursor-not-allowed" : enabled ? "bg-emerald-500" : "bg-graphite-300 dark:bg-graphite-700"
        }`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
