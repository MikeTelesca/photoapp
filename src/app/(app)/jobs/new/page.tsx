"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPinIcon,
  LinkIcon,
  PaintBrushIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const presets = [
  {
    slug: "standard",
    name: "Standard",
    description: "Window-pulled HDR, natural + magazine style",
  },
  {
    slug: "bright-airy",
    name: "Bright & Airy",
    description: "Light, warm, lifted shadows",
  },
  {
    slug: "luxury",
    name: "Luxury",
    description: "Rich contrast, dramatic, moody",
  },
];

export default function NewJobPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [dropboxUrl, setDropboxUrl] = useState("");
  const [preset, setPreset] = useState("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address.trim()) {
      setError("Property address is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          dropboxUrl: dropboxUrl.trim() || null,
          preset,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job");
      }

      // After creating the job, trigger ingestion if Dropbox URL was provided
      const jobData = await res.json();

      if (dropboxUrl.trim()) {
        // Trigger ingestion in the background
        fetch(`/api/jobs/${jobData.id}/ingest`, { method: "POST" }).catch(
          console.error
        );
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="New Job" subtitle="Create a new photo editing job" />
      <div className="p-6 max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Address */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-2">
                <MapPinIcon className="w-4 h-4 text-graphite-500" />
                Property Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main Street, Toronto"
                className="w-full px-4 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
              />
            </div>

            {/* Dropbox Link */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-2">
                <LinkIcon className="w-4 h-4 text-graphite-500" />
                Dropbox Link
                <span className="text-xs font-normal text-graphite-400">(optional)</span>
              </label>
              <input
                type="url"
                value={dropboxUrl}
                onChange={(e) => setDropboxUrl(e.target.value)}
                placeholder="https://www.dropbox.com/sh/..."
                className="w-full px-4 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
              />
              <p className="text-xs text-graphite-400 mt-1.5">
                Paste the shared Dropbox folder link containing the bracketed photos. We&apos;ll pull them automatically.
              </p>
            </div>

            {/* Preset */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-3">
                <PaintBrushIcon className="w-4 h-4 text-graphite-500" />
                Editing Preset
              </label>
              <div className="grid grid-cols-3 gap-3">
                {presets.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setPreset(p.slug)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      preset === p.slug
                        ? "border-cyan bg-cyan-50"
                        : "border-graphite-200 bg-white hover:border-graphite-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-graphite-900">
                        {p.name}
                      </span>
                      {preset === p.slug && (
                        <CheckIcon className="w-4 h-4 text-cyan" />
                      )}
                    </div>
                    <span className="text-xs text-graphite-400">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Job"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
