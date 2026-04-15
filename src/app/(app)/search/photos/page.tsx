"use client";
import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface PhotoResult {
  id: string;
  jobId: string;
  editedUrl?: string | null;
  originalUrl?: string | null;
  caption?: string | null;
  autoTags?: string | null;
  tags?: string | null;
  exifData?: string | null;
  job: { address: string };
}

export default function PhotoSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PhotoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/photos/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.photos || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="Photo search" />
      <div className="p-6 space-y-4">
        <Card>
          <div className="p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") search();
                }}
                placeholder='Search by caption, tags, or EXIF (camera, lens, "kitchen", "Sony A7", etc.)'
                className="flex-1 text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
              />
              <button
                onClick={search}
                disabled={loading || q.length < 2}
                className="text-xs px-4 py-2 rounded bg-cyan text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </Card>

        {searched && (
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 mb-3">
                {results.length} photo{results.length === 1 ? "" : "s"}
              </div>
              {results.length === 0 ? (
                <div className="text-center py-8 text-sm text-graphite-400">
                  No photos match
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/review/${p.jobId}?photo=${p.id}`}
                      className="block rounded overflow-hidden border border-graphite-100 dark:border-graphite-800 hover:border-cyan transition-colors"
                    >
                      {(p.editedUrl || p.originalUrl) && (
                        <img
                          src={p.editedUrl || p.originalUrl || ""}
                          alt=""
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-2 text-xs">
                        <div className="font-semibold text-graphite-800 dark:text-graphite-200 truncate">
                          {p.job.address}
                        </div>
                        {p.caption && (
                          <div className="text-graphite-500 dark:text-graphite-400 truncate">
                            {p.caption}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
