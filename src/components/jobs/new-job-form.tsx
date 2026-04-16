"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewJobForm() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [dropboxUrl, setDropboxUrl] = useState("");
  const [preset, setPreset] = useState("standard");
  const [tvStyle, setTvStyle] = useState("netflix");
  const [skyStyle, setSkyStyle] = useState("blue-clouds");
  const [seasonalStyle, setSeasonalStyle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          dropboxUrl: dropboxUrl || null,
          preset,
          tvStyle,
          skyStyle,
          seasonalStyle: seasonalStyle || null,
        }),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const msg =
          body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Failed to create job";
        throw new Error(msg);
      }

      const job: unknown = await res.json();
      if (job && typeof job === "object" && "id" in job && typeof (job as { id: unknown }).id === "string") {
        router.push(`/job/${(job as { id: string }).id}`);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "h-9 px-3 rounded-md border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan disabled:opacity-50";
  const labelCls = "text-[11px] font-medium uppercase tracking-wider text-graphite-500 mb-1.5 block";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 p-4 space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Address *</label>
          <input
            className={`${inputCls} w-full`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Denver CO"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Dropbox URL (optional)</label>
          <input
            className={`${inputCls} w-full`}
            value={dropboxUrl}
            onChange={(e) => setDropboxUrl(e.target.value)}
            placeholder="https://www.dropbox.com/..."
            type="url"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Preset</label>
          <select className={`${inputCls} w-full`} value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="standard">Standard</option>
            <option value="bright-airy">Bright & Airy</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>TV Style</label>
          <select className={`${inputCls} w-full`} value={tvStyle} onChange={(e) => setTvStyle(e.target.value)}>
            <option value="netflix">Netflix</option>
            <option value="black">Black</option>
            <option value="beach">Beach</option>
            <option value="mountains">Mountains</option>
            <option value="fireplace">Fireplace</option>
            <option value="art">Art</option>
            <option value="off">Off</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Sky Style</label>
          <select className={`${inputCls} w-full`} value={skyStyle} onChange={(e) => setSkyStyle(e.target.value)}>
            <option value="blue-clouds">Blue + Clouds</option>
            <option value="clear-blue">Clear Blue</option>
            <option value="golden-hour">Golden Hour</option>
            <option value="dramatic">Dramatic</option>
            <option value="overcast-soft">Overcast Soft</option>
            <option value="as-is">As-Is</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Seasonal (optional)</label>
          <select
            className={`${inputCls} w-full`}
            value={seasonalStyle}
            onChange={(e) => setSeasonalStyle(e.target.value)}
          >
            <option value="">None</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="autumn">Autumn</option>
            <option value="winter">Winter</option>
            <option value="twilight">Twilight</option>
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
          disabled={loading || !address}
          className="h-9 px-4 rounded-md bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 text-sm font-medium hover:bg-graphite-800 dark:hover:bg-graphite-100 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create job"}
        </button>
      </div>
    </form>
  );
}
