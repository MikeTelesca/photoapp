"use client";
import { useState, useEffect } from "react";
import { ShareAnalyticsModal } from "./share-analytics-modal";

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ShareButton({
  jobId,
  initialToken,
  initialEnabled,
  shareViewCount,
  shareLastViewedAt,
  initialPasswordSet,
  initialExpiresAt,
}: {
  jobId: string;
  initialToken: string | null;
  initialEnabled: boolean;
  shareViewCount?: number;
  shareLastViewedAt?: string | null;
  initialPasswordSet?: boolean;
  initialExpiresAt?: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [passwordSet, setPasswordSet] = useState(!!initialPasswordSet);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt ?? null);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<{ id: string; toEmail: string; sentAt: string; openedAt?: string; openCount?: number }[]>([]);

  useEffect(() => {
    if (!emailOpen) return;
    fetch(`/api/jobs/${jobId}/share/recipients`)
      .then(r => r.json())
      .then(data => {
        setRecipients(data.recipients || []);
      })
      .catch(() => {});
  }, [emailOpen, jobId]);

  async function enable() {
    const password = window.prompt("Optional password for this share link (leave blank for no password):");
    if (password === null) return;
    const res = await fetch(`/api/jobs/${jobId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password || "" }),
    });
    const data = await res.json();
    setToken(data.token);
    setEnabled(true);
  }

  async function setPassword() {
    const password = window.prompt(
      passwordSet
        ? "Change password (leave blank to remove):"
        : "New password (blank to remove):"
    );
    if (password === null) return;
    const res = await fetch(`/api/jobs/${jobId}/share/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password || null }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setPasswordSet(!!data.passwordSet);
      alert(data.passwordSet ? "Password set" : "Password removed");
    } else {
      alert("Failed to update password");
    }
  }

  async function saveExpiry(iso: string | null) {
    setSavingExpiry(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/share/expiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: iso }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setExpiresAt(data.shareExpiresAt ?? null);
        setExpiryOpen(false);
        setCustomDate("");
      } else {
        alert("Failed to update expiry");
      }
    } finally {
      setSavingExpiry(false);
    }
  }

  async function disable() {
    await fetch(`/api/jobs/${jobId}/share`, { method: "DELETE" });
    setEnabled(false);
  }

  async function copy() {
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function quickResend(email: string) {
    setEmailTo(email);
  }

  async function sendShareEmail() {
    if (!emailTo) return;
    setSending(true);
    try {
      // Parse multiple emails from textarea
      const emails = emailTo
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.includes("@"));

      if (emails.length === 0) {
        alert("No valid email addresses found");
        return;
      }

      const res = await fetch(`/api/jobs/${jobId}/share/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emails, password: emailPw, personalMessage: emailMsg }),
      });
      const data = await res.json();
      if (data.ok) {
        setSentTo(`${data.sent} recipient${data.sent === 1 ? "" : "s"}`);
        setEmailOpen(false);
        setEmailTo("");
        setEmailPw("");
        setEmailMsg("");
        setTimeout(() => setSentTo(null), 3000);
        fetch(`/api/jobs/${jobId}/share/recipients`)
          .then(r => r.json())
          .then(data => setRecipients(data.recipients || []))
          .catch(() => {});
      } else {
        alert(data.error || "Failed to send");
      }
    } finally {
      setSending(false);
    }
  }

  if (!enabled) {
    return (
      <button
        onClick={enable}
        className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      >
        Share with client
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a
          href={`/share/${token}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        >
          👁 Preview as client
        </a>
        <button
          onClick={() => setEmailOpen(true)}
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold hover:bg-cyan-600"
        >
          ✉ Email to client
        </button>
        <button
          onClick={setPassword}
          title={passwordSet ? "Password is set — click to change or remove" : "No password set — click to add one"}
          className={`text-xs px-3 py-1.5 rounded border ${
            passwordSet
              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              : "border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
          }`}
        >
          🔒 Password{passwordSet ? " (set)" : ""}
        </button>
        <button
          onClick={() => setExpiryOpen(true)}
          title={expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : "No expiry"}
          className={`text-xs px-3 py-1.5 rounded border ${
            expiresAt
              ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              : "border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
          }`}
        >
          ⏰ {expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString()}` : "Set expiry"}
        </button>
        <button
          onClick={() => setAnalyticsOpen(true)}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        >
          📊 Analytics
        </button>
        <button
          onClick={disable}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        >
          Disable
        </button>
      </div>
      {enabled && shareViewCount !== undefined && (
        <span className="text-xs text-graphite-500 dark:text-graphite-400">
          👁 {shareViewCount} view{shareViewCount === 1 ? "" : "s"}
          {shareLastViewedAt && ` · last ${formatTimeAgo(new Date(shareLastViewedAt))}`}
        </span>
      )}

      {sentTo && (
        <span className="text-xs text-emerald-600 font-semibold">Sent to {sentTo} ✓</span>
      )}

      {emailOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEmailOpen(false)}
        >
          <div
            className="bg-white dark:bg-graphite-900 rounded-lg p-6 max-w-md w-full space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold dark:text-white">Email share link</h2>
            
            {recipients.length > 0 && (
              <div className="mb-3 pb-3 border-b border-graphite-100 dark:border-graphite-800">
                <div className="text-[11px] font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-1">
                  Previously sent to
                </div>
                <div className="flex flex-wrap gap-1">
                  {recipients.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (!emailTo.includes(r.toEmail)) {
                          setEmailTo(prev => prev ? `${prev}\n${r.toEmail}` : r.toEmail);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-300 hover:bg-graphite-200 dark:hover:bg-graphite-700"
                      title={r.openedAt ? `Opened ${r.openCount || 1} time(s) — last ${new Date(r.openedAt).toLocaleString()}` : "Not opened yet"}
                    >
                      {r.openedAt ? "✉️" : "📧"} {r.toEmail}
                      {(r.openCount || 0) > 1 && <span className="ml-1 text-[9px] text-emerald-600">×{r.openCount}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="client@example.com&#10;another@example.com"
              rows={3}
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
            />
            <div className="text-[10px] text-graphite-400 dark:text-graphite-500">One per line, or comma-separated. Max 20 at once.</div>
            <input
              type="text"
              value={emailPw}
              onChange={e => setEmailPw(e.target.value)}
              placeholder="Password (if set on share link)"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
            />
            <textarea
              value={emailMsg}
              onChange={e => setEmailMsg(e.target.value)}
              placeholder="Personal message (optional)"
              rows={3}
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEmailOpen(false)}
                className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"
              >
                Cancel
              </button>
              <button
                onClick={sendShareEmail}
                disabled={!emailTo.trim() || sending}
                className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {expiryOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !savingExpiry && setExpiryOpen(false)}
        >
          <div
            className="bg-white dark:bg-graphite-900 rounded-lg p-6 max-w-sm w-full space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold dark:text-white">Share link expiry</h2>
            {expiresAt ? (
              <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded px-2 py-1.5">
                Current expiry: {new Date(expiresAt).toLocaleString()}
                {new Date(expiresAt) < new Date() && " (expired)"}
              </div>
            ) : (
              <div className="text-xs text-graphite-500 dark:text-graphite-400">
                No expiry set — link never expires.
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                disabled={savingExpiry}
                onClick={() => saveExpiry(null)}
                className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800 text-left disabled:opacity-50"
              >
                No expiry
              </button>
              <button
                disabled={savingExpiry}
                onClick={() => saveExpiry(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())}
                className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800 text-left disabled:opacity-50"
              >
                24 hours
              </button>
              <button
                disabled={savingExpiry}
                onClick={() => saveExpiry(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}
                className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800 text-left disabled:opacity-50"
              >
                7 days
              </button>
              <button
                disabled={savingExpiry}
                onClick={() => saveExpiry(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())}
                className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800 text-left disabled:opacity-50"
              >
                30 days
              </button>
              <div className="pt-2 border-t border-graphite-100 dark:border-graphite-800">
                <label className="text-[11px] font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide">
                  Custom date
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="flex-1 text-sm px-2 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
                  />
                  <button
                    disabled={savingExpiry || !customDate}
                    onClick={() => {
                      const d = new Date(customDate);
                      if (isNaN(d.getTime())) {
                        alert("Invalid date");
                        return;
                      }
                      saveExpiry(d.toISOString());
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold disabled:opacity-50"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                disabled={savingExpiry}
                onClick={() => setExpiryOpen(false)}
                className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareAnalyticsModal jobId={jobId} open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
    </div>
  );
}
