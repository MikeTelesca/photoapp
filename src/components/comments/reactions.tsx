"use client";
import { useState } from "react";

const EMOJIS = ["👍", "❤️", "🎉", "😂", "👏", "🔥"];

interface Props {
  commentId: string;
  commentType: "job" | "photo";
  initialReactions?: Record<string, number>;
}

export function Reactions({ commentId, commentType, initialReactions = {} }: Props) {
  const [reactions, setReactions] = useState<Record<string, number>>(initialReactions);
  const [showPicker, setShowPicker] = useState(false);

  async function react(emoji: string) {
    setShowPicker(false);
    const res = await fetch("/api/comments/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, commentType, emoji }),
    });
    const data = await res.json();
    if (res.ok) setReactions(data.reactions || {});
  }

  return (
    <div className="flex gap-1 mt-1 items-center relative">
      {Object.entries(reactions).map(([emoji, count]) => (
        <button key={emoji} onClick={() => react(emoji)}
          className="text-[11px] px-2 py-0.5 rounded-full bg-graphite-100 dark:bg-graphite-800 hover:bg-graphite-200 dark:hover:bg-graphite-700">
          {emoji} {count}
        </button>
      ))}
      <button onClick={() => setShowPicker(!showPicker)}
        className="text-[11px] px-1.5 py-0.5 rounded-full bg-graphite-100/50 dark:bg-graphite-800/50 text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300">
        +
      </button>
      {showPicker && (
        <div className="absolute left-0 top-full mt-1 z-30 flex gap-1 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-full px-2 py-1 shadow-lg">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => react(e)}
              className="text-base hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
