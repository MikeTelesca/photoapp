"use client";

import { useState } from "react";

interface Props {
  templateKey: string;
}

export function EmailTemplateRowActions({ templateKey }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const previewUrl = `/api/admin/email-templates/${encodeURIComponent(templateKey)}/preview`;

  async function handleTestSend() {
    const to = window.prompt("Send test email to:");
    if (!to) return;
    const trimmed = to.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${encodeURIComponent(templateKey)}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(`Failed: ${data?.error || res.statusText}`);
      } else if (data?.sent === false) {
        window.alert("Resend is not configured (no RESEND_API_KEY). Nothing was actually sent.");
      } else {
        window.alert(`Sent test to ${trimmed}`);
      }
    } catch (err) {
      window.alert(`Failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-graphite-200 transition-colors"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={handleTestSend}
          disabled={sending}
          className="text-xs px-3 py-1.5 rounded bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending…" : "Send test"}
        </button>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white dark:bg-graphite-900 rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-graphite-100 dark:border-graphite-800">
              <div className="text-sm font-semibold text-graphite-900 dark:text-white">
                Preview: <span className="font-mono text-xs text-graphite-500">{templateKey}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-xs px-2 py-1 rounded hover:bg-graphite-100 dark:hover:bg-graphite-800 text-graphite-500"
              >
                Close
              </button>
            </div>
            <iframe
              src={previewUrl}
              title={`Preview of ${templateKey}`}
              className="flex-1 w-full bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
