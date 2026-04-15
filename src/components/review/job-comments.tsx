"use client";
import { useState, useEffect } from "react";
import { Reactions } from "@/components/comments/reactions";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author?: { name?: string | null; email?: string | null } | null;
  reactions?: Record<string, number>;
}

export function JobComments({ jobId }: { jobId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/jobs/${jobId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {}
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function post() {
    if (!newBody.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newBody }),
      });
      if (res.ok) {
        setNewBody("");
        load();
      }
    } finally {
      setPosting(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/jobs/${jobId}/comments/${id}`, { method: "DELETE" });
    load();
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await fetch(`/api/jobs/${jobId}/comments/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditBody("");
      load();
    }
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function renderBody(body: string): React.ReactNode {
    const parts = body.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="text-cyan font-semibold">{part}</span>;
      }
      return part;
    });
  }

  return (
    <div className="border border-graphite-100 dark:border-graphite-800 rounded">
      <button onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800">
        <span>💬 Comments {comments.length > 0 && <span className="text-cyan font-bold ml-1">{comments.length}</span>}</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-graphite-100 dark:border-graphite-800 space-y-2">
          {comments.length === 0 ? (
            <div className="text-xs text-graphite-400 py-2">No comments yet</div>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map(c => (
                <li key={c.id} className="bg-graphite-50 dark:bg-graphite-800 rounded p-2 text-xs">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold dark:text-white">
                      {c.author?.name || c.author?.email || "Unknown"}
                    </span>
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-graphite-400">{timeAgo(c.createdAt)}</span>
                      <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                        className="text-[10px] text-cyan hover:underline">edit</button>
                      <button onClick={() => del(c.id)} className="text-[10px] text-red-500 hover:underline">×</button>
                    </div>
                  </div>
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-1">
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2}
                        className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-900 dark:text-white" />
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="text-[10px] px-2 py-0.5 rounded bg-cyan text-white">Save</button>
                        <button onClick={() => { setEditingId(null); setEditBody(""); }}
                          className="text-[10px] px-2 py-0.5 rounded text-graphite-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{renderBody(c.body)}</div>
                  )}
                  <Reactions commentId={c.id} commentType="job" initialReactions={c.reactions} />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-1 pt-2 border-t border-graphite-100 dark:border-graphite-800">
            <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={2}
              placeholder="Add a comment..."
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post(); }}
              className="w-full text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-900 dark:text-white" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-graphite-400">⌘+Enter to post</span>
              <button onClick={post} disabled={!newBody.trim() || posting}
                className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold disabled:bg-graphite-300">
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
