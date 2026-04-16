"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = {
  displayName: string;
  formatted: string;
  lat: string | null;
  lon: string | null;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

// Free-tier address autocomplete backed by OpenStreetMap Nominatim via our
// server-side /api/geocode proxy. Debounced at 350ms to respect Nominatim's
// 1 req/sec policy.
export function AddressAutocomplete({ value, onChange, placeholder, autoFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 4) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (Array.isArray(data)) setSuggestions(data as Suggestion[]);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function accept(s: Suggestion) {
    onChange(s.formatted);
    setOpen(false);
    setHighlight(-1);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className="w-full h-14 px-5 rounded-2xl bg-graphite-950 border border-graphite-800 text-lg text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        autoComplete="off"
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            accept(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-10 left-0 right-0 mt-1.5 bg-graphite-900 border border-graphite-800 rounded-2xl shadow-2xl overflow-hidden">
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-graphite-500">Searching…</div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => accept(s)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                highlight === i ? "bg-graphite-800 text-white" : "text-graphite-300 hover:bg-graphite-800/50"
              }`}
            >
              <div className="font-medium text-white truncate">{s.formatted}</div>
              <div className="text-[11px] text-graphite-500 truncate">{s.displayName}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
