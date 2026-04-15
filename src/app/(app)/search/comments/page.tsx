"use client";
import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export default function CommentsSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ jobComments: any[]; photoComments: any[] }>({ jobComments: [], photoComments: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const total = results.jobComments.length + results.photoComments.length;

  return (
    <>
      <Topbar title="Search comments" />
      <div className="p-6 space-y-4">
        <Card>
          <div className="p-4 flex gap-2">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
              placeholder="Search internal & client comments..."
              className="flex-1 text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
            <button onClick={search} disabled={loading || q.length < 2}
              className="text-xs px-4 py-2 rounded bg-cyan text-white font-semibold">
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </Card>

        {searched && (
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 mb-3">{total} comment{total === 1 ? "" : "s"}</div>
              {results.jobComments.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-2">Internal comments ({results.jobComments.length})</h3>
                  <ul className="space-y-2">
                    {results.jobComments.map((c: any) => (
                      <li key={c.id} className="border-l-2 border-cyan pl-3 py-1">
                        <Link href={`/review/${c.jobId}`} className="text-xs text-cyan hover:underline font-medium">{c.jobAddress}</Link>
                        <div className="text-xs text-graphite-400 mt-0.5">{c.author} · {new Date(c.createdAt).toLocaleString()}</div>
                        <div className="text-sm dark:text-graphite-200 whitespace-pre-wrap">{c.body}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.photoComments.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-2">Client comments ({results.photoComments.length})</h3>
                  <ul className="space-y-2">
                    {results.photoComments.map((c: any) => (
                      <li key={c.id} className="border-l-2 border-amber-400 pl-3 py-1">
                        <Link href={`/review/${c.jobId}?photo=${c.photoId}`} className="text-xs text-cyan hover:underline font-medium">{c.jobAddress}</Link>
                        <div className="text-xs text-graphite-400 mt-0.5">{c.authorName} (client) · {new Date(c.createdAt).toLocaleString()}</div>
                        <div className="text-sm dark:text-graphite-200 whitespace-pre-wrap">{c.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {total === 0 && <div className="text-center py-8 text-sm text-graphite-400">No comments match</div>}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
