"use client";
import { useState, useEffect } from "react";

export function ShareButton({
  jobId,
  initialToken,
  initialEnabled,
}: {
  jobId: string;
  initialToken: string | null;
  initialEnabled: boolean;
}) {
  const [token, setToken] = useState(initialToken);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [copied, setCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<{ id: string; toEmail: string; sentAt: string }[]>([]);

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
    const password = window.prompt("New password (blank to remove):");
    if (password === null) return;
    await fetch(`/api/jobs/${jobId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    alert(password ? "Password set" : "Password removed");
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
      const res = await fetch(`/api/jobs/${jobId}/share/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo, password: emailPw, personalMessage: emailMsg }),
      });
      const data = await res.json();
      if (data.ok) {
        setSentTo(emailTo);
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
        alert("Failed to send");
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
        <button
          onClick={() => setEmailOpen(true)}
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold hover:bg-cyan-600"
        >
          ✉ Email to client
        </button>
        <button
          onClick={setPassword}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        >
          🔒 Set password
        </button>
        <button
          onClick={disable}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        >
          Disable
        </button>
      </div>
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
                      onClick={() => quickResend(r.toEmail)}
                      className="text-xs px-2 py-1 rounded bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-300 hover:bg-graphite-200 dark:hover:bg-graphite-700"
                      title={`Last sent ${new Date(r.sentAt).toLocaleString()}`}
                    >
                      ↺ {r.toEmail}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              type="email"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="client@example.com"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
            />
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
                disabled={!emailTo || sending}
                className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
