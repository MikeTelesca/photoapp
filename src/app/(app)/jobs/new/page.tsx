"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPinIcon,
  LinkIcon,
  PaintBrushIcon,
  CheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  UserIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { TemplatePicker } from "@/components/jobs/template-picker";
import { ClientPicker } from "@/components/jobs/client-picker";
import { DuplicateWarning } from "@/components/jobs/duplicate-warning";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function NewJobPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams?.get("welcome") === "1";
  const [address, setAddress] = useState("");
  const [dropboxUrl, setDropboxUrl] = useState("");
  const [preset, setPreset] = useState("standard");
  const [tvStyle, setTvStyle] = useState("off");
  const [skyStyle, setSkyStyle] = useState("as-is");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState("bottom-right");
  const [watermarkSize, setWatermarkSize] = useState(32);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [presets, setPresets] = useState<Array<{slug: string; name: string; description: string}>>([
    { slug: "standard", name: "Standard", description: "Window-pulled HDR, natural + magazine style" },
  ]);
  const [presetsLoading, setPresetsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/presets")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPresets(data);
          // Default to first preset or the one marked as default
          const defaultPreset = data.find((p: any) => p.isDefault) || data[0];
          setPreset(defaultPreset.slug);
        }
      })
      .catch(console.error)
      .finally(() => setPresetsLoading(false));
  }, []);
  const tvOptions = [
    { value: "netflix", label: "Netflix Home Screen", desc: "Netflix UI with movie thumbnails" },
    { value: "black", label: "Black Screen (Off)", desc: "TV appears turned off" },
    { value: "beach", label: "Beach Scene", desc: "Tropical beach with blue water" },
    { value: "mountains", label: "Mountain Landscape", desc: "Scenic mountain view" },
    { value: "fireplace", label: "Fireplace", desc: "Cozy crackling fireplace" },
    { value: "art", label: "Abstract Art", desc: "Modern abstract artwork" },
    { value: "off", label: "Don't Touch TV", desc: "Leave the TV screen as-is" },
  ];

  const skyOptions = [
    { value: "blue-clouds", label: "Blue + White Clouds", desc: "Clear blue sky with scattered white clouds" },
    { value: "clear-blue", label: "Crystal Clear Blue", desc: "Pure blue sky, no clouds" },
    { value: "golden-hour", label: "Golden Hour", desc: "Warm golden sunset/sunrise sky" },
    { value: "dramatic", label: "Dramatic", desc: "Deep blue with bold white clouds" },
    { value: "overcast-soft", label: "Soft Overcast", desc: "Bright white/light gray, even lighting" },
    { value: "as-is", label: "Keep Original Sky", desc: "Don't replace the sky" },
  ];

  const [uploadMode, setUploadMode] = useState<"dropbox" | "upload">("dropbox");
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingDropbox, setIsCheckingDropbox] = useState(false);
  const [dropboxFiles, setDropboxFiles] = useState<Array<{ name: string; path: string; size: number }>>([]);
  const [dropboxError, setDropboxError] = useState("");
  const [rawFileCount, setRawFileCount] = useState(0);

  async function checkDropboxLink(url: string) {
    if (!url.trim() || !url.includes("dropbox.com")) return;
    setIsCheckingDropbox(true);
    setDropboxError("");
    setDropboxFiles([]);

    try {
      const res = await fetch("/api/dropbox/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to list files");

      setDropboxFiles(data.files || []);
      setRawFileCount(data.rawFileCount || 0);
      if (data.files.length === 0 && (data.rawFileCount || 0) > 0) {
        setDropboxError(`Found ${data.rawFileCount} RAW files (DNG/CR2/ARW/NEF/TIFF) but no JPEGs. RAW formats aren't supported — please export as JPEG and try again.`);
      } else if (data.files.length === 0) {
        setDropboxError("No image files found in this Dropbox folder");
      }
    } catch (err: any) {
      setDropboxError(err.message || "Failed to check Dropbox link");
    } finally {
      setIsCheckingDropbox(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address.trim()) {
      setError("Property address is required");
      return;
    }

    if (uploadMode === "upload" && filesToUpload.length === 0) {
      setError("Please select at least one photo to upload");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          dropboxUrl: uploadMode === "dropbox" ? (dropboxUrl.trim() || null) : null,
          preset,
          tvStyle,
          skyStyle,
          watermarkText: watermarkText.trim() || null,
          watermarkPosition,
          watermarkSize,
          watermarkOpacity,
          clientName: clientName.trim() || null,
          clientId: clientId || null,
          tags: tags.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job");
      }

      const jobData = await res.json();

      if (uploadMode === "upload" && filesToUpload.length > 0) {
        // Upload files in chunks of 5 to avoid massive multipart requests
        setUploading(true);
        const chunkSize = 5;
        let uploaded = 0;
        for (let i = 0; i < filesToUpload.length; i += chunkSize) {
          const chunk = filesToUpload.slice(i, i + chunkSize);
          const fd = new FormData();
          for (const f of chunk) fd.append("files", f);
          await fetch(`/api/jobs/${jobData.id}/upload`, { method: "POST", body: fd });
          uploaded += chunk.length;
          setUploadProgress(Math.round((uploaded / filesToUpload.length) * 100));
        }
        setUploading(false);
        // Trigger ingest from the uploaded files
        await fetch(`/api/jobs/${jobData.id}/ingest-uploaded`, { method: "POST" });
      } else if (uploadMode === "dropbox" && dropboxUrl.trim()) {
        // After creating the job, trigger ingestion if Dropbox URL was provided
        fetch(`/api/jobs/${jobData.id}/ingest`, { method: "POST" }).catch(console.error);
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  }

  function applyTemplate(t: {
    preset: string;
    tvStyle: string | null;
    skyStyle: string | null;
    watermarkText: string | null;
    clientName: string | null;
    tags: string | null;
    notes: string | null;
  }) {
    if (t.preset) setPreset(t.preset);
    if (t.tvStyle) setTvStyle(t.tvStyle);
    if (t.skyStyle) setSkyStyle(t.skyStyle);
    if (t.watermarkText) setWatermarkText(t.watermarkText);
    if (t.clientName) { setClientName(t.clientName); setClientId(null); }
    if (t.tags) setTags(t.tags);
  }

  return (
    <>
      <Topbar title="New Job" subtitle="Create a new photo editing job" />
      <div className="p-6 max-w-2xl">
        {isWelcome && (
          <div className="mb-4 p-4 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👋</div>
              <div className="flex-1">
                <div className="font-semibold text-cyan-800 dark:text-cyan-200 text-sm">Welcome! Let's create your first job.</div>
                <div className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">
                  Paste a Dropbox shared folder link below OR switch to upload files directly. You can also click "Try Demo Job" on the dashboard if you just want to see how it works.
                </div>
              </div>
            </div>
          </div>
        )}
        <Card>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Template picker */}
            <TemplatePicker onApply={applyTemplate} />

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
              <div className="mt-2">
                <DuplicateWarning address={address} dropboxUrl={dropboxUrl} />
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 dark:text-white mb-2">
                <UserIcon className="w-4 h-4 text-graphite-500" />
                Client <span className="text-xs font-normal text-graphite-400">(optional)</span>
              </label>
              <ClientPicker
                value={clientId}
                onChange={(id, name) => {
                  setClientId(id);
                  setClientName(name);
                }}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-2">
                <TagIcon className="w-4 h-4 text-graphite-500" />
                Tags <span className="text-xs font-normal text-graphite-400">(comma-separated, optional)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. luxury, condo, urgent"
                className="w-full px-4 py-2.5 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
              />
            </div>

            {/* Photo Source — toggle between Dropbox link and direct upload */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-3">
                <LinkIcon className="w-4 h-4 text-graphite-500" />
                Photo Source
              </label>

              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-graphite-100 rounded-lg w-fit mb-4">
                <button
                  type="button"
                  onClick={() => setUploadMode("dropbox")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${uploadMode === "dropbox" ? "bg-white text-graphite-900 shadow-sm" : "text-graphite-500"}`}
                >
                  Dropbox Link
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("upload")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${uploadMode === "upload" ? "bg-white text-graphite-900 shadow-sm" : "text-graphite-500"}`}
                >
                  Upload Files
                </button>
              </div>

              {uploadMode === "upload" ? (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-2">
                    Upload Photos
                  </label>
                  <label
                    htmlFor="file-upload"
                    className="block border-2 border-dashed border-graphite-300 rounded-xl p-8 text-center cursor-pointer hover:border-cyan hover:bg-cyan-50/30 transition-colors"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter(f => /\.(jpe?g|png)$/i.test(f.name));
                      setFilesToUpload(prev => [...prev, ...files]);
                    }}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setFilesToUpload(prev => [...prev, ...files]);
                      }}
                    />
                    <div className="text-sm font-semibold text-graphite-700 mb-1">
                      Drop photos here or click to browse
                    </div>
                    <div className="text-xs text-graphite-500">
                      JPEG or PNG only &middot; {filesToUpload.length} file{filesToUpload.length === 1 ? "" : "s"} ready
                    </div>
                  </label>
                  {filesToUpload.length > 0 && (
                    <div className="mt-3 max-h-[120px] overflow-y-auto bg-graphite-50 rounded-lg p-2">
                      {filesToUpload.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                          <span className="truncate text-graphite-600">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploading && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-graphite-200 rounded-full overflow-hidden">
                        <div className="h-1.5 bg-cyan transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <div className="text-xs text-graphite-500 mt-1">Uploading {uploadProgress}%...</div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    value={dropboxUrl}
                    onChange={(e) => setDropboxUrl(e.target.value)}
                    onBlur={() => checkDropboxLink(dropboxUrl)}
                    placeholder="https://www.dropbox.com/sh/..."
                    className="w-full px-4 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                  />
                  <p className="text-xs text-graphite-400 mt-1.5">
                    Paste the shared Dropbox folder link containing the bracketed photos. We&apos;ll pull them automatically.
                  </p>

                  {isCheckingDropbox && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-cyan">
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Checking Dropbox folder...
                    </div>
                  )}

                  {dropboxError && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      {dropboxError}
                    </div>
                  )}

                  {dropboxFiles.length > 0 && !isCheckingDropbox && (
                    <div className="mt-3 bg-graphite-50 border border-graphite-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-graphite-900">
                            {dropboxFiles.length} files found
                          </span>
                        </div>
                        <span className="text-xs text-graphite-400">
                          {formatFileSize(dropboxFiles.reduce((sum, f) => sum + f.size, 0))}
                        </span>
                      </div>

                      {rawFileCount > 0 && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                          <strong>{rawFileCount} RAW files</strong> (DNG/CR2/ARW/NEF/TIFF) in this folder will be skipped. RAW formats aren&apos;t supported — only JPEGs will be processed. Please export as JPEG if you need those photos edited.
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-white rounded-lg p-2 border border-graphite-200">
                          <div className="text-lg font-bold text-graphite-900">{dropboxFiles.length}</div>
                          <div className="text-[10px] text-graphite-400 uppercase">Source Files</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-graphite-200">
                          <div className="text-lg font-bold text-cyan">
                            {dropboxFiles.length % 5 === 0 ? 5 : 3}
                          </div>
                          <div className="text-[10px] text-graphite-400 uppercase">Brackets</div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-graphite-200">
                          <div className="text-lg font-bold text-emerald-600">
                            {Math.ceil(dropboxFiles.length / (dropboxFiles.length % 5 === 0 ? 5 : 3))}
                          </div>
                          <div className="text-[10px] text-graphite-400 uppercase">Final Photos</div>
                        </div>
                      </div>

                      <div className="max-h-[120px] overflow-y-auto">
                        {dropboxFiles.slice(0, 30).map((file, i) => (
                          <div key={i} className="flex items-center justify-between py-1 text-xs">
                            <span className="text-graphite-600 truncate mr-2">{file.name}</span>
                            <span className="text-graphite-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                          </div>
                        ))}
                        {dropboxFiles.length > 30 && (
                          <div className="text-xs text-graphite-400 mt-1">
                            +{dropboxFiles.length - 30} more files...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preset */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-3">
                <PaintBrushIcon className="w-4 h-4 text-graphite-500" />
                Editing Preset
              </label>
              <div className={`grid gap-3 ${presets.length > 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3'}`}>
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

            {/* TV Screen Style */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-graphite-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                TV Screen Style
                <span className="text-xs font-normal text-graphite-400">(for rooms with TVs)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {tvOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTvStyle(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      tvStyle === opt.value
                        ? "border-cyan bg-cyan-50"
                        : "border-graphite-200 bg-white hover:border-graphite-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-graphite-900">{opt.label}</span>
                      {tvStyle === opt.value && (
                        <CheckIcon className="w-3.5 h-3.5 text-cyan" />
                      )}
                    </div>
                    <span className="text-[10px] text-graphite-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sky Style */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-graphite-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
                </svg>
                Sky Style
                <span className="text-xs font-normal text-graphite-400">(for exterior shots)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {skyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSkyStyle(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      skyStyle === opt.value
                        ? "border-cyan bg-cyan-50"
                        : "border-graphite-200 bg-white hover:border-graphite-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-graphite-900">{opt.label}</span>
                      {skyStyle === opt.value && (
                        <CheckIcon className="w-3.5 h-3.5 text-cyan" />
                      )}
                    </div>
                    <span className="text-[10px] text-graphite-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-graphite-900 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-graphite-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Watermark
                <span className="text-xs font-normal text-graphite-400">(optional — applied to downloaded photos)</span>
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. © 2026 Your Photography Co."
                className="w-full px-4 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
              />
              {watermarkText.trim() && (
                <div className="mt-3 space-y-3">
                  {/* Position */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-graphite-700 w-20 flex-shrink-0">Position</label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-graphite-200 text-xs text-graphite-900 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                  {/* Size */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-graphite-700 w-20 flex-shrink-0">Size</label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={watermarkSize}
                      onChange={(e) => setWatermarkSize(Number(e.target.value))}
                      className="flex-1 accent-cyan"
                    />
                    <span className="text-xs text-graphite-500 w-10 text-right">{watermarkSize}px</span>
                  </div>
                  {/* Opacity */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-graphite-700 w-20 flex-shrink-0">Opacity</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(watermarkOpacity * 100)}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value) / 100)}
                      className="flex-1 accent-cyan"
                    />
                    <span className="text-xs text-graphite-500 w-10 text-right">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  {/* Live preview */}
                  <div className="relative w-full h-20 bg-graphite-200 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-graphite-300 to-graphite-400 flex items-center justify-center">
                      <span className="text-graphite-500 text-xs">Photo preview</span>
                    </div>
                    <span
                      className={`absolute text-white font-semibold pointer-events-none select-none leading-none`}
                      style={{
                        fontSize: `${Math.max(8, Math.round(watermarkSize * 0.35))}px`,
                        opacity: watermarkOpacity,
                        textShadow: `0 0 2px rgba(0,0,0,${watermarkOpacity * 0.5})`,
                        ...(watermarkPosition === "top-left" && { top: 6, left: 8 }),
                        ...(watermarkPosition === "top-right" && { top: 6, right: 8 }),
                        ...(watermarkPosition === "bottom-left" && { bottom: 6, left: 8 }),
                        ...(watermarkPosition === "bottom-right" && { bottom: 6, right: 8 }),
                        ...(watermarkPosition === "center" && { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }),
                      }}
                    >
                      {watermarkText}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs text-graphite-400 mt-1.5">
                Text will appear on each downloaded photo at the selected position.
              </p>
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

export default function NewJobPage() {
  return (
    <Suspense>
      <NewJobPageInner />
    </Suspense>
  );
}
