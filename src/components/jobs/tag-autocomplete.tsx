"use client";
import { useState, useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}

export function TagAutocomplete({ value, onChange, placeholder, className, onKeyDown: onKeyDownProp, autoFocus }: Props) {
  const [suggestions, setSuggestions] = useState<{ tag: string; count: number }[]>([]);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/jobs/tags")
      .then(r => r.json())
      .then(data => {
        setAllTags(data.tags || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cursor = value.lastIndexOf(",");
    const currentTag = (cursor === -1 ? value : value.slice(cursor + 1)).trim().toLowerCase();

    if (!currentTag) {
      setSuggestions(allTags.slice(0, 8));
    } else {
      const filtered = allTags
        .filter(t => t.tag.toLowerCase().includes(currentTag) && t.tag.toLowerCase() !== currentTag)
        .slice(0, 8);
      setSuggestions(filtered);
    }
    setActiveIndex(0);
  }, [value, allTags]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickSuggestion(tag: string) {
    const cursor = value.lastIndexOf(",");
    const before = cursor === -1 ? "" : value.slice(0, cursor + 1).trim();
    const newValue = before ? `${before} ${tag}, ` : `${tag}, `;
    onChange(newValue);
    setShowSuggestions(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Handle arrow keys and autocomplete selection
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        return;
      } else if (e.key === "Tab" || (e.key === "Enter" && showSuggestions)) {
        e.preventDefault();
        pickSuggestion(suggestions[activeIndex].tag);
        return;
      }
    }
    // Call external handler if provided
    if (onKeyDownProp) {
      onKeyDownProp(e);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || "comma,separated,tags"}
        className={className || "w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => pickSuggestion(s.tag)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full text-left px-3 py-1.5 text-xs flex justify-between items-center ${
                i === activeIndex ? "bg-cyan-50 dark:bg-cyan-900/20" : ""
              } hover:bg-graphite-50 dark:hover:bg-graphite-800`}
            >
              <span className="dark:text-white">{s.tag}</span>
              <span className="text-graphite-400">{s.count}×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
