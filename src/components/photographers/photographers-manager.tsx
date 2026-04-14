"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  jobCount: number;
  createdAt: string;
}

export function PhotographersManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("photographer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => [...prev, { ...data, jobCount: 0 }]);
        setShowNew(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("photographer");
      } else {
        setError(data.error || "Failed to create user");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user? Their jobs will remain.")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* User list */}
      <Card>
        <div className="divide-y divide-graphite-100">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  user.role === "admin"
                    ? "bg-gradient-to-br from-graphite-900 to-graphite-700"
                    : "bg-gradient-to-br from-cyan to-cyan-light"
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-graphite-900">{user.name}</div>
                  <div className="text-xs text-graphite-400">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  user.role === "admin"
                    ? "bg-graphite-100 text-graphite-700"
                    : "bg-cyan-50 text-cyan"
                }`}>
                  {user.role}
                </span>
                <span className="text-xs text-graphite-400">{user.jobCount} jobs</span>
                {user.role !== "admin" && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-1.5 text-graphite-400 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-graphite-400">
              No users yet
            </div>
          )}
        </div>
      </Card>

      {/* Add new user */}
      {showNew ? (
        <Card>
          <div className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-graphite-900">Add Photographer</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan"
              placeholder="Full name"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan"
              placeholder="Email address"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan"
              placeholder="Password"
            />
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="role"
                  value="photographer"
                  checked={role === "photographer"}
                  onChange={() => setRole("photographer")}
                />
                Photographer
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === "admin"}
                  onChange={() => setRole("admin")}
                />
                Admin
              </label>
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving || !name.trim() || !email.trim() || !password.trim()}>
                {saving ? "Creating..." : "Create User"}
              </Button>
              <Button variant="outline" onClick={() => { setShowNew(false); setError(""); }}>Cancel</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowNew(true)}>
          <UserPlusIcon className="w-4 h-4" />
          Add Photographer
        </Button>
      )}
    </div>
  );
}
