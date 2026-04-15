"use client";
import { useState } from "react";

export function PasswordGate({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        setErr(data.error || "Wrong password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full space-y-3"
      >
        <h1 className="text-xl font-bold">Password required</h1>
        <p className="text-sm text-graphite-600">
          This photo gallery is password-protected. Enter the password you received from the photographer.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          placeholder="Password"
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200"
        />
        {err && <div className="text-xs text-red-500">{err}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full text-sm px-4 py-2 rounded bg-cyan text-white font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
