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
              placeholder="address, client, tags"
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
