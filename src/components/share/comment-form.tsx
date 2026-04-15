"use client";
import { useState } from "react";
import { Reactions } from "@/components/comments/reactions";

interface Comment { id: string; authorName: string; message: string; createdAt: string | Date; reactions?: Record<string, number>; }

interface Props {
  token: string;
  photoId: string;
  initialComments: Comment[];
}

export function CommentForm({ token, photoId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState(typeof window !== "undefined" ? localStorage.getItem("share-commenter-name") || "" : "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/share/${token}/photos/${photoId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, message }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments([...comments, c]);
        setMessage("");
        localStorage.setItem("share-commenter-name", name);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 text-sm">
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map(c => (
            <div key={c.id} className="bg-graphite-50 dark:bg-graphite-900 rounded p-2">
              <div className="font-semibold text-xs text-graphite-700 dark:text-graphite-200">{c.authorName}</div>
              <div className="text-xs text-graphite-600 dark:text-graphite-300 whitespace-pre-wrap">{c.message}</div>
              <Reactions commentId={c.id} commentType="photo" initialReactions={c.reactions} />
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="px-2 py-1 text-xs rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white"
          required
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Comment on this photo..."
          maxLength={1000}
          rows={2}
          className="px-2 py-1 text-xs rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white resize-none"
          required
        />
        <button type="submit" disabled={sending || !name.trim() || !message.trim()}
          className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold disabled:bg-graphite-300">
          {sending ? "Sending..." : "Post comment"}
        </button>
      </form>
    </div>
  );
}
