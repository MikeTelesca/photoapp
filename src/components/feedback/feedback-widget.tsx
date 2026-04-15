"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<
    "bug" | "feature" | "question" | "other"
  >("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const pathname = usePathname();

  // Hide on share pages and auth
  if (
    pathname?.startsWith("/share/") ||
    pathname === "/login" ||
    pathname === "/" ||
    pathname?.startsWith("/signup")
  )
    return null;

  async function submit() {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, pageUrl: pathname }),
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
        setMessage("");
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-30 bottom-36 md:bottom-20 right-4 md:right-6 px-3 py-1.5 rounded-full bg-graphite-700 dark:bg-graphite-800 text-white text-xs shadow-lg hover:bg-graphite-800 dark:hover:bg-graphite-700"
        title="Send feedback"
      >
        💬 Feedback
      </button>
    );
  }

  return (
    <div className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 w-80 max-w-[calc(100vw-32px)] bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl">
      <div className="px-4 py-3 border-b border-graphite-100 dark:border-graphite-800 flex justify-between items-center">
        <h3 className="text-sm font-semibold dark:text-white">
          Send feedback
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-graphite-400 text-base leading-none"
        >
          ×
        </button>
      </div>
      <div className="p-4 space-y-2">
        {sent ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-1">✓</div>
            <div className="text-sm font-semibold text-emerald-600">
              Sent — thank you!
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1">
              {(["bug", "feature", "question", "other"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs px-2 py-1 rounded ${
                    category === c
                      ? "bg-cyan text-white"
                      : "border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"
                  }`}
                >
                  {c === "bug"
                    ? "🐛 Bug"
                    : c === "feature"
                      ? "💡 Feature"
                      : c === "question"
                        ? "❓ Question"
                        : "💬 Other"}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={
                category === "bug"
                  ? "What happened? What did you expect?"
                  : "Tell us more..."
              }
              className="w-full text-sm px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-graphite-400">
                Sent from {pathname}
              </span>
              <button
                onClick={submit}
                disabled={!message.trim() || submitting}
                className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
