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
    }, 500);
    return () => clearTimeout(timer);
  }, [address, dropboxUrl]);

  if (dismissed || matches.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 text-xs">
      <div className="flex justify-between items-start mb-1">
        <strong className="text-amber-800 dark:text-amber-200">⚠ Possible duplicate</strong>
        <button onClick={() => setDismissed(true)} className="text-amber-600 dark:text-amber-400 text-base leading-none hover:text-amber-700 dark:hover:text-amber-300">×</button>
      </div>
      <div className="text-amber-700 dark:text-amber-300 mb-2">
        You have {matches.length} recent job{matches.length === 1 ? "" : "s"} with similar address:
      </div>
      <ul className="space-y-1">
        {matches.map(m => (
          <li key={m.id} className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Link href={`/review/${m.id}`} className="text-cyan hover:underline truncate">{m.address}</Link>
              {m.dropboxUrl === dropboxUrl && m.dropboxUrl && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">same Dropbox URL</span>}
            </div>
            <span className="text-amber-600 dark:text-amber-400 flex-shrink-0 text-[11px]">{m.status} · {m.totalPhotos} photos · {new Date(m.createdAt).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <div className="text-amber-600 dark:text-amber-400 mt-2 text-[11px]">You can still continue — this is just a heads-up.</div>
    </div>
  );
}
