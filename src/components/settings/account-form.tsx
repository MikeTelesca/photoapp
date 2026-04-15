"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Props {
  initialName: string;
  email: string;
  role: string;
}

export function AccountForm({ initialName, email, role }: Props) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { addToast } = useToast();

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        addToast("success", "Name updated");
      } else {
        const data = await res.json();
        addToast("error", data.error || "Failed to update name");
      }
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("error", "New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      addToast("error", "Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        addToast("success", "Password changed");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        addToast("error", data.error || "Failed to change password");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSaveName} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm bg-graphite-50 dark:bg-graphite-900 text-graphite-500 dark:text-graphite-400"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block">Role</label>
          <input
            type="text"
            value={role}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm bg-graphite-50 dark:bg-graphite-900 text-graphite-500 dark:text-graphite-400 capitalize"
          />
        </div>
        <Button type="submit" disabled={savingName || name === initialName}>
          {savingName ? "Saving..." : "Save Name"}
        </Button>
      </form>

      <hr className="border-graphite-200 dark:border-graphite-700" />

      <form onSubmit={handleChangePassword} className="space-y-3">
        <h4 className="text-sm font-bold text-graphite-900 dark:text-white">Change Password</h4>
        <div>
          <label className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white text-sm focus:outline-none focus:border-cyan"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white text-sm focus:outline-none focus:border-cyan"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white text-sm focus:outline-none focus:border-cyan"
            required
          />
        </div>
        <Button type="submit" disabled={savingPassword || !currentPassword || !newPassword}>
          {savingPassword ? "Saving..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}
