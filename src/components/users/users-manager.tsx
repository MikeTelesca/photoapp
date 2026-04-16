"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

type Props = {
  initialUsers: UserRow[];
  selfId: string;
};

export function UsersManager({ initialUsers, selfId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("photographer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const msg =
          body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Failed to create user";
        throw new Error(msg);
      }
      const user: unknown = await res.json();
      if (user && typeof user === "object" && "id" in user) {
        const u = user as UserRow;
        setUsers((xs) => [...xs, u]);
      }
      setName("");
      setEmail("");
      setPassword("");
      setRole("photographer");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (id === selfId) return;
    if (!confirm("Delete this user?")) return;
    setError("");
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((xs) => xs.filter((u) => u.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  const inputCls =
    "h-9 px-3 rounded-md border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan disabled:opacity-50";
  const labelCls =
    "text-[11px] font-medium uppercase tracking-wider text-graphite-500 mb-1.5 block";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-500 mb-3">
          Add user
        </h2>
        <form
          onSubmit={onCreate}
          className="rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={`${inputCls} w-full`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={`${inputCls} w-full`}
                value={email}
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                className={`${inputCls} w-full`}
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select
                className={`${inputCls} w-full`}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="photographer">Photographer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-md bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 text-sm font-medium hover:bg-graphite-800 dark:hover:bg-graphite-100 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Add user"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-500 mb-3">
          Users ({users.length})
        </h2>
        <div className="rounded-lg border border-graphite-200 dark:border-graphite-800 overflow-hidden bg-white dark:bg-graphite-900">
          <table className="w-full text-sm">
            <thead className="bg-graphite-50 dark:bg-graphite-950 text-xs uppercase tracking-wide text-graphite-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-graphite-100 dark:border-graphite-800"
                >
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-graphite-600 dark:text-graphite-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id === selfId ? (
                      <span className="text-xs text-graphite-400">you</span>
                    ) : (
                      <button
                        onClick={() => onDelete(u.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
