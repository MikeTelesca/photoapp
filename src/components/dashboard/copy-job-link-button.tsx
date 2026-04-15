"use client";
import { useState } from "react";

export function CopyJobLinkButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/review/${jobId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button onClick={copy}
      className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      title="Copy review link to clipboard">
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
