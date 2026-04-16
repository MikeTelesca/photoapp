"use client";

import { useState } from "react";

type Props = {
  refreshToken: string | null;
  accessToken: string | null;
  error: string | null;
};

// Client-side helpers (copy button + reveal toggle) for the tokens returned
// by the Dropbox OAuth callback. Tokens are never persisted — the user is
// instructed to paste them into Vercel env vars themselves.
export function DropboxTokensPanel({ refreshToken, accessToken, error }: Props) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 px-5 py-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-red-400 mb-1">
          OAuth failed
        </div>
        <p className="text-sm text-red-200">
          Dropbox returned: <span className="font-mono">{error}</span>
        </p>
      </div>
    );
  }

  if (!refreshToken) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-950/30 border border-emerald-900/60 px-5 py-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 mb-1">
          Connected
        </div>
        <p className="text-sm text-emerald-100">
          Copy the refresh token below and paste it into Vercel env vars as{" "}
          <span className="font-mono text-emerald-200">DROPBOX_REFRESH_TOKEN</span>. The app will
          auto-rotate the short-lived access token after that.
        </p>
      </div>

      <TokenBlock label="DROPBOX_REFRESH_TOKEN" value={refreshToken} primary />
      {accessToken && <TokenBlock label="DROPBOX_ACCESS_TOKEN (fallback)" value={accessToken} />}

      <ol className="text-sm text-graphite-300 space-y-2 list-decimal list-inside pl-1">
        <li>Copy the refresh token above.</li>
        <li>
          Open the{" "}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-cyan hover:underline"
          >
            Vercel dashboard
          </a>
          , find this project, open <span className="text-white font-medium">Settings → Environment Variables</span>.
        </li>
        <li>
          Add <span className="font-mono text-white">DROPBOX_REFRESH_TOKEN</span> for Production,
          Preview, and Development. Paste the token as the value.
        </li>
        <li>Redeploy the project (or wait for the next deploy).</li>
      </ol>
    </div>
  );
}

function TokenBlock({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* no-op — browsers without clipboard access */
    }
  }

  const masked = "•".repeat(Math.min(36, value.length));

  return (
    <div
      className={`rounded-2xl border ${
        primary ? "border-cyan/40 bg-cyan/5" : "border-graphite-800 bg-graphite-950"
      } p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-graphite-400 font-mono">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="text-[11px] text-graphite-400 hover:text-white"
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
          <button
            type="button"
            onClick={copy}
            className="h-7 px-3 rounded-lg bg-cyan text-graphite-950 text-[11px] font-semibold hover:bg-cyan-400 transition"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
      <div className="font-mono text-[12px] break-all text-white">
        {revealed ? value : masked}
      </div>
    </div>
  );
}
