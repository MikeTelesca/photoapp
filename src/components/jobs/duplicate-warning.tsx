"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Match { id: string; address: string; dropboxUrl?: string; status: string; createdAt: string; totalPhotos: number; }

interface Props {
  address: string;
  dropboxUrl?: string;
}

export function DuplicateWarning({ address, dropboxUrl }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasAddress = address && address.length >= 5;
    const hasUrl = dropboxUrl && dropboxUrl.length > 10;
    if (!hasAddress && !hasUrl) { setMatches([]); return; }

    // Detect paste: if dropboxUrl is suddenly long, check immediately
    const isPaste = dropboxUrl && dropboxUrl.length > 30 && dropboxUrl.startsWith("http");
    const delay = isPaste ? 50 : 500;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (hasAddress) params.set("address", address);
        if (hasUrl) params.set("dropboxUrl", dropboxUrl);
        const res = await fetch(`/api/jobs/check-duplicate?${params}`);
        const data = await res.json();
        setMatches(data.matches || []);
      } catch {
        setMatches([]);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [address, dropboxUrl]);

  if (dismissed || matches.length === 0) return null;

  const exactUrlMatch = matches.find(m => dropboxUrl && m.dropboxUrl === dropboxUrl);

  return (
    <div className={`rounded p-3 text-xs ${
      exactUrlMatch
        ? "bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800"
        : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
    }`}>
      <div className="flex justify-between items-start mb-1">
        <strong className={exactUrlMatch ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}>
          {exactUrlMatch ? "🛑 Exact Dropbox URL match!" : "⚠ Possible duplicate"}
        </strong>
        <button onClick={() => setDismissed(true)} className={`text-base leading-none opacity-70 ${
          exactUrlMatch ? "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" : "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
        }`}>×</button>
      </div>
      <div className={exactUrlMatch ? "text-red-700 dark:text-red-300 mb-2" : "text-amber-700 dark:text-amber-300 mb-2"}>
        {exactUrlMatch
          ? "This exact Dropbox URL was already used:"
          : `You have ${matches.length} recent job${matches.length === 1 ? "" : "s"} with similar address:`
        }
      </div>
      <ul className="space-y-1">
        {matches.map(m => (
          <li key={m.id} className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Link href={`/review/${m.id}`} className="text-cyan hover:underline truncate">{m.address}</Link>
              {m.dropboxUrl === dropboxUrl && m.dropboxUrl && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">same Dropbox URL</span>}
            </div>
            <span className={`flex-shrink-0 text-[11px] ${exactUrlMatch ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>{m.status} · {m.totalPhotos} photos · {new Date(m.createdAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <div className={`mt-2 text-[11px] ${exactUrlMatch ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
        {exactUrlMatch ? "You can still create a new job — this may be a re-run." : "You can still continue — this is just a heads-up."}
      </div>
    </div>
  );
}
