"use client";

import { useMemo, useState } from "react";
import { RoleToggleButton } from "./role-toggle-button";
import { ImpersonateButton } from "./impersonate-button";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  rateLimitTier: string;
  twoFactorEnabled: boolean;
  createdAt: string; // ISO
  lastLoginAt: string | null; // ISO or null
  jobsCount: number;
  totalPhotos: number;
  totalCost: number;
  referralCount: number;
};

type FilterKey = "all" | "active" | "admin" | "twofa" | "banned";

const PAGE_SIZE = 25;

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active (logged in last 30d)" },
  { value: "admin", label: "Admin only" },
  { value: "twofa", label: "With 2FA" },
  { value: "banned", label: "Rate-limit banned" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      if (q) {
        const name = (u.name || "").toLowerCase();
        const email = u.email.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      switch (filter) {
        case "active": {
          if (!u.lastLoginAt) return false;
          const t = new Date(u.lastLoginAt).getTime();
          return now - t <= thirtyDaysMs;
        }
        case "admin":
          return u.role === "admin";
        case "twofa":
          return u.twoFactorEnabled;
        case "banned":
          return u.rateLimitTier === "banned";
        case "all":
        default:
          return true;
      }
    });
  }, [users, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset page if filter/search changes shrink total
  if (safePage !== page) {
    // schedule a microtask-free correction without setState-in-render loop
    setTimeout(() => setPage(safePage), 0);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-graphite-100 dark:border-graphite-800">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] max-w-sm px-3 py-2 text-sm rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterKey);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-graphite-400">
          {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800 bg-graphite-50 dark:bg-graphite-800/30">
            <tr>
              <th className="text-left py-3 px-5 font-semibold">Name</th>
              <th className="text-left py-3 px-5 font-semibold">Email</th>
              <th className="text-left py-3 px-5 font-semibold">Role</th>
              <th className="text-right py-3 px-5 font-semibold">Jobs</th>
              <th className="text-right py-3 px-5 font-semibold">Photos</th>
              <th className="text-right py-3 px-5 font-semibold">Total Cost</th>
              <th className="text-right py-3 px-5 font-semibold">Referrals</th>
              <th className="text-right py-3 px-5 font-semibold">Created</th>
              <th className="text-right py-3 px-5 font-semibold">Last Login</th>
              <th className="text-center py-3 px-5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center text-graphite-400"
                >
                  No users match your filters.
                </td>
              </tr>
            )}
            {pageRows.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <tr
                  key={user.id}
                  className="border-b border-graphite-50 dark:border-graphite-800 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800/40 transition-colors"
                >
                  <td className="py-3 px-5 font-medium text-graphite-900 dark:text-white">
                    {user.name || "—"}
                    {user.twoFactorEnabled && (
                      <span
                        className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        title="2FA enabled"
                      >
                        2FA
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-graphite-600 dark:text-graphite-300">
                    {user.email}
                  </td>
                  <td className="py-3 px-5">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-graphite-100 dark:bg-graphite-700 text-graphite-600 dark:text-graphite-300"
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.rateLimitTier === "banned" && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        banned
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                    {user.jobsCount}
                  </td>
                  <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                    {user.totalPhotos}
                  </td>
                  <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300 font-medium">
                    ${user.totalCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                    {user.referralCount}
                  </td>
                  <td className="py-3 px-5 text-right text-xs text-graphite-400">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 px-5 text-right text-xs text-graphite-400">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="py-3 px-5 text-center">
                    {!isCurrentUser && (
                      <div className="flex flex-col items-center gap-1">
                        <RoleToggleButton
                          userId={user.id}
                          currentRole={user.role}
                          userName={user.name || user.email}
                        />
                        <ImpersonateButton
                          userId={user.id}
                          userName={user.name || user.email || user.id}
                        />
                      </div>
                    )}
                    {isCurrentUser && (
                      <span className="text-xs text-graphite-400">You</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-graphite-100 dark:border-graphite-800 text-sm">
          <div className="text-graphite-400">
            Showing {filtered.length === 0 ? 0 : pageStart + 1}
            {"–"}
            {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 disabled:opacity-40 hover:bg-graphite-50 dark:hover:bg-graphite-800"
            >
              Previous
            </button>
            <span className="text-graphite-500">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 disabled:opacity-40 hover:bg-graphite-50 dark:hover:bg-graphite-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
