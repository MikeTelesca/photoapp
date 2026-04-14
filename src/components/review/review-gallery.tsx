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

  const photos = job.photos;
  const currentPhoto = photos[currentIndex];
  const approvedCount = photos.filter((p) => p.status === "approved").length;
  const rejectedCount = photos.filter((p) => p.status === "rejected").length;
  const progress = photos.length > 0 ? Math.round((approvedCount / photos.length) * 100) : 0;

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
    goNext();
  }, [currentPhoto, updatePhoto, goNext]);

  const handleReject = useCallback(() => {
    if (!currentPhoto) return;
    updatePhoto(currentPhoto.id, { status: "rejected" });
    goNext();
  }, [currentPhoto, updatePhoto, goNext]);

  const handleRegenerate = useCallback(() => {
    if (!currentPhoto) return;
    const instruction = customInstruction.trim() || null;

    // Update status optimistically
    setJob((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === currentPhoto.id ? { ...p, status: "regenerating" } : p
      ),
    }));

    // Call enhance API
    fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/enhance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customInstructions: instruction }),
    })
      .then((res) => res.json())
      .then((data) => {
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
          setJob((prev) => ({
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === currentPhoto.id ? { ...p, status: "pending" } : p
            ),
          }));
          console.error("Enhancement failed:", data.error);
        }
      })
      .catch(console.error);

    setCustomInstruction("");
  }, [currentPhoto, job.id, customInstruction]);

  const handleTwilight = useCallback(() => {
    if (!currentPhoto) return;
    const instruction = customInstruction.trim() || "Convert to twilight with warm lighting";

    setJob((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === currentPhoto.id ? { ...p, status: "regenerating", isTwilight: true } : p
      ),
    }));

    fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/enhance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customInstructions: instruction, makeTwilight: true }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJob((prev) => ({
            ...prev,
            photos: prev.photos.map((p) =>
              p.id === currentPhoto.id
                ? { ...p, status: "edited", editedUrl: data.editedUrl, isTwilight: true }
                : p
            ),
          }));
        }
      })
      .catch(console.error);

    setCustomInstruction("");
  }, [currentPhoto, job.id, customInstruction]);

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
      <div className="sticky top-0 z-20 bg-white/92 backdrop-blur-xl border-b border-graphite-200 px-7 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm font-medium text-cyan hover:opacity-70 transition-opacity"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Dashboard
          </Link>
          <div>
            <div className="text-base font-bold text-graphite-900">{job.address}</div>
            <div className="text-xs text-graphite-400 flex gap-3">
              <span>{job.photographer.name}</span>
              <span>{photos.length} photos</span>
              <span className="capitalize">{job.preset} preset</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-right mr-2">
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
          <Button variant="approve" onClick={handleApproveAll} disabled={isUpdating}>
            <CheckCircleIcon className="w-4 h-4" />
            Approve All
          </Button>
          <Button>
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Strip */}
        <div className="w-[100px] bg-white border-r border-graphite-200 overflow-y-auto p-2 flex flex-col gap-1 flex-shrink-0">
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
          <div className="flex-1 bg-graphite-900 flex gap-0.5 p-4 min-h-0">
            {/* Before */}
            <div className="flex-1 rounded-lg overflow-hidden relative flex items-center justify-center bg-graphite-800">
              <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm z-10">
                Before
              </div>
              {currentPhoto?.originalUrl ? (
                <img
                  src={currentPhoto.originalUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
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
              ) : (
                <div className="text-graphite-500 text-sm">
                  {currentPhoto?.status === "processing"
                    ? "Processing..."
                    : currentPhoto?.status === "regenerating"
                    ? "Regenerating..."
                    : "AI Enhanced"}
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
          <div className="bg-white border-t border-graphite-200 px-6 py-3 flex items-center justify-between">
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
              <button
                onClick={handleApprove}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-50 text-cyan hover:bg-cyan-50/80 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Regenerate
              </button>
              <button
                onClick={handleTwilight}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                <MoonIcon className="w-4 h-4" />
                Twilight
              </button>
            </div>

            <div className="flex gap-1.5 text-[10px] text-graphite-400">
              <span className="px-2 py-1 bg-graphite-100 rounded">A = Approve</span>
              <span className="px-2 py-1 bg-graphite-100 rounded">R = Reject</span>
              <span className="px-2 py-1 bg-graphite-100 rounded">&larr; &rarr; Navigate</span>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="bg-white border-t border-graphite-100 px-6 py-3 flex items-center gap-2.5">
            <div className="flex gap-1.5 flex-wrap">
              {["Remove car", "Make brighter", "Fix sky", "Enhance grass", "Pot lights on", "Remove photographer"].map(
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
