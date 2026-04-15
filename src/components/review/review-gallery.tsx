"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  MoonIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface Photo {
  id: string;
  orderIndex: number;
  status: string;
  originalUrl: string | null;
  editedUrl: string | null;
  isExterior: boolean;
  isTwilight: boolean;
  twilightInstructions: string | null;
  customInstructions: string | null;
  detections: string;
  exifData: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Job {
  id: string;
  address: string;
  preset: string;
  status: string;
  totalPhotos: number;
  approvedPhotos: number;
  rejectedPhotos: number;
  photographer: { name: string };
  photos: Photo[];
}

interface ReviewGalleryProps {
  job: Job;
}

export function ReviewGallery({ job: initialJob }: ReviewGalleryProps) {
  const [job, setJob] = useState(initialJob);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);

  // Preset switcher
  const [presets, setPresets] = useState<Array<{ id: string; slug: string; name: string; promptModifiers: string }>>([]);
  const [currentPreset, setCurrentPreset] = useState<string>((initialJob as any).preset || "standard");
  const [editedPrompt, setEditedPrompt] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    fetch("/api/presets")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPresets(data);
          const active = data.find((p: any) => p.slug === currentPreset);
          if (active) setEditedPrompt(active.promptModifiers || "");
        }
      })
      .catch(console.error);
  }, [currentPreset]);

  async function changePreset(slug: string) {
    setCurrentPreset(slug);
    const preset = presets.find(p => p.slug === slug);
    if (preset) setEditedPrompt(preset.promptModifiers || "");
    // Update job
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset: slug }),
    });
  }

  async function savePromptChanges() {
    const preset = presets.find(p => p.slug === currentPreset);
    if (!preset) return;
    setSavingPreset(true);
    try {
      await fetch(`/api/presets/${preset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptModifiers: editedPrompt }),
      });
      setPresets(prev => prev.map(p => p.slug === currentPreset ? { ...p, promptModifiers: editedPrompt } : p));
      setShowPromptEditor(false);
    } finally {
      setSavingPreset(false);
    }
  }

  const photos = job.photos;
  const currentPhoto = photos[currentIndex];
  const approvedCount = photos.filter((p) => p.status === "approved").length;
  const rejectedCount = photos.filter((p) => p.status === "rejected").length;
  const progress = photos.length > 0 ? Math.round((approvedCount / photos.length) * 100) : 0;

  // Preload neighboring photos so navigation feels instant
  useEffect(() => {
    const preloadIndices = [currentIndex + 1, currentIndex + 2, currentIndex - 1, currentIndex + 3];
    preloadIndices.forEach((idx) => {
      if (idx < 0 || idx >= photos.length) return;
      const p = photos[idx];
      if (!p) return;
      const url = p.originalUrl || `/api/jobs/${job.id}/photos/${p.id}/original`;
      // Trigger browser to fetch + cache
      const img = new Image();
      img.src = url;
    });
  }, [currentIndex, photos, job.id]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, photos.length - 1));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const updatePhoto = useCallback(
    async (photoId: string, data: Record<string, unknown>) => {
      setIsUpdating(true);
      try {
        const res = await fetch(`/api/jobs/${job.id}/photos/${photoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          setJob((prev) => ({
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === photoId ? { ...p, ...updated } : p
            ),
          }));
        }
      } catch (error) {
        console.error("Failed to update photo:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [job.id]
  );

  const handleApprove = useCallback(() => {
    if (!currentPhoto) return;
    updatePhoto(currentPhoto.id, { status: "approved" });
    setTimeout(() => goNext(), 300);
  }, [currentPhoto, updatePhoto, goNext]);

  const handleReject = useCallback(() => {
    if (!currentPhoto) return;
    updatePhoto(currentPhoto.id, { status: "rejected" });
    setTimeout(() => goNext(), 300);
  }, [currentPhoto, updatePhoto, goNext]);

  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  const handleRegenerate = useCallback(async () => {
    console.log("[regen] Button clicked", { currentPhotoId: currentPhoto?.id, instruction: customInstruction });
    if (!currentPhoto) return;
    const instruction = customInstruction.trim() || null;
    setEnhanceError(null);
    setEnhanceLoading(true);

    // Update status optimistically — clear editedUrl so loading spinner shows
    setJob((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === currentPhoto.id ? { ...p, status: "regenerating", editedUrl: null } : p
      ),
    }));

    try {
      console.log("[regen] Calling enhance endpoint...");
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instruction }),
      });
      console.log("[regen] Response status:", res.status);
      const data = await res.json();
      console.log("[regen] Response data:", data);

      if (data.success) {
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === currentPhoto.id
              ? { ...p, status: "edited", editedUrl: data.editedUrl }
              : p
          ),
        }));
      } else {
        setEnhanceError(data.error || "Enhancement failed");
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === currentPhoto.id ? { ...p, status: "pending" } : p
          ),
        }));
      }
    } catch (err: any) {
      setEnhanceError(err.message || "Network error");
      setJob((prev) => ({
        ...prev,
        photos: prev.photos.map((p) =>
          p.id === currentPhoto.id ? { ...p, status: "pending" } : p
        ),
      }));
    } finally {
      setEnhanceLoading(false);
      setCustomInstruction("");
    }
  }, [currentPhoto, job.id, customInstruction]);

  const handleTwilight = useCallback(async () => {
    if (!currentPhoto) return;

    // Toggle twilight off if already set
    if (currentPhoto.isTwilight) {
      await updatePhoto(currentPhoto.id, { isTwilight: false, twilightInstructions: null });
      return;
    }

    // Otherwise, set twilight and regenerate
    const instruction = customInstruction.trim() || "Convert to twilight/dusk with warm lighting, all lights on";
    setEnhanceError(null);
    setEnhanceLoading(true);

    setJob((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === currentPhoto.id ? { ...p, status: "regenerating", editedUrl: null, isTwilight: true } : p
      ),
    }));

    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instruction, makeTwilight: true }),
      });
      const data = await res.json();

      if (data.success) {
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === currentPhoto.id
              ? { ...p, status: "edited", editedUrl: data.editedUrl, isTwilight: true }
              : p
          ),
        }));
      } else {
        setEnhanceError(data.error || "Twilight conversion failed");
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === currentPhoto.id ? { ...p, status: "pending", isTwilight: false } : p
          ),
        }));
      }
    } catch (err: any) {
      setEnhanceError(err.message || "Network error");
    } finally {
      setEnhanceLoading(false);
      setCustomInstruction("");
    }
  }, [currentPhoto, job.id, customInstruction, updatePhoto]);

  const handleEnhanceAll = useCallback(async () => {
    const pending = photos.filter(p => p.status === "pending");
    if (pending.length === 0) return;

    setIsEnhancingAll(true);
    setEnhanceProgress(0);

    // Process photos one at a time via the server endpoint.
    // Each call processes one photo and returns. If the user navigates away,
    // re-opening the page will see current state and can resume.
    let remaining = pending.length;
    const total = pending.length;

    while (remaining > 0) {
      try {
        const res = await fetch(`/api/jobs/${job.id}/start-enhance`, { method: "POST" });
        const data = await res.json();

        if (data.done) {
          break;
        }

        if (data.editedUrl && data.photoId) {
          setJob(prev => ({
            ...prev,
            photos: prev.photos.map(p =>
              p.id === data.photoId ? { ...p, status: "edited", editedUrl: data.editedUrl } : p
            ),
          }));
        }

        remaining = data.remaining ?? remaining - 1;
        setEnhanceProgress(Math.round(((total - remaining) / total) * 100));

        if (data.error && !data.editedUrl) {
          console.error("Enhancement error:", data.error);
          // Continue to next photo even if one fails
        }
      } catch (err) {
        console.error("Process error:", err);
        break;
      }
    }

    setIsEnhancingAll(false);
    setEnhanceProgress(100);
  }, [photos, job.id]);

  const handleDownload = useCallback(async () => {
    const approvedPhotos = photos.filter(
      (p) => p.status === "approved" && p.editedUrl
    );

    if (approvedPhotos.length === 0) {
      alert("No approved photos to download");
      return;
    }

    // Download each approved photo
    for (const photo of approvedPhotos) {
      const link = document.createElement("a");
      link.href = `/api/jobs/${job.id}/photos/${photo.id}/download`;
      link.download = `photo_${photo.orderIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Small delay between downloads to avoid browser blocking
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }, [photos, job.id]);

  const handleApproveAll = useCallback(async () => {
    const pending = photos.filter(
      (p) => p.status !== "approved" && p.status !== "rejected"
    );
    for (const photo of pending) {
      await updatePhoto(photo.id, { status: "approved" });
    }
  }, [photos, updatePhoto]);

  const handleQuickTag = (tag: string) => {
    setCustomInstruction(tag);
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "a":
        case "A":
          handleApprove();
          break;
        case "r":
        case "R":
          handleReject();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApprove, handleReject, goNext, goPrev]);

  // Poll for photo updates when job is processing or enhancing.
  // This lets the UI recover state after a page refresh or navigation.
  useEffect(() => {
    const hasProcessing = photos.some(p => p.status === "processing" || p.status === "regenerating");
    if (!hasProcessing && !isEnhancingAll) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${job.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.photos) {
            setJob(prev => ({
              ...prev,
              ...data,
              photos: data.photos,
            }));
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [job.id, photos, isEnhancingAll]);

  const detections = currentPhoto
    ? (() => {
        try {
          return JSON.parse(currentPhoto.detections || "[]");
        } catch {
          return [];
        }
      })()
    : [];

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/92 backdrop-blur-xl border-b border-graphite-200 px-4 md:px-7 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm font-medium text-cyan hover:opacity-70 transition-opacity"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div>
            <div className="text-sm md:text-base font-bold text-graphite-900">{job.address}</div>
            <div className="text-xs text-graphite-400 flex gap-3">
              <span>{job.photographer.name}</span>
              <span>{photos.length} photos</span>
              <span className="capitalize hidden sm:inline">{job.preset} preset</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Preset selector + edit prompt */}
          <div className="flex items-center gap-1.5 hidden md:flex">
            <select
              value={currentPreset}
              onChange={(e) => changePreset(e.target.value)}
              className="text-xs border border-graphite-200 rounded-md px-2 py-1.5 bg-white text-graphite-900 focus:outline-none focus:border-cyan"
              title="Editing preset (changes apply to next regenerate)"
            >
              {presets.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="text-xs px-2 py-1.5 rounded-md border border-graphite-200 bg-white text-graphite-700 hover:bg-graphite-50"
              title="Edit prompt"
            >
              {showPromptEditor ? "Close" : "Edit Prompt"}
            </button>
          </div>
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-xs font-semibold text-graphite-700">
              {approvedCount} / {photos.length} approved
            </div>
            <div className="w-[120px] h-1 bg-graphite-200 rounded-sm mt-1">
              <div
                className="h-1 bg-emerald-500 rounded-sm transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {photos.some(p => p.status === "pending") && (
            <Button onClick={handleEnhanceAll} disabled={isEnhancingAll}>
              <ArrowPathIcon className={`w-4 h-4 ${isEnhancingAll ? 'animate-spin' : ''}`} />
              {isEnhancingAll ? `Enhancing ${enhanceProgress}%` : `Enhance All (${photos.filter(p => p.status === "pending").length})`}
            </Button>
          )}
          <Button variant="approve" onClick={handleApproveAll} disabled={isUpdating}>
            <CheckCircleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Approve All</span>
          </Button>
          <Button onClick={handleDownload}>
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {/* Inline prompt editor */}
      {showPromptEditor && (
        <div className="bg-amber-50 border-b border-amber-200 px-7 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800">
              Editing prompt for &ldquo;{presets.find(p => p.slug === currentPreset)?.name}&rdquo; preset
            </span>
            <span className="text-[11px] text-amber-600">Changes apply to all future regenerates on this preset</span>
          </div>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs font-mono bg-white text-graphite-900 focus:outline-none focus:border-amber-500"
            placeholder="AI prompt instructions..."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={savePromptChanges}
              disabled={savingPreset}
              className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
            >
              {savingPreset ? "Saving..." : "Save Prompt"}
            </button>
            <button
              onClick={() => {
                const preset = presets.find(p => p.slug === currentPreset);
                if (preset) setEditedPrompt(preset.promptModifiers || "");
              }}
              className="px-3 py-1.5 rounded-md border border-graphite-200 bg-white text-graphite-700 text-xs hover:bg-graphite-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Strip - hidden on mobile */}
        <div className="hidden md:flex w-[100px] bg-white border-r border-graphite-200 overflow-y-auto p-2 flex-col gap-1 flex-shrink-0">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-[84px] h-[56px] rounded-md flex-shrink-0 transition-all duration-150 border-2 ${
                idx === currentIndex
                  ? "border-cyan shadow-sm"
                  : "border-transparent hover:border-graphite-300"
              } ${
                photo.status === "approved"
                  ? "bg-emerald-100"
                  : photo.status === "rejected"
                  ? "bg-red-100"
                  : "bg-graphite-200"
              }`}
            >
              {photo.editedUrl ? (
                <img
                  src={photo.editedUrl}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-graphite-400 font-medium">
                  {photo.status === "processing" ? "..." : idx + 1}
                </div>
              )}
              {/* Status indicator */}
              {photo.status === "approved" && (
                <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              )}
              {photo.status === "rejected" && (
                <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
              )}
              {photo.isTwilight && (
                <MoonIcon className="absolute bottom-0.5 left-0.5 w-3 h-3 text-purple-600" />
              )}
              <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-graphite-500">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Viewer */}
        <div className="flex-1 flex flex-col">
          {/* Before / After Compare */}
          <div className="flex-1 bg-graphite-900 flex flex-col md:flex-row gap-0.5 p-2 md:p-4 min-h-0">
            {/* Before */}
            <div className="flex-1 rounded-lg overflow-hidden relative flex items-center justify-center bg-graphite-800">
              <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm z-10">
                Before
              </div>
              {currentPhoto ? (
                <img
                  src={currentPhoto.originalUrl || `/api/jobs/${job.id}/photos/${currentPhoto.id}/original`}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-graphite-500 text-sm">Original HDR Merge</div>
              )}
            </div>

            {/* After */}
            <div className="flex-1 rounded-lg overflow-hidden relative flex items-center justify-center bg-graphite-800">
              <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm z-10">
                After
              </div>
              {currentPhoto?.editedUrl ? (
                <img
                  src={currentPhoto.editedUrl}
                  alt="Edited"
                  className="max-w-full max-h-full object-contain"
                />
              ) : enhanceLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <ArrowPathIcon className="w-8 h-8 text-cyan animate-spin" />
                  <div className="text-cyan text-sm font-medium">Enhancing Photo {currentIndex + 1} with AI...</div>
                  <div className="text-graphite-500 text-xs">This may take 15-30 seconds</div>
                </div>
              ) : enhanceError ? (
                <div className="flex flex-col items-center gap-2 max-w-sm text-center px-4">
                  <div className="text-red-400 text-sm font-medium">Enhancement failed</div>
                  <div className="text-graphite-500 text-xs">{enhanceError}</div>
                  <button
                    onClick={handleRegenerate}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-cyan/20 text-cyan text-xs font-semibold hover:bg-cyan/30 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="text-graphite-500 text-sm">
                  {currentPhoto?.status === "regenerating"
                    ? "Regenerating..."
                    : "Click 'Enhance with AI' to edit this photo"}
                </div>
              )}
              {/* Detection badges */}
              {detections.length > 0 && (
                <div className="absolute bottom-2.5 right-2.5 flex gap-1 z-10">
                  {detections.map((d: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-sm bg-cyan/80 text-white"
                    >
                      {d.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white border-t border-graphite-200 px-3 md:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="w-8 h-8 rounded-lg bg-graphite-100 flex items-center justify-center hover:bg-graphite-200 transition-colors disabled:opacity-30"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-graphite-700" />
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex === photos.length - 1}
                  className="w-8 h-8 rounded-lg bg-graphite-100 flex items-center justify-center hover:bg-graphite-200 transition-colors disabled:opacity-30"
                >
                  <ChevronRightIcon className="w-4 h-4 text-graphite-700" />
                </button>
              </div>
              <div>
                <span className="text-sm font-semibold text-graphite-900">
                  Photo {currentIndex + 1}
                </span>
                <span className="text-xs text-graphite-400 ml-1">
                  of {photos.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPhoto?.status === "pending" && (
                <button
                  onClick={handleRegenerate}
                  disabled={isUpdating || enhanceLoading}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold bg-gradient-to-br from-graphite-900 to-graphite-700 text-white shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Enhance with AI
                </button>
              )}
              <button
                onClick={handleApprove}
                disabled={isUpdating || enhanceLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isUpdating || enhanceLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isUpdating || enhanceLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-50 text-cyan hover:bg-cyan-50/80 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Regenerate
              </button>
              <button
                onClick={handleTwilight}
                disabled={isUpdating || enhanceLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  currentPhoto?.isTwilight
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
              >
                <MoonIcon className="w-4 h-4" />
                {currentPhoto?.isTwilight ? "Remove Twilight" : "Twilight"}
              </button>
            </div>

            <div className="hidden md:flex gap-1.5 text-[10px] text-graphite-400">
              <span className="px-2 py-1 bg-graphite-100 rounded">A = Approve</span>
              <span className="px-2 py-1 bg-graphite-100 rounded">R = Reject</span>
              <span className="px-2 py-1 bg-graphite-100 rounded">&larr; &rarr; Navigate</span>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="bg-white border-t border-graphite-100 px-6 py-3 flex items-center gap-2.5">
            <div className="flex gap-1.5 flex-wrap">
              {["Remove car", "Make brighter", "Fix sky", "Enhance grass", "Pot lights on", "Remove photographer", "TV: Netflix home screen", "TV: fireplace video", "TV: black screen off", "TV: beach scene"].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQuickTag(tag)}
                    className="px-2.5 py-1 rounded-md bg-graphite-100 text-graphite-500 text-[11px] font-semibold border border-graphite-200 hover:bg-graphite-200 hover:text-graphite-700 transition-colors"
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customInstruction.trim()) {
                  handleRegenerate();
                }
              }}
              placeholder="Type custom instructions... e.g. 'remove the photographer from the mirror'"
              className="flex-1 px-3.5 py-2.5 bg-graphite-100 border border-graphite-200 rounded-lg text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
            />
            <Button
              onClick={handleRegenerate}
              disabled={!customInstruction.trim() || isUpdating}
            >
              Send &amp; Regenerate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
