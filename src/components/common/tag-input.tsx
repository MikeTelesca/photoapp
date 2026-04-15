"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";

interface Props {
  /** Comma-separated tag string (matches how tags are stored on jobs). */
  value: string;
  /** Called with the updated comma-separated string. */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the outer chip container. */
  className?: string;
  autoFocus?: boolean;
  /** Max number of suggestions to display. */
  maxSuggestions?: number;
}

interface TagSuggestion {
  tag: string;
  count: number;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function toValue(tags: string[]): string {
  return tags.join(", ");
}

/**
 * Chip-style tag input with autocomplete from the user's most-used tags.
 *
 * Behaviour:
 *  - Type and press Enter (or `,`) to add a chip.
 *  - Press Tab to accept the highlighted suggestion.
 *  - Press Backspace on an empty input to remove the last chip.
 *  - Arrow keys move through suggestions.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag…",
  className,
  autoFocus,
  maxSuggestions = 8,
}: Props) {
  const [draft, setDraft] = useState("");
  const [allTags, setAllTags] = useState<TagSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = useMemo(() => parseTags(value), [value]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/tags")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.tags)) setAllTags(data.tags);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const existing = new Set(tags.map((t) => t.toLowerCase()));
    const q = draft.trim().toLowerCase();
    const pool = allTags.filter((t) => !existing.has(t.tag.toLowerCase()));
    const filtered = q
      ? pool.filter((t) => t.tag.toLowerCase().includes(q) && t.tag.toLowerCase() !== q)
      : pool;
    return filtered.slice(0, maxSuggestions);
  }, [allTags, draft, tags, maxSuggestions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [draft, suggestions.length]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const addTag = useCallback(
    (raw: string) => {
      const clean = raw.trim().replace(/,+$/g, "").trim();
      if (!clean) return;
      const existing = new Set(tags.map((t) => t.toLowerCase()));
      if (existing.has(clean.toLowerCase())) {
        setDraft("");
        return;
      }
      onChange(toValue([...tags, clean]));
      setDraft("");
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (idx: number) => {
      const next = tags.filter((_, i) => i !== idx);
      onChange(toValue(next));
    },
    [tags, onChange]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const hasSuggestions = showSuggestions && suggestions.length > 0;

    if (e.key === "ArrowDown" && hasSuggestions) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && hasSuggestions) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Tab" && hasSuggestions) {
      // Tab accepts current suggestion.
      e.preventDefault();
      addTag(suggestions[activeIndex].tag);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hasSuggestions && draft.trim() === "") {
        addTag(suggestions[activeIndex].tag);
      } else if (hasSuggestions) {
        // Prefer matching suggestion if it starts with what's typed
        const match = suggestions.find(
          (s) => s.tag.toLowerCase() === draft.trim().toLowerCase()
        );
        addTag(match ? match.tag : draft);
      } else {
        addTag(draft);
      }
      return;
    }
    if (e.key === ",") {
      e.preventDefault();
      addTag(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      removeTag(tags.length - 1);
      return;
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={
          className ||
          [
            "flex flex-wrap items-center gap-1.5 min-h-[42px] w-full px-2 py-1.5",
            "rounded-lg border text-sm cursor-text transition-colors",
            "border-graphite-200 bg-white text-graphite-900 placeholder:text-graphite-400",
            "dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-100",
            focused
              ? "border-cyan ring-1 ring-cyan dark:border-cyan"
              : "hover:border-graphite-300 dark:hover:border-graphite-600",
          ].join(" ")
        }
      >
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-cyan-50 text-cyan-dark border border-cyan/20 dark:bg-cyan-900/20 dark:text-cyan-light dark:border-cyan/30 px-2 py-0.5 text-xs font-medium"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="text-cyan-dark/70 hover:text-cyan-dark dark:text-cyan-light/70 dark:hover:text-cyan-light leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-graphite-900 dark:text-graphite-100 placeholder:text-graphite-400"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onMouseDown={(e) => {
                // mousedown so the input blur doesn't close the menu first
                e.preventDefault();
                addTag(s.tag);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={[
                "w-full text-left px-3 py-1.5 text-xs flex justify-between items-center transition-colors",
                i === activeIndex
                  ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-dark dark:text-cyan-light"
                  : "text-graphite-800 dark:text-graphite-100 hover:bg-graphite-50 dark:hover:bg-graphite-800",
              ].join(" ")}
            >
              <span>{s.tag}</span>
              <span className="text-graphite-400 dark:text-graphite-500">{s.count}×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
