"use client";
import { useState } from "react";

interface Rating { id: string; authorName: string; rating: number; createdAt: string; }

interface Props {
  token: string;
  photoId: string;
  initialRatings: Rating[];
}

export function StarRating({ token, photoId, initialRatings }: Props) {
  const [ratings, setRatings] = useState(initialRatings);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(typeof window !== "undefined" ? localStorage.getItem("share-commenter-name") || "" : "");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);

  async function submit(rating: number, authorName: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}/photos/${photoId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, rating }),
      });
      if (res.ok) {
        const created = await res.json();
        setRatings([...ratings, created]);
        localStorage.setItem("share-commenter-name", authorName);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleStarClick(rating: number) {
    if (!name.trim()) {
      setPendingRating(rating);
      setShowNamePrompt(true);
      return;
    }
    submit(rating, name);
  }

  function handleNameSubmit() {
    if (!name.trim() || pendingRating === 0) return;
    submit(pendingRating, name);
    setShowNamePrompt(false);
    setPendingRating(0);
  }

  const avg = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 0;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => handleStarClick(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            disabled={submitting}
            className={`text-2xl transition-colors ${
              n <= (hovered || avg) ? "text-amber-400" : "text-graphite-300"
            }`}
            title={`Rate ${n} star${n === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
        {ratings.length > 0 && (
          <span className="ml-2 text-xs text-graphite-500">
            {avg.toFixed(1)} ({ratings.length} rating{ratings.length === 1 ? "" : "s"})
          </span>
        )}
      </div>

      {showNamePrompt && (
        <div className="mt-2 flex gap-1">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="text-xs px-2 py-1 rounded border border-graphite-200"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(); }}
          />
          <button onClick={handleNameSubmit} disabled={!name.trim()}
            className="text-xs px-2 py-1 rounded bg-cyan text-white">Rate</button>
        </div>
      )}
    </div>
  );
}
