"use client";

import { useState } from "react";

export function ReferralCard({
  code,
  referredByName,
}: {
  code: string | null;
  referredByName: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-3">
      {code ? (
        <div>
          <p className="text-xs text-graphite-500 dark:text-graphite-400 mb-2">
            Share this code with friends. When they sign up with it, you'll be credited as their referrer.
          </p>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 bg-graphite-50 dark:bg-graphite-800 font-mono text-lg font-semibold tracking-wider text-graphite-900 dark:text-white">
              {code}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg bg-cyan text-white text-xs font-semibold hover:opacity-90 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-graphite-400">No referral code assigned.</p>
      )}
      {referredByName && (
        <p className="text-xs text-graphite-500 dark:text-graphite-400">
          Invited you: <span className="font-semibold text-graphite-700 dark:text-graphite-200">{referredByName}</span>
        </p>
      )}
    </div>
  );
}
