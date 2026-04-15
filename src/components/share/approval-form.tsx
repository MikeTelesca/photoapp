"use client";

import { useState } from "react";

interface ApprovalFormProps {
  token: string;
  initialStatus?: string | null;
}

export function ApprovalForm({ token, initialStatus }: ApprovalFormProps) {
  const [mode, setMode] = useState<"idle" | "approve" | "request_changes">("idle");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(initialStatus ?? null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "request_changes") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong");
        return;
      }
      setStatus(action === "approve" ? "approved" : "changes_requested");
      setMode("idle");
      setNote("");
    } catch {
      setError("Network error, please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "approved") {
    return (
      <div className="max-w-2xl mx-auto px-4 my-10 text-center">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-lg font-bold text-emerald-900">Thanks — you approved this gallery!</div>
          <p className="text-sm text-emerald-700 mt-1">
            The photographer has been notified.
          </p>
        </div>
      </div>
    );
  }

  if (status === "changes_requested") {
    return (
      <div className="max-w-2xl mx-auto px-4 my-10 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-lg font-bold text-amber-900">Your change request was sent.</div>
          <p className="text-sm text-amber-700 mt-1">
            The photographer has been notified and will follow up shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 my-10">
      <div className="bg-white rounded-lg shadow-sm border border-graphite-200 p-6">
        <h2 className="text-lg font-bold text-graphite-900 text-center mb-1">
          How does this gallery look?
        </h2>
        <p className="text-sm text-graphite-500 text-center mb-5">
          Let the photographer know if you approve or want changes.
        </p>

        {mode === "idle" && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setMode("approve")}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              ✅ Approve
            </button>
            <button
              onClick={() => setMode("request_changes")}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
            >
              📝 Request Changes
            </button>
          </div>
        )}

        {mode !== "idle" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-graphite-700">
              {mode === "approve"
                ? "Add an optional note for the photographer"
                : "Tell the photographer what needs to change"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={
                mode === "approve"
                  ? "Looks great, thanks!"
                  : "e.g. Please brighten the living room photos."
              }
              className="w-full px-3 py-2 border border-graphite-200 rounded-md text-sm focus:outline-none focus:border-cyan"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setMode("idle");
                  setNote("");
                  setError(null);
                }}
                disabled={submitting}
                className="px-4 py-2 rounded-md border border-graphite-200 text-sm text-graphite-700 hover:bg-graphite-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submit(mode)}
                disabled={submitting}
                className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${
                  mode === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-500 hover:bg-amber-600"
                } disabled:opacity-50`}
              >
                {submitting
                  ? "Sending..."
                  : mode === "approve"
                  ? "Confirm Approval"
                  : "Send Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
