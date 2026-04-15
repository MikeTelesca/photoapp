"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast";

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  async function submit() {
    setError("");
    if (confirmation !== "DELETE") {
      setError("Type DELETE to confirm");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", "Account deleted. Signing out...");
        await signOut({ callbackUrl: "/" });
      } else {
        setError(data.error || "Failed");
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 py-1.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          Delete my account
        </button>
        <p className="text-[11px] text-graphite-400 mt-1">
          This will permanently remove your account and all data. This cannot be undone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 border border-red-300 dark:border-red-700 rounded bg-red-50/50 dark:bg-red-900/10">
      <h3 className="text-sm font-bold text-red-700 dark:text-red-300">⚠ Permanently delete your account</h3>
      <p className="text-xs text-red-600 dark:text-red-400">
        This will delete your jobs, photos, clients, presets, templates, and all settings. Files in your Dropbox are NOT deleted (you'll need to remove those manually).
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Your password"
        className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white bg-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
      />
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
        placeholder="Type DELETE to confirm"
        className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white bg-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
      />
      {error && <div className="text-xs text-red-500 font-semibold">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            setOpen(false);
            setPassword("");
            setConfirmation("");
            setError("");
          }}
          className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 text-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800/50 transition"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting || confirmation !== "DELETE" || !password}
          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition"
        >
          {submitting ? "Deleting..." : "Delete account"}
        </button>
      </div>
    </div>
  );
}
