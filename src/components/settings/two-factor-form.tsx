"use client";
import { useState } from "react";

type SetupData = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
  backupCodes: string[];
};

export function TwoFactorForm({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [status, setStatus] = useState("");
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setStatus("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSetupData(data);
        setBackupAcknowledged(false);
      } else {
        setStatus(data.error || "Failed to start setup");
      }
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!setupData || !code) return;
    if (!backupAcknowledged) {
      setStatus("Please save your backup codes and check the confirmation box.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: setupData.secret,
          code,
          backupCodes: setupData.backupCodes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(true);
        setSetupData(null);
        setCode("");
        setStatus("2FA enabled successfully.");
      } else {
        setStatus(data.error || "Invalid code");
      }
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    if (!disablePassword) {
      setStatus("Enter your password to disable 2FA.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(false);
        setDisablePassword("");
        setStatus("2FA disabled.");
      } else {
        setStatus(data.error || "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCodes() {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.backupCodes.join("\n")).then(
      () => setStatus("Backup codes copied to clipboard."),
      () => setStatus("Could not copy. Please write them down manually."),
    );
  }

  function downloadBackupCodes() {
    if (!setupData) return;
    const blob = new Blob(
      [
        `ATH Editor — Two-Factor Backup Codes\nGenerated ${new Date().toISOString()}\n\n` +
          setupData.backupCodes.join("\n") +
          `\n\nEach code may be used once. Keep them somewhere safe.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ath-editor-2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            2FA is active
          </span>
        </div>
        <div className="text-xs text-graphite-500 dark:text-graphite-400">
          Your account requires a 6-digit code from your authenticator on sign-in.
          To disable 2FA, confirm your password:
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Current password"
            className="text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
          />
          <button
            onClick={disable}
            disabled={loading}
            className="text-xs px-3 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? "Disabling…" : "Disable 2FA"}
          </button>
        </div>
        {status && (
          <div className="text-xs text-graphite-500 dark:text-graphite-400">{status}</div>
        )}
      </div>
    );
  }

  if (setupData) {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold dark:text-white mb-2">
            1. Scan with Google Authenticator, 1Password, or Authy
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setupData.qrDataUrl}
            alt="2FA QR code"
            className="border rounded bg-white p-2"
            width={200}
            height={200}
          />
          <div className="text-[11px] text-graphite-500 dark:text-graphite-400 font-mono break-all mt-2">
            Can&apos;t scan? Enter manually: <strong>{setupData.secret}</strong>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold dark:text-white mb-2">
            2. Save your backup codes
          </div>
          <div className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-2">
            Store these somewhere safe. Each code works once if you lose access to your authenticator.
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-graphite-50 dark:bg-graphite-800 p-3 rounded border border-graphite-200 dark:border-graphite-700 font-mono text-[12px]">
            {setupData.backupCodes.map((c) => (
              <div key={c} className="dark:text-graphite-200">{c}</div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={copyBackupCodes}
              className="text-[11px] px-2.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={downloadBackupCodes}
              className="text-[11px] px-2.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
            >
              Download .txt
            </button>
          </div>
          <label className="flex items-center gap-2 mt-2 text-[11px] text-graphite-600 dark:text-graphite-300">
            <input
              type="checkbox"
              checked={backupAcknowledged}
              onChange={(e) => setBackupAcknowledged(e.target.checked)}
            />
            I&apos;ve saved these backup codes.
          </label>
        </div>

        <div>
          <div className="text-xs font-semibold dark:text-white mb-2">
            3. Enter the 6-digit code from your authenticator
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              maxLength={6}
              className="text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono w-32 tracking-widest"
            />
            <button
              onClick={verify}
              disabled={loading || code.length !== 6 || !backupAcknowledged}
              className="text-xs px-3 py-2 rounded bg-cyan text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify & enable"}
            </button>
            <button
              onClick={() => {
                setSetupData(null);
                setCode("");
                setStatus("");
              }}
              className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
            >
              Cancel
            </button>
          </div>
        </div>

        {status && (
          <div className="text-xs text-red-500">{status}</div>
        )}
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
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Setting up…" : "Enable 2FA"}
      </button>
      {status && (
        <div className="text-xs text-graphite-500 dark:text-graphite-400">{status}</div>
      )}
    </div>
  );
}
