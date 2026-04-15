"use client";
import { useState } from "react";

export function TwoFactorForm({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [status, setStatus] = useState("");

  async function startSetup() {
    setStatus("");
    const res = await fetch("/api/user/2fa/setup", { method: "POST" });
    const data = await res.json();
    if (res.ok) setSetupData(data);
    else setStatus(data.error || "Failed to start setup");
  }

  async function verify() {
    if (!setupData || !code) return;
    const res = await fetch("/api/user/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: setupData.secret, code }),
    });
    const data = await res.json();
    if (res.ok) {
      setEnabled(true);
      setSetupData(null);
      setCode("");
      setStatus("2FA enabled");
    } else {
      setStatus(data.error || "Invalid code");
    }
  }

  async function disable() {
    const res = await fetch("/api/user/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setEnabled(false);
      setDisablePassword("");
      setStatus("2FA disabled");
    } else {
      setStatus(data.error || "Failed");
    }
  }

  const qrUrl = setupData?.otpauthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUrl)}`
    : null;

  if (enabled) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">2FA is enabled</div>
        <div className="text-xs text-graphite-500 dark:text-graphite-400">To disable, enter your password:</div>
        <div className="flex gap-2">
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Password"
            className="text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
          />
          <button
            onClick={disable}
            className="text-xs px-3 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
          >
            Disable
          </button>
        </div>
        {status && <div className="text-xs text-graphite-500 dark:text-graphite-400">{status}</div>}
      </div>
    );
  }

  if (setupData) {
    return (
      <div className="space-y-3">
        <div className="text-xs dark:text-white">Scan this QR code with Google Authenticator or Authy:</div>
        {qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="2FA QR code" className="border rounded" width={200} height={200} />
        )}
        <div className="text-[11px] text-graphite-500 dark:text-graphite-400 font-mono break-all">
          Or enter manually: {setupData.secret}
        </div>
        <div className="flex gap-2 items-center mt-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            maxLength={6}
            className="text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono w-32"
          />
          <button
            onClick={verify}
            className="text-xs px-3 py-2 rounded bg-cyan text-white font-semibold hover:opacity-90 transition"
          >
            Verify &amp; enable
          </button>
        </div>
        {status && <div className="text-xs text-red-500">{status}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Add two-factor authentication with an authenticator app for extra security.
      </div>
      <button
        onClick={startSetup}
        className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold hover:opacity-90 transition"
      >
        Enable 2FA
      </button>
      {status && <div className="text-xs text-graphite-500 dark:text-graphite-400">{status}</div>}
    </div>
  );
}
