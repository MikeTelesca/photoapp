"use client";
import { useState } from "react";

export function ShareContactForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(typeof window !== "undefined" ? localStorage.getItem("share-commenter-name") || "" : "");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromName: name, fromEmail: email, message }),
      });
      if (res.ok) {
        setSent(true);
        if (typeof window !== "undefined") localStorage.setItem("share-commenter-name", name);
        setMessage("");
        setTimeout(() => { setSent(false); setOpen(false); }, 3000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded border border-graphite-300 bg-white hover:bg-graphite-50">
        💬 Request changes or ask a question
      </button>
    );
  }

  return (
    <div className="bg-white border border-graphite-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-graphite-900 mb-2">Send a message to the photographer</h3>
      {sent ? (
        <div className="text-sm text-emerald-600 font-semibold">✓ Sent — thank you! The photographer will follow up.</div>
      ) : (
        <div className="space-y-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name" required
            className="w-full text-sm px-3 py-2 rounded border border-graphite-200" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (optional, for replies)"
            className="w-full text-sm px-3 py-2 rounded border border-graphite-200" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
            placeholder="Examples: 'Photo 12 is too dark', 'Can you add a kitchen close-up?', 'Love photo 5!'"
            required
            className="w-full text-sm px-3 py-2 rounded border border-graphite-200" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)}
              className="text-xs px-3 py-1.5 rounded border border-graphite-200">Cancel</button>
            <button onClick={submit} disabled={submitting || !name.trim() || !message.trim()}
              className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold disabled:bg-graphite-300">
              {submitting ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
