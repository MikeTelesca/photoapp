"use client";
import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Job {
  id: string;
  address: string;
  clientName?: string;
  photographer?: { id: string; name: string };
  preset: string;
  status: string;
  totalPhotos: number;
  approvedPhotos: number;
  cost: number;
  createdAt: string | Date;
  tags?: string;
  notes?: string;
}

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "This month", days: -1 },
  { label: "Last month", days: -2 },
  { label: "Quarter", days: -3 },
];

function highlightSnippet(text: string, q: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, 60);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + q.length + 20);
  return text.slice(start, end);
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [minPhotos, setMinPhotos] = useState("");
  const [status, setStatus] = useState("");
  const [preset, setPreset] = useState("");
  const [results, setResults] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function applyPreset(label: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let fromDate = new Date(today);
    let toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);

    if (label === "Today") {
      fromDate = new Date(today);
      toDate = new Date(today);
    } else if (label === "Yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      fromDate = yesterday;
      toDate = yesterday;
    } else if (label === "7 days") {
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (label === "30 days") {
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 30);
    } else if (label === "This month") {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (label === "Last month") {
      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      toDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (label === "Quarter") {
      const quarterStart = Math.floor(today.getMonth() / 3) * 3;
      fromDate = new Date(today.getFullYear(), quarterStart, 1);
    }

    setFrom(fromDate.toISOString().slice(0, 10));
    setTo(toDate.toISOString().slice(0, 10));
  }

  async function runSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (minCost) params.set("minCost", minCost);
    if (maxCost) params.set("maxCost", maxCost);
    if (minPhotos) params.set("minPhotos", minPhotos);
    if (status) params.set("status", status);
    if (preset) params.set("preset", preset);
    try {
      const res = await fetch(`/api/jobs/search?${params}`);
      const data = await res.json();
      setResults(data.jobs || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQ("");
    setFrom("");
    setTo("");
    setMinCost("");
    setMaxCost("");
    setMinPhotos("");
    setStatus("");
    setPreset("");
    setResults([]);
    setSearched(false);
  }

  return (
    <>
      <Topbar title="Advanced search" />
      <div className="p-6 space-y-4">
        <Card>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <SearchInput
              label="Text search"
              value={q}
              onChange={setQ}
              placeholder="address, client, photographer, tags, notes"
            />
            <SearchInput
              label="From date"
              type="date"
              value={from}
              onChange={setFrom}
            />
            <SearchInput
              label="To date"
              type="date"
              value={to}
              onChange={setTo}
            />
            <div className="md:col-span-3 flex flex-wrap gap-1 items-center">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-graphite-500 dark:text-graphite-400 mr-1">
                Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.label)}
                  className="text-[11px] px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan"
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="text-[11px] px-2 py-1 rounded text-graphite-500"
              >
                Clear dates
              </button>
            </div>
            <SearchInput
              label="Min cost ($)"
              type="number"
              value={minCost}
              onChange={setMinCost}
            />
            <SearchInput
              label="Max cost ($)"
              type="number"
              value={maxCost}
              onChange={setMaxCost}
            />
            <SearchInput
              label="Min photos"
              type="number"
              value={minPhotos}
              onChange={setMinPhotos}
            />
            <SearchSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "Any" },
                { value: "pending", label: "Pending" },
                { value: "processing", label: "Processing" },
                { value: "review", label: "Review" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
            <SearchSelect
              label="Preset"
              value={preset}
              onChange={setPreset}
              options={[
                { value: "", label: "Any" },
                { value: "standard", label: "Standard" },
                { value: "bright", label: "Bright" },
                { value: "luxury", label: "Luxury" },
                { value: "mls-standard", label: "MLS Standard" },
                { value: "flambient", label: "Flambient" },
              ]}
            />
            <div className="flex items-end gap-2">
              <button
                onClick={runSearch}
                disabled={loading}
                className="text-xs px-4 py-2 rounded bg-cyan text-white font-semibold disabled:opacity-60"
              >
                {loading ? "Searching..." : "Search"}
              </button>
              <button
                onClick={clear}
                className="text-xs px-4 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"
              >
                Clear
              </button>
            </div>
          </div>
        </Card>

        {searched && (
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 mb-3">
                {results.length} result{results.length === 1 ? "" : "s"}
                {results.length > 0 &&
                  ` · Total cost: $${results.reduce((s, j) => s + j.cost, 0).toFixed(2)}`}
              </div>
              {results.length === 0 ? (
                <div className="text-center py-8 text-sm text-graphite-400">
                  No jobs match
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                    <tr>
                      <th className="text-left py-2">Address</th>
                      <th className="text-left">Client</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Photos</th>
                      <th className="text-right">Cost</th>
                      <th className="text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-graphite-50 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-800"
                      >
                        <td className="py-2">
                          <Link
                            href={`/review/${job.id}`}
                            className="font-medium text-cyan hover:underline"
                          >
                            {job.address}
                          </Link>
                          {q && job.notes && job.notes.toLowerCase().includes(q.toLowerCase()) && (
                            <div className="text-[10px] text-graphite-500 dark:text-graphite-400 mt-1 italic truncate">
                              📝 ...{highlightSnippet(job.notes, q)}...
                            </div>
                          )}
                        </td>
                        <td className="text-xs dark:text-graphite-300">
                          {job.clientName || "—"}
                        </td>
                        <td className="text-xs uppercase tracking-wide text-graphite-500">
                          {job.status}
                        </td>
                        <td className="text-right">
                          {job.approvedPhotos}/{job.totalPhotos}
                        </td>
                        <td className="text-right">${job.cost.toFixed(2)}</td>
                        <td className="text-right text-xs text-graphite-400">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function SearchInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
      />
    </div>
  );
}

function SearchSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
