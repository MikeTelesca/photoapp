"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { trackVisit } from "@/lib/recently-viewed";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ZoomableImage } from "./zoomable-image";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatJobNumber } from "@/lib/job-number";
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
  FolderOpenIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { KeyboardHint } from "./keyboard-hint";
import { NotesPopover } from "./notes-popover";
import { PhotoNote } from "./photo-note";
import { BeforeAfterSlider } from "./before-after-slider";
import { ReingestButton } from "./reingest-button";
import { ShareButton } from "./share-button";
import { SaveTemplateButton } from "@/components/dashboard/save-template-button";
import { ExifPanel } from "./exif-panel";
import { PhotoVersions } from "./photo-versions";
import { JobTimeline } from "./job-timeline";
import { JobComments } from "./job-comments";
import { InvoicePreviewModal } from "@/components/billing/invoice-preview-modal";
import { playApproveSound, playRejectSound, playFavoriteSound } from "@/lib/sounds";
import { useSwipe } from "@/hooks/use-swipe";
import { getActionForKey } from "@/lib/keyboard-shortcuts";
import { LazyThumb } from "./lazy-thumb";
import { Slideshow } from "./slideshow";
import { PromptLinter } from "@/components/presets/prompt-linter";
import { TimeTracker } from "./time-tracker";
import { ReminderButton } from "./reminder-button";
import { ThumbHoverPreview } from "./thumb-hover-preview";
import { PhotoPins } from "./photo-pins";

interface Photo {
  id: string;
  orderIndex: number;
  status: string;
  originalUrl: string | null;
  editedUrl: string | null;
  isExterior: boolean;
  isTwilight: boolean;
  isFavorite?: boolean;
  flagged?: boolean;
  twilightInstructions: string | null;
  twilightStyle?: string | null;
  customInstructions: string | null;
  detections: string;
  exifData: string | null;
  errorMessage: string | null;
  errorAttempts: number;
  retryCount: number;
  qualityFlags?: string | null;
  autoTags?: string | null;
  rejectionReason?: string | null;
  note?: string | null;
  caption?: string | null;
  ratings?: { id: string; authorName: string; rating: number; createdAt: string }[];
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
  notes?: string | null;
  customPromptOverride?: string | null;
  clientName?: string | null;
  tags?: string | null;
  watermarkText?: string | null;
  watermarkPosition?: string | null;
  watermarkSize?: number | null;
  watermarkOpacity?: number | null;
  dropboxUrl?: string | null;
  tvStyle?: string | null;
  skyStyle?: string | null;
  shareToken?: string | null;
  shareEnabled?: boolean;
  listingDescription?: string | null;
  sequenceNumber?: number | null;
  trackedTimeSeconds?: number;
  reminderAt?: Date | string | null;
  reminderNote?: string | null;
  createdAt?: string;
  photographer: { name: string };
  photos: Photo[];
}

interface ReviewGalleryProps {
  job: Job;
}

function SortableThumb({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function GridView({ photos, cols, onPhotoClick, jobId }: {
  photos: Photo[];
  cols: 2 | 3 | 4;
  onPhotoClick: (id: string) => void;
  jobId: string;
}) {
  const colClass = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
  return (
    <div className={`grid ${colClass} gap-2 p-4 overflow-y-auto bg-graphite-900 flex-1`}>
      {photos.map(p => {
        const src = p.editedUrl || p.originalUrl || `/api/jobs/${jobId}/photos/${p.id}/original`;
        return (
          <div
            key={p.id}
            onClick={() => onPhotoClick(p.id)}
            className="relative cursor-pointer group rounded overflow-hidden bg-graphite-800 aspect-[3/2]"
          >
            {src && (
              <img
                src={src}
                loading="lazy"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                alt=""
              />
            )}
            {p.status === "approved" && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold" title="Approved">✓</div>
            )}
            {p.status === "rejected" && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold" title="Rejected">✗</div>
            )}
            {p.status === "failed" && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold" title="Failed after retries">!</div>
            )}
            {p.isFavorite && (
              <div className="absolute top-1 left-1 text-amber-400 text-sm drop-shadow">★</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReviewGallery({ job: initialJob }: ReviewGalleryProps) {
  const { addToast } = useToast();
  const [job, setJob] = useState(initialJob);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);

  // Preset switcher
  const [presets, setPresets] = useState<Array<{ id: string; slug: string; name: string; promptModifiers: string }>>([]);
  const [currentPreset, setCurrentPreset] = useState<string>(initialJob.preset || "standard");
  const [editedPrompt, setEditedPrompt] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [compareMode, setCompareMode] = useState<"split" | "slider">("split");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const saved = sessionStorage.getItem("review-zoom-level");
    return saved ? parseFloat(saved) : 1;
  });
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const saved = sessionStorage.getItem("review-pan-state");
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [showZoomHint, setShowZoomHint] = useState(true);
  const [twilightMenuOpen, setTwilightMenuOpen] = useState(false);
  const twilightMenuRef = useRef<HTMLDivElement>(null);
  const [thumbFilter, setThumbFilter] = useState<"all" | "favorites" | "pending" | "edited" | "approved" | "rejected">("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "date" | "flagged" | "rejected">("order");
  const [sorting, setSorting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [rejectionReasonDefault, setRejectionReasonDefault] = useState<string>("");
  const [mlsPreset, setMlsPreset] = useState("mls-hi");
  const [zipFormat, setZipFormat] = useState("jpeg-90");

  // AI preset suggestion state
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ preset: string; reasoning: string } | null>(null);

  // Batch re-enhance state
  const [batchPreset, setBatchPreset] = useState(initialJob.preset || "standard");
  const [batchFilter, setBatchFilter] = useState<"rejected" | "all">("rejected");
  const [batching, setBatching] = useState(false);

  // Multi-select state
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkNote, setBulkNote] = useState("");

  // Deep-link state
  const searchParams = useSearchParams();
  const [linkCopied, setLinkCopied] = useState(false);

  // Watermark settings state
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  const [wmText, setWmText] = useState(initialJob.watermarkText ?? "");
  const [wmPosition, setWmPosition] = useState(initialJob.watermarkPosition ?? "bottom-right");
  const [wmSize, setWmSize] = useState(initialJob.watermarkSize ?? 32);
  const [wmOpacity, setWmOpacity] = useState(initialJob.watermarkOpacity ?? 0.7);
  const [savingWatermark, setSavingWatermark] = useState(false);

  // Custom prompt override state
  const [customOverride, setCustomOverride] = useState(initialJob.customPromptOverride || "");
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideSaved, setOverrideSaved] = useState(false);

  // Swipe hint state
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // MLS listing description state
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState(initialJob.listingDescription || "");
  const [showDescModal, setShowDescModal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<{ lang: string; text: string } | null>(null);
  const [translateLang, setTranslateLang] = useState("es");

  // Hover preview state
  const [hoverPreview, setHoverPreview] = useState<{ src: string; x: number; y: number } | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const [feedback, setFeedback] = useState("");

  // Crop suggestion state
  const [cropSuggestion, setCropSuggestion] = useState<{ x: number; y: number; width: number; height: number; reasoning: string } | null>(null);
  const [cropping, setCropping] = useState(false);

  // Preset A/B compare state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState("luxury");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  // Gallery view mode state
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);

  // Pin annotation mode
  const [pinMode, setPinMode] = useState(false);

  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);

  // Rotation state
  const [rotating, setRotating] = useState(false);

  // Caption state
  const [generatingCaption, setGeneratingCaption] = useState(false);

  // Dropbox sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; uploaded: number; failed: number; folderPath: string; shareLink: string | null } | null>(null);

  // Load hover preview preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("disable-hover-preview") === "true") {
      setHoverEnabled(false);
    }
  }, []);

  // Load view mode from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = localStorage.getItem("gallery-view-mode");
    const c = localStorage.getItem("gallery-grid-cols");
    if (m === "grid" || m === "single") setViewMode(m);
    if (c) setGridCols(parseInt(c) as any);
  }, []);

  // Persist view mode to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("gallery-view-mode", viewMode);
    localStorage.setItem("gallery-grid-cols", String(gridCols));
  }, [viewMode, gridCols]);

  // Track job visit for recently viewed
  useEffect(() => {
    if (job?.id && job?.address) {
      trackVisit({ id: job.id, address: job.address });
    }
  }, [job?.id, job?.address]);

  // Compute sorted photos
  const sortedPhotos = useMemo(() => {
    const arr = [...job.photos];
    if (sortBy === "name") {
      arr.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    } else if (sortBy === "date") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "flagged") {
      // Flagged photos first
      arr.sort((a, b) => {
        const aFlagged = a.flagged ? 0 : 1;
        const bFlagged = b.flagged ? 0 : 1;
        return aFlagged - bFlagged;
      });
    } else if (sortBy === "rejected") {
      // Rejected photos first
      arr.sort((a, b) => {
        const aRej = a.status === "rejected" ? 0 : 1;
        const bRej = b.status === "rejected" ? 0 : 1;
        return aRej - bRej;
      });
    }
    // "order" — keep original orderIndex order
    return arr;
  }, [job.photos, sortBy]);

  // Filter to approved photos for slideshow
  const slideshowPhotos = useMemo(
    () => sortedPhotos.filter(p => p.status === "approved" && (p.editedUrl || p.originalUrl)),
    [sortedPhotos]
  );

  // Collect unique auto-tags across all photos for the filter dropdown
  const allTags = useMemo(() => {
    const set = new Set<string>();
    job.photos.forEach(p => {
      if (p.autoTags) {
        try {
          const tags = JSON.parse(p.autoTags);
          if (Array.isArray(tags)) tags.forEach((t: string) => set.add(t));
        } catch {}
      }
    });
    return Array.from(set).sort();
  }, [job.photos]);

  // When sort changes, keep current photo visible
  useEffect(() => {
    const currentPhoto = job.photos[currentIndex];
    if (currentPhoto) {
      const newIdx = sortedPhotos.findIndex(p => p.id === currentPhoto.id);
      if (newIdx >= 0) setCurrentIndex(newIdx);
    }
  }, [sortBy]);

  // Read photo from URL query param on mount
  useEffect(() => {
    const photoIdFromUrl = searchParams.get("photo");
    if (photoIdFromUrl) {
      const idx = sortedPhotos.findIndex(p => p.id === photoIdFromUrl);
      if (idx >= 0) {
        setCurrentIndex(idx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update URL when current photo changes (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentPhoto = sortedPhotos[currentIndex];
    if (!currentPhoto) return;
    const url = new URL(window.location.href);
    url.searchParams.set("photo", currentPhoto.id);
    window.history.replaceState({}, "", url.toString());
  }, [currentIndex, sortedPhotos]);

  // Copy photo link to clipboard
  async function copyPhotoLink() {
    const currentPhoto = sortedPhotos[currentIndex];
    if (!currentPhoto) return;
    const url = `${window.location.origin}/review/${job.id}?photo=${currentPhoto.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      addToast("error", "Failed to copy link");
    }
  }

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

  async function suggestPreset() {
    setSuggesting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/suggest-preset`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data);
      } else {
        const err = await res.json();
        addToast("error", err.error || "Preset suggestion failed");
      }
    } catch (e) {
      addToast("error", "Preset suggestion failed");
    } finally {
      setSuggesting(false);
    }
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

  async function saveWatermarkSettings() {
    setSavingWatermark(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watermarkText: wmText.trim() || null,
          watermarkPosition: wmPosition,
          watermarkSize: wmSize,
          watermarkOpacity: wmOpacity,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob(updated);
        addToast("success", "Watermark settings saved");
        setShowWatermarkPanel(false);
      } else {
        addToast("error", "Failed to save watermark settings");
      }
    } finally {
      setSavingWatermark(false);
    }
  }

  async function saveOverride() {
    setSavingOverride(true);
    setOverrideSaved(false);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPromptOverride: customOverride.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob(updated);
        setOverrideSaved(true);
        setTimeout(() => setOverrideSaved(false), 2000);
      } else {
        addToast("error", "Failed to save custom instructions");
      }
    } catch (e: any) {
      addToast("error", e.message || "Failed to save custom instructions");
    } finally {
      setSavingOverride(false);
    }
  }

  async function runCompare() {
    if (!currentPhoto) return;
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: compareTarget }),
      });
      const data = await res.json();
      if (res.ok) setCompareResult(data.dataUrl);
      else addToast("error", data.error || "Compare failed");
    } catch (e: any) {
      addToast("error", e.message || "Compare failed");
    } finally {
      setComparing(false);
    }
  }

  const photos = job.photos;
  const currentPhoto = photos[currentIndex];

  // Pre-populate custom instruction from saved photo value when navigating
  useEffect(() => {
    if (currentPhoto?.customInstructions) {
      setCustomInstruction(currentPhoto.customInstructions);
    } else {
      setCustomInstruction("");
    }
  }, [currentPhoto?.id, currentPhoto?.customInstructions]);

  // Persist zoom level to sessionStorage; reset pan when zoom returns to 1
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("review-zoom-level", String(zoom));
  }, [zoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("review-pan-state", JSON.stringify(pan));
  }, [pan]);

  // Show zoom hint briefly when photo changes
  useEffect(() => {
    setShowZoomHint(true);
    const t = setTimeout(() => setShowZoomHint(false), 4000);
    return () => clearTimeout(t);
  }, [currentPhoto?.id]);
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
    playApproveSound();
    setTimeout(() => goNext(), 300);
  }, [currentPhoto, updatePhoto, goNext]);

  const handleReject = useCallback(() => {
    if (!currentPhoto) return;
    updatePhoto(currentPhoto.id, {
      status: "rejected",
      ...(rejectionReasonDefault && { rejectionReason: rejectionReasonDefault })
    });
    playRejectSound();
    setTimeout(() => goNext(), 300);
  }, [currentPhoto, updatePhoto, goNext, rejectionReasonDefault]);

  const handleFavorite = useCallback(async () => {
    if (!currentPhoto) return;
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/favorite`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === currentPhoto.id ? { ...p, isFavorite: data.isFavorite } : p
          ),
        }));
        playFavoriteSound();
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  }, [currentPhoto, job.id]);

  const handleToggleFlag = useCallback(async () => {
    if (!currentPhoto) return;
    const newFlag = !currentPhoto.flagged;
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: newFlag }),
      });
      if (res.ok) {
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === currentPhoto.id ? { ...p, flagged: newFlag } : p
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to toggle flag:", error);
    }
  }, [currentPhoto, job.id]);

  const handleSetAsCover = useCallback(async () => {
    if (!currentPhoto) return;
    try {
      const res = await fetch(`/api/jobs/${job.id}/cover-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: currentPhoto.id }),
      });
      if (res.ok) {
        addToast("success", "Set as job cover photo");
      } else {
        addToast("error", "Failed to set cover photo");
      }
    } catch (error) {
      console.error("Failed to set cover photo:", error);
      addToast("error", "Failed to set cover photo");
    }
  }, [currentPhoto, job.id, addToast]);

  const rotate = useCallback(async (degrees: number) => {
    if (!currentPhoto) return;
    setRotating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degrees }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed");
      }
    } finally {
      setRotating(false);
    }
  }, [currentPhoto, job.id]);

  const flip = useCallback(async (axis: "horizontal" | "vertical") => {
    if (!currentPhoto) return;
    setRotating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ axis }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed");
      }
    } finally {
      setRotating(false);
    }
  }, [currentPhoto, job.id]);

  const [enhanceErrors, setEnhanceErrors] = useState<Record<string, string>>({});
  const [enhancingIds, setEnhancingIds] = useState<Set<string>>(new Set());

  // Helper: is the CURRENT photo currently being enhanced?
  const enhanceLoading = currentPhoto ? enhancingIds.has(currentPhoto.id) : false;
  const enhanceError = currentPhoto ? enhanceErrors[currentPhoto.id] || null : null;

  const handleRegenerate = useCallback(async () => {
    if (!currentPhoto) return;
    const photoId = currentPhoto.id;
    const instruction = customInstruction.trim() || null;

    setEnhanceErrors((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
    setEnhancingIds((prev) => new Set(prev).add(photoId));

    setJob((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === photoId ? { ...p, status: "regenerating", editedUrl: null } : p
      ),
    }));

    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${photoId}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instruction }),
      });
      const data = await res.json();

      if (data.success) {
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId
              ? { ...p, status: "edited", editedUrl: data.editedUrl }
              : p
          ),
        }));
      } else {
        setEnhanceErrors((prev) => ({ ...prev, [photoId]: data.error || "Enhancement failed" }));
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId ? { ...p, status: "pending" } : p
          ),
        }));
      }
    } catch (err: any) {
      setEnhanceErrors((prev) => ({ ...prev, [photoId]: err.message || "Network error" }));
      setJob((prev) => ({
        ...prev,
        photos: prev.photos.map((p) =>
          p.id === photoId ? { ...p, status: "pending" } : p
        ),
      }));
    } finally {
      setEnhancingIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
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
    const photoId = currentPhoto.id;
    const instruction = customInstruction.trim() || "Convert to twilight/dusk with warm lighting, all lights on";
    setEnhanceErrors((prev) => { const n = { ...prev }; delete n[photoId]; return n; });
    setEnhancingIds((prev) => new Set(prev).add(photoId));

    setJob((prev) => ({
      ...prev,
      photos: prev.photos.map((p) =>
        p.id === photoId ? { ...p, status: "regenerating", editedUrl: null, isTwilight: true } : p
      ),
    }));

    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${photoId}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instruction, makeTwilight: true }),
      });
      const data = await res.json();

      if (data.success) {
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId
              ? { ...p, status: "edited", editedUrl: data.editedUrl, isTwilight: true }
              : p
          ),
        }));
      } else {
        setEnhanceErrors((prev) => ({ ...prev, [photoId]: data.error || "Twilight conversion failed" }));
        setJob((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId ? { ...p, status: "pending", isTwilight: false } : p
          ),
        }));
      }
    } catch (err: any) {
      setEnhanceErrors((prev) => ({ ...prev, [photoId]: err.message || "Network error" }));
    } finally {
      setEnhancingIds((prev) => { const n = new Set(prev); n.delete(photoId); return n; });
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

  const failedCount = photos.filter(p => p.errorMessage).length;

  const handleRetryFailed = useCallback(async () => {
    const failed = photos.filter(p => p.errorMessage && p.status === "pending");
    if (failed.length === 0) return;

    for (const photo of failed) {
      setEnhancingIds(prev => new Set(prev).add(photo.id));
      try {
        const res = await fetch(`/api/jobs/${job.id}/photos/${photo.id}/enhance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) {
          setJob(prev => ({
            ...prev,
            photos: prev.photos.map(p => p.id === photo.id ? { ...p, status: "edited", editedUrl: data.editedUrl, errorMessage: null } : p),
          }));
        }
      } catch {
        // continue to next photo
      } finally {
        setEnhancingIds(prev => { const n = new Set(prev); n.delete(photo.id); return n; });
      }
    }
  }, [photos, job.id]);

  async function runBatchEnhance() {
    const rejectedCount = photos.filter(p => p.status === "rejected").length;
    const targetCount = batchFilter === "rejected" ? rejectedCount : photos.length;
    if (targetCount === 0) {
      addToast("error", `No ${batchFilter === "rejected" ? "rejected" : ""} photos to re-enhance.`);
      return;
    }
    if (!confirm(`Re-enhance ${targetCount} ${batchFilter === "rejected" ? "rejected" : ""} photos with "${batchPreset}" preset?`)) return;
    setBatching(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/batch-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: batchFilter, preset: batchPreset }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast("error", data.error || "Batch enhance failed");
        return;
      }
      addToast("info", `Re-enhancing ${data.reset} photos with "${batchPreset}" preset. Processing will begin shortly.`);
      window.location.reload();
    } catch (err: any) {
      addToast("error", err.message || "Batch enhance failed");
    } finally {
      setBatching(false);
    }
  }

  async function runSelectedPhotosEnhance() {
    const selectedIds = Array.from(selectedPhotoIds);
    if (selectedIds.length === 0) {
      addToast("error", "No photos selected to re-enhance.");
      return;
    }
    if (!confirm(`Re-enhance ${selectedIds.length} selected photos with "${batchPreset}" preset?`)) return;
    setBatching(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/batch-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: "selected", preset: batchPreset, ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast("error", data.error || "Batch enhance failed");
        return;
      }
      addToast("info", `Re-enhancing ${data.reset} selected photos with "${batchPreset}" preset. Processing will begin shortly.`);
      window.location.reload();
    } catch (err: any) {
      addToast("error", err.message || "Batch enhance failed");
    } finally {
      setBatching(false);
    }
  }

  async function bulkUpdatePhotos(action: string, value?: string) {
    const selectedIds = Array.from(selectedPhotoIds);
    if (selectedIds.length === 0) {
      addToast("error", "No photos selected");
      return;
    }

    const actionLabels: Record<string, string> = {
      approve: "Approve",
      reject: "Reject",
      favorite: "Favorite",
      unfavorite: "Unfavorite",
      clearStatus: "Clear status",
    };

    if (!confirm(`${actionLabels[action]} ${selectedIds.length} selected photos?`)) return;

    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast("error", data.error || "Update failed");
        return;
      }
      addToast("success", `${actionLabels[action]} ${data.count} photos`);
      setSelectedPhotoIds(new Set());
      window.location.reload();
    } catch (err: any) {
      addToast("error", err.message || "Update failed");
    }
  }

  async function applyBulkNote() {
    if (!bulkNote.trim() || selectedPhotoIds.size === 0) return;
    const selectedIds = Array.from(selectedPhotoIds);
    if (!confirm(`Add note to ${selectedIds.length} selected photos?`)) return;

    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: "addNote", value: bulkNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast("error", data.error || "Failed to add note");
        return;
      }
      addToast("success", `Added note to ${data.count} photos`);
      setBulkNote("");
      setSelectedPhotoIds(new Set());
      window.location.reload();
    } catch (err: any) {
      addToast("error", err.message || "Failed to add note");
    }
  }

  async function downloadSelected() {
    if (selectedPhotoIds.size === 0) return;
    if (!confirm(`Download ${selectedPhotoIds.size} selected photos as ZIP?`)) return;

    try {
      const res = await fetch(`/api/jobs/${job.id}/download-selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedPhotoIds) }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast("error", data.error || "Download failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected-${selectedPhotoIds.size}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", `Downloaded ${selectedPhotoIds.size} photos`);
      setSelectedPhotoIds(new Set());
      setSelectMode(false);
    } catch (err: any) {
      addToast("error", err.message || "Download failed");
    }
  }

  const handleDownload = useCallback(async () => {
    const approvedPhotos = photos.filter(
      (p) => p.status === "approved" && p.editedUrl
    );

    if (approvedPhotos.length === 0) {
      addToast("error", "No approved photos to download");
      return;
    }

    addToast("info", "Preparing ZIP download...");
    try {
      const link = document.createElement("a");
      link.href = `/api/jobs/${job.id}/download?format=zip`;
      link.download = "photos.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("success", "Download started");
    } catch (err: any) {
      addToast("error", `Download failed: ${err.message}`);
    }
  }, [photos, job.id, addToast]);

  const handleDropboxFolder = useCallback(async () => {
    addToast("info", "Getting Dropbox folder link...");
    try {
      const res = await fetch(`/api/jobs/${job.id}/dropbox-link`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        addToast("success", "Dropbox folder opened");
      } else {
        addToast("error", data.error || "Could not get Dropbox link");
      }
    } catch (err: any) {
      addToast("error", `Failed: ${err.message}`);
    }
  }, [job.id, addToast]);

  async function syncToDropbox() {
    if (!confirm("Upload all approved photos to a Dropbox folder?")) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/sync-dropbox`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        addToast("success", `Synced ${data.uploaded} photo${data.uploaded === 1 ? "" : "s"} to Dropbox`);
        if (data.shareLink) {
          await navigator.clipboard.writeText(data.shareLink).catch(() => {});
        }
      } else {
        alert(data.error || "Sync failed");
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function generateDescription() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setDescription(data.description);
        if (!showDescModal) setShowDescModal(true);
        setFeedback("");
      } else {
        alert(data.error || "Failed to generate");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function translateDescription() {
    setTranslating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/translate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: translateLang }),
      });
      const data = await res.json();
      if (res.ok) {
        setTranslation({ lang: translateLang, text: data.translation });
      } else {
        alert(data.error || "Failed to translate");
      }
    } finally {
      setTranslating(false);
    }
  }

  async function suggestCrop() {
    if (!currentPhoto) return;
    setCropping(true);
    setCropSuggestion(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/suggest-crop`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setCropSuggestion(data);
      else alert(data.error || "Crop suggestion failed");
    } finally {
      setCropping(false);
    }
  }

  async function applyCrop() {
    if (!cropSuggestion || !currentPhoto) return;
    if (!confirm(`Apply this crop?\n\n${cropSuggestion.reasoning}`)) return;
    const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/apply-crop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cropSuggestion),
    });
    if (res.ok) {
      setCropSuggestion(null);
      window.location.reload();
    }
  }

  async function generateCaption() {
    if (!currentPhoto) return;
    setGeneratingCaption(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/caption`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setJob(prev => ({
          ...prev,
          photos: prev.photos.map(p =>
            p.id === currentPhoto.id ? { ...p, caption: data.caption } : p
          ),
        }));
      }
    } finally {
      setGeneratingCaption(false);
    }
  }

  const handleApproveAll = useCallback(async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/approve-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        // Update local state - mark all "edited" photos as "approved"
        const approvedCount = photos.filter(p => p.status === "edited").length;
        setJob(prev => ({
          ...prev,
          photos: prev.photos.map(p => p.status === "edited" ? { ...p, status: "approved" } : p),
        }));
        addToast("success", `${approvedCount} photo${approvedCount === 1 ? "" : "s"} approved.`);
      } else {
        addToast("error", "Failed to approve all photos.");
      }
    } catch (err) {
      console.error("Approve all failed:", err);
      addToast("error", "Failed to approve all photos.");
    } finally {
      setIsUpdating(false);
    }
  }, [job.id, photos, addToast]);

  const handleQuickTag = (tag: string) => {
    setCustomInstruction(tag);
  };

  // Show swipe hint on touch devices
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;
    if (localStorage.getItem("swipe-hint-seen")) return;
    setShowSwipeHint(true);
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
      localStorage.setItem("swipe-hint-seen", "1");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Swipe handlers
  const swipe = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    onSwipeUp: () => {
      setShowSwipeHint(false);
      handleApprove();
    },
    onSwipeDown: () => {
      setShowSwipeHint(false);
      handleReject();
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const action = getActionForKey(e.key);

      // Handle custom bindings
      switch (action) {
        case "approve":
          handleApprove();
          break;
        case "reject":
          handleReject();
          break;
        case "reenhance":
          handleRegenerate();
          break;
        case "slider":
          setCompareMode(m => m === "split" ? "slider" : "split");
          break;
        case "zoom":
          setZoom(z => z === 1 ? 2 : 1);
          setPan({ x: 0, y: 0 });
          break;
        case "favorite":
          handleFavorite();
          break;
        case "flag":
          handleToggleFlag();
          break;
        case "help":
          e.preventDefault();
          setShowHelpOverlay(prev => !prev);
          break;
        case "next":
          goNext();
          break;
        case "prev":
          goPrev();
          break;
      }

      // Handle Page Up / Page Down / Home / End (not customizable)
      if (e.key === "PageDown") {
        e.preventDefault();
        setCurrentIndex(i => Math.min(i + 10, photos.length - 1));
        return;
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        setCurrentIndex(i => Math.max(i - 10, 0));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setCurrentIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setCurrentIndex(photos.length - 1);
        return;
      }

      // Handle escape key (not customizable)
      if (e.key === "Escape") {
        if (showPromptEditor || showMobileNav || twilightMenuOpen || showHelpOverlay) {
          setShowPromptEditor(false);
          setShowMobileNav(false);
          setTwilightMenuOpen(false);
          setShowHelpOverlay(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApprove, handleReject, handleRegenerate, handleToggleFlag, goNext, goPrev, showPromptEditor, showMobileNav, twilightMenuOpen, showHelpOverlay]);

  // Close twilight menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (twilightMenuRef.current && !twilightMenuRef.current.contains(e.target as Node)) {
        setTwilightMenuOpen(false);
      }
    }
    if (twilightMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [twilightMenuOpen]);

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = photos.findIndex((p) => p.id === active.id);
    const newIdx = photos.findIndex((p) => p.id === over.id);
    const newPhotos = arrayMove(photos, oldIdx, newIdx);
    setJob((prev) => ({ ...prev, photos: newPhotos }));
    fetch(`/api/jobs/${job.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: newPhotos.map((p) => p.id) }),
    });
  }

  async function handleSmartSort() {
    if (!confirm("Reorder all photos in MLS-recommended sequence (exterior \u2192 kitchen \u2192 living \u2192 bedrooms \u2192 bathrooms)? This will overwrite the current order.")) return;
    setSorting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/smart-order`, { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setSorting(false);
    }
  }

  async function handleTagAllPhotos() {
    if (!confirm("Auto-tag all photos in this job that don't have tags yet? Costs ~$0.001 per photo.")) return;
    setTagging(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/auto-tag`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Tagged ${data.tagged} photos${data.failed > 0 ? ` (${data.failed} failed)` : ""}`);
        window.location.reload();
      } else {
        alert(data.error || "Failed to tag photos");
      }
    } catch (err) {
      alert("Error tagging photos");
      console.error(err);
    } finally {
      setTagging(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/92 dark:bg-graphite-900/92 backdrop-blur-xl border-b border-graphite-200 dark:border-graphite-700 px-4 md:px-7 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm font-medium text-cyan hover:opacity-70 transition-opacity"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div>
            <div className="flex gap-2 items-baseline">
              <div className="text-sm md:text-base font-bold text-graphite-900 dark:text-white">{job.address}</div>
              {job.sequenceNumber && (
                <div className="text-[9px] font-mono font-semibold text-cyan dark:text-cyan">
                  {formatJobNumber({ sequence: job.sequenceNumber, createdAt: job.createdAt })}
                </div>
              )}
            </div>
            <div className="text-xs text-graphite-400 flex gap-3">
              <span>{job.photographer.name}</span>
              <span>{photos.length} photos</span>
              <span className="capitalize hidden sm:inline">{job.preset} preset</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Mobile nav button */}
          <button
            onClick={() => setShowMobileNav(true)}
            className="md:hidden flex items-center gap-1 px-2 py-1 rounded text-xs bg-graphite-100 dark:bg-graphite-800"
          >
            <Bars3Icon className="w-4 h-4" />
            {currentIndex + 1} / {photos.length}
          </button>
          {/* Preset selector + edit prompt */}
          <div className="flex items-center gap-1.5 hidden md:flex">
            <select
              value={currentPreset}
              onChange={(e) => changePreset(e.target.value)}
              className="text-xs border border-graphite-200 dark:border-graphite-700 rounded-md px-2 py-1.5 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white focus:outline-none focus:border-cyan"
              title="Editing preset (changes apply to next regenerate)"
            >
              {presets.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={suggestPreset}
                disabled={suggesting}
                className="text-xs px-2 py-1 rounded border border-purple-500 text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                title="AI analyzes sample photos and suggests the best preset"
              >
                {suggesting ? "Analyzing..." : "✨ Suggest preset"}
              </button>
              <InfoTooltip text="AI analyzes 3 sample photos and recommends the best preset for this property." position="bottom" />
            </div>
            <button
              onClick={suggestCrop}
              disabled={cropping || !currentPhoto}
              className="text-xs px-2 py-1 rounded border border-purple-500 text-purple-600 hover:bg-purple-50 disabled:opacity-50"
              title="AI suggests an ideal crop for the current photo"
            >
              {cropping ? "Analyzing..." : "✂ Suggest crop"}
            </button>
            <button
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="text-xs px-2 py-1.5 rounded-md border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
              title="Edit prompt"
            >
              {showPromptEditor ? "Close" : "Edit Prompt"}
            </button>
            <button
              onClick={() => setCompareMode(m => m === "split" ? "slider" : "split")}
              className="text-xs px-2 py-1.5 rounded-md border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
              title="Toggle compare mode"
            >
              {compareMode === "split" ? "Slider View" : "Split View"}
            </button>
            <button
              onClick={() => { setCompareResult(null); setCompareOpen(true); }}
              className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800"
              title="Compare this photo rendered with a different preset"
            >
              Compare preset
            </button>
          </div>
          {suggestion && (
            <div className="text-xs px-3 py-2 rounded bg-purple-50 border border-purple-200 flex items-center gap-2 hidden md:flex">
              <span><strong>Suggested: {suggestion.preset}</strong> — {suggestion.reasoning}</span>
              <button
                onClick={() => { changePreset(suggestion.preset); setSuggestion(null); }}
                className="ml-2 text-cyan-600 font-semibold hover:underline"
              >Apply</button>
              <button
                onClick={() => setSuggestion(null)}
                className="ml-1 text-graphite-400 hover:text-graphite-600 dark:text-graphite-300"
              >Dismiss</button>
            </div>
          )}
          <NotesPopover jobId={job.id} initialNotes={job.notes ?? null} />
          <button
            onClick={() => setShowWatermarkPanel(p => !p)}
            className={`text-xs px-2 py-1.5 rounded-md border transition-colors ${showWatermarkPanel ? "border-cyan bg-cyan-50 text-cyan" : "border-graphite-200 bg-white text-graphite-700 hover:bg-graphite-50"}`}
            title="Watermark settings"
          >
            {job.watermarkText ? "Watermark ✓" : "Watermark"}
          </button>
          <ReingestButton jobId={job.id} />
          <button
            onClick={async () => {
              if (!confirm("Re-group ALL photos using EXIF data? This will reset all photos to pending. Existing edits will be lost.")) return;
              const res = await fetch(`/api/jobs/${job.id}/regroup-by-exif`, { method: "POST" });
              const data = await res.json();
              if (res.ok) {
                addToast("success", `Regrouped into ${data.groupCount} sets (${data.bracketCount}-bracket detected)`);
                window.location.reload();
              } else {
                addToast("error", data.error || "Regroup failed");
              }
            }}
            className="text-xs px-2 py-1.5 rounded-md bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-200"
            title="Re-group photos using actual EXIF data (slow)"
          >
            Regroup by EXIF
          </button>
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-xs font-semibold text-graphite-700 dark:text-graphite-200">
              {approvedCount} / {photos.length} approved
            </div>
            <div className="w-[120px] h-1 bg-graphite-200 rounded-sm mt-1">
              <div
                className="h-1 bg-emerald-500 rounded-sm transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 hidden md:flex">
            {photos.filter(p => p.status === "approved").length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                ✓ {photos.filter(p => p.status === "approved").length}
              </span>
            )}
            {photos.filter(p => p.status === "rejected").length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                ✗ {photos.filter(p => p.status === "rejected").length}
              </span>
            )}
            {photos.filter(p => p.status === "edited").length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan">
                ⏳ {photos.filter(p => p.status === "edited").length}
              </span>
            )}
            {photos.filter(p => p.status === "pending").length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-200">
                ○ {photos.filter(p => p.status === "pending").length}
              </span>
            )}
          </div>
          {failedCount > 0 && (
            <button
              onClick={handleRetryFailed}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200"
              title={`Retry ${failedCount} failed photos`}
            >
              Retry Failed ({failedCount})
            </button>
          )}
          {photos.some(p => p.status === "pending") && (
            <Button onClick={handleEnhanceAll} disabled={isEnhancingAll}>
              <ArrowPathIcon className={`w-4 h-4 ${isEnhancingAll ? 'animate-spin' : ''}`} />
              {isEnhancingAll ? `Enhancing ${enhanceProgress}%` : `Enhance All (${photos.filter(p => p.status === "pending").length})`}
            </Button>
          )}
          {(job.status === "review" || job.status === "approved") && photos.some(p => p.status === "approved") && (
            <button
              onClick={generateDescription}
              disabled={generating}
              className="text-xs px-3 py-1.5 rounded border border-purple-500 text-purple-600 hover:bg-purple-50 disabled:opacity-60"
            >
              {generating ? "Writing..." : "✨ Generate listing"}
            </button>
          )}
          {photos.some(p => p.status === "approved") && (
            <button onClick={async () => {
              if (!confirm(`Generate captions for all approved photos without one? (Costs ~$0.001 each)`)) return;
              const res = await fetch(`/api/jobs/${job.id}/captions`, { method: "POST" });
              const data = await res.json();
              alert(`Generated ${data.success} captions (${data.failed} failed)`);
              window.location.reload();
            }} className="text-xs px-3 py-1.5 rounded border border-purple-500 text-purple-600 hover:bg-purple-50">
              💬 Caption all
            </button>
          )}
          {job.status === "approved" && (
            <button
              onClick={() => setInvoicePreviewOpen(true)}
              className="text-xs px-2 py-1.5 rounded border border-graphite-200 hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
            >
              Invoice
            </button>
          )}
          {job.status === "approved" && (
            <a
              href={`/api/jobs/${job.id}/pdf-gallery`}
              download
              className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
            >
              📄 PDF Gallery
            </a>
          )}
          <a href={`/api/jobs/${job.id}/contact-sheet`} download
            className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
            📋 Contact sheet
          </a>
          <a href={`/api/jobs/${job.id}/photos-csv`} download
            className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
            title="Export photos metadata as CSV">
            📊 Photos CSV
          </a>
          {job.status === "approved" && (
            <div className="flex items-center gap-1">
              <button
                onClick={syncToDropbox}
                disabled={syncing}
                className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-60"
              >
                {syncing ? "Syncing..." : "📦 Sync to Dropbox"}
              </button>
              <InfoTooltip text="Uploads approved photos to a shared Dropbox folder so your client can access them directly." position="bottom" />
            </div>
          )}
          {syncResult?.shareLink && (
            <a
              href={syncResult.shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan underline"
            >
              View folder →
            </a>
          )}
          <SaveTemplateButton jobId={job.id} />
          <ReminderButton jobId={job.id} reminderAt={job.reminderAt} reminderNote={job.reminderNote} />
          <ShareButton
            jobId={job.id}
            initialToken={job.shareToken ?? null}
            initialEnabled={job.shareEnabled ?? false}
          />
          {slideshowPhotos.length > 0 && (
            <button
              onClick={() => setSlideshowOpen(true)}
              className="text-xs px-3 py-1.5 rounded bg-purple-500 text-white font-semibold hover:bg-purple-600"
              title="Fullscreen slideshow of approved photos"
            >
              ▶ Present ({slideshowPhotos.length})
            </button>
          )}
          <Button variant="approve" onClick={handleApproveAll} disabled={isUpdating}>
            <CheckCircleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Approve All</span>
          </Button>
          <button
            onClick={async () => {
              if (!confirm("Reject all pending and edited photos?")) return;
              const r = await fetch(`/api/jobs/${job.id}/reject-all-pending`, { method: "POST" });
              if (r.ok) {
                const d = await r.json();
                addToast("success", `Rejected ${d.rejected} photos`);
                window.location.reload();
              }
            }}
            className="text-xs px-2 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
            title="Reject all unfinished photos"
          >
            Reject All
          </button>
          <button
            onClick={async () => {
              if (!confirm("Re-enhance ALL edited photos? This costs more credits.")) return;
              const r = await fetch(`/api/jobs/${job.id}/reset-edited`, { method: "POST" });
              if (r.ok) {
                const d = await r.json();
                addToast("info", `Reset ${d.reset} photos for re-enhancement. Click Enhance All to process.`);
                window.location.reload();
              }
            }}
            className="text-xs px-2 py-1.5 rounded-md bg-cyan-50 text-cyan hover:bg-cyan-100"
            title="Re-run AI on all edited photos"
          >
            Re-Enhance All
          </button>
          {/* Batch re-enhance with preset switching */}
          <div className="flex items-center gap-1.5 border border-amber-200 rounded-md px-2 py-1 bg-amber-50">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value as "rejected" | "all")}
              className="text-xs px-1.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900"
              disabled={batching}
            >
              <option value="rejected">Rejected only</option>
              <option value="all">All photos</option>
            </select>
            <select
              value={batchPreset}
              onChange={(e) => setBatchPreset(e.target.value)}
              className="text-xs px-1.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900"
              disabled={batching}
            >
              {presets.length > 0
                ? presets.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))
                : (
                  <>
                    <option value="standard">Standard</option>
                    <option value="bright-airy">Bright &amp; Airy</option>
                    <option value="luxury">Luxury</option>
                    <option value="flambient">Flambient</option>
                  </>
                )}
            </select>
            <button
              onClick={runBatchEnhance}
              disabled={batching}
              className="text-xs px-2.5 py-1 rounded bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60 whitespace-nowrap"
              title="Re-enhance rejected (or all) photos with the selected preset"
            >
              {batching ? "Running..." : "Re-enhance batch"}
            </button>
          </div>
          {selectMode && selectedPhotoIds.size > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-xs font-semibold text-cyan">{selectedPhotoIds.size} selected</span>

              <button
                onClick={runSelectedPhotosEnhance}
                disabled={batching}
                className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold hover:bg-cyan/90 disabled:opacity-60 whitespace-nowrap"
                title={`Re-enhance ${selectedPhotoIds.size} selected photo${selectedPhotoIds.size === 1 ? '' : 's'} with the selected preset`}
              >
                {batching ? "Running..." : `Re-enhance`}
              </button>

              <button
                onClick={() => bulkUpdatePhotos("approve")}
                disabled={batching}
                className="text-xs px-2 py-1 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60 whitespace-nowrap"
                title="Approve selected photos"
              >
                ✓ Approve
              </button>

              <button
                onClick={() => bulkUpdatePhotos("reject")}
                disabled={batching}
                className="text-xs px-2 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-60 whitespace-nowrap"
                title="Reject selected photos"
              >
                ✗ Reject
              </button>

              <button
                onClick={() => bulkUpdatePhotos("favorite")}
                disabled={batching}
                className="text-xs px-2 py-1 rounded bg-amber-400 text-white font-semibold hover:bg-amber-500 disabled:opacity-60 whitespace-nowrap"
                title="Favorite selected photos"
              >
                ★ Favorite
              </button>

              <button
                onClick={() => bulkUpdatePhotos("clearStatus")}
                disabled={batching}
                className="text-xs px-2 py-1 rounded bg-graphite-400 text-white font-semibold hover:bg-graphite-500 disabled:opacity-60 whitespace-nowrap"
                title="Clear status from selected photos"
              >
                ✕ Clear
              </button>

              <button
                onClick={downloadSelected}
                disabled={batching}
                className="text-xs px-2 py-1 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60 whitespace-nowrap"
                title="Download selected photos as ZIP"
              >
                📦 Download
              </button>

              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  placeholder="Note text"
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white w-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyBulkNote();
                    }
                  }}
                />
                <button
                  onClick={applyBulkNote}
                  disabled={!bulkNote.trim() || batching}
                  className="text-xs px-2 py-1 rounded bg-slate-500 text-white font-semibold hover:bg-slate-600 disabled:opacity-60 whitespace-nowrap"
                  title="Add note to selected photos"
                >
                  📝 Add note
                </button>
              </div>

              <button
                onClick={() => { setSelectedPhotoIds(new Set()); setSelectMode(false); }}
                disabled={batching}
                className="text-xs px-2 py-1 rounded text-graphite-600 dark:text-graphite-300 ml-auto hover:bg-graphite-100 dark:hover:bg-graphite-800 disabled:opacity-60"
                title="Cancel selection"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-1">
            <select
              value={zipFormat}
              onChange={(e) => setZipFormat(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
            >
              <option value="jpeg-95">JPEG 95% (largest, best)</option>
              <option value="jpeg-90">JPEG 90% (default)</option>
              <option value="jpeg-85">JPEG 85% (web)</option>
              <option value="jpeg-75">JPEG 75% (smallest)</option>
              <option value="png">PNG (lossless)</option>
            </select>
            <a
              href={`/api/jobs/${job.id}/download-zip?format=${zipFormat}`}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
              onClick={(e) => e.stopPropagation()}
              download
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Download ZIP</span>
            </a>
          </div>
          <div className="flex gap-1">
            <select
              value={mlsPreset}
              onChange={(e) => setMlsPreset(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-graphite-200 dark:border-graphite-700"
            >
              <option value="mls-standard">MLS Standard (1024)</option>
              <option value="mls-hi">MLS Hi-Res (1920)</option>
              <option value="mls-4k">MLS 4K (3840)</option>
              <option value="web">Web (1600)</option>
              <option value="social">Social Square (1080)</option>
              <option value="social-portrait">Instagram Portrait (1080×1350)</option>
              <option value="story">Story / Reel (1080×1920)</option>
              <option value="video-16x9">Video 16:9 (1920×1080)</option>
              <option value="realtor-ca">Realtor.ca (1024×683)</option>
            </select>
            <a
              href={`/api/jobs/${job.id}/download-mls?preset=${mlsPreset}`}
              className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold hover:bg-cyan-600"
              onClick={(e) => e.stopPropagation()}
              download
            >
              Download MLS
            </a>
          </div>
          <Button variant="outline" onClick={handleDropboxFolder} title="Open Dropbox folder">
            <FolderOpenIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Dropbox</span>
          </Button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {showMobileNav && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setShowMobileNav(false)}>
          <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-graphite-900 rounded-t-2xl max-h-[70vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-graphite-900 dark:text-white">Photos ({photos.length})</span>
              <button onClick={() => setShowMobileNav(false)} className="p-1 rounded-lg hover:bg-graphite-100 dark:bg-graphite-800">
                <XMarkIcon className="w-5 h-5 text-graphite-600 dark:text-graphite-300" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => { setCurrentIndex(idx); setShowMobileNav(false); }}
                  className={`aspect-[3/2] rounded overflow-hidden border-2 ${idx === currentIndex ? 'border-cyan' : 'border-transparent'} ${
                    photo.status === 'approved' ? 'bg-emerald-100' : photo.status === 'rejected' ? 'bg-red-100' : 'bg-graphite-100'
                  }`}
                >
                  {(photo.editedUrl || photo.originalUrl) ? (
                    <img src={photo.editedUrl || photo.originalUrl || `/api/jobs/${job.id}/photos/${photo.id}/original`} className="w-full h-full object-cover" loading="lazy" alt={`Photo ${idx + 1}`} />
                  ) : (
                    <span className="text-[11px] text-graphite-500 dark:text-graphite-400">{idx + 1}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs font-mono bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white focus:outline-none focus:border-amber-500"
            placeholder="AI prompt instructions..."
          />
          <PromptLinter text={editedPrompt} />
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
              className="px-3 py-1.5 rounded-md border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Per-job custom prompt override */}
      <details className="text-sm bg-white dark:bg-graphite-900 border-b border-graphite-200 dark:border-graphite-700 px-7 py-3">
        <summary className="cursor-pointer text-xs text-graphite-500 dark:text-graphite-400 hover:text-cyan font-semibold">
          🎯 Per-job custom instructions {customOverride ? "(set)" : ""}
        </summary>
        <div className="mt-3 space-y-2">
          <textarea
            value={customOverride}
            onChange={(e) => setCustomOverride(e.target.value)}
            rows={3}
            placeholder="Special instructions just for this job (e.g. 'Preserve original sky color', 'Avoid warming kitchen')"
            className="w-full text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-graphite-400">
              Applied to all enhance + re-enhance for this job
            </span>
            <div className="flex items-center gap-2">
              {overrideSaved && <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>}
              <button onClick={saveOverride} disabled={savingOverride}
                className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold hover:bg-cyan-600 disabled:opacity-50">
                {savingOverride ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* Watermark Settings Panel */}
      {showWatermarkPanel && (
        <div className="bg-graphite-50 dark:bg-graphite-900 border-b border-graphite-200 dark:border-graphite-700 px-7 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-graphite-800">Watermark Settings</span>
            <span className="text-[11px] text-graphite-500 dark:text-graphite-400">Applied when downloading ZIP</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {/* Text */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-graphite-700 dark:text-graphite-200 w-20 flex-shrink-0">Text</label>
                <input
                  type="text"
                  value={wmText}
                  onChange={(e) => setWmText(e.target.value)}
                  placeholder="e.g. © 2026 Your Photography Co."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-graphite-200 dark:border-graphite-700 text-xs text-graphite-900 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                />
              </div>
              {/* Position */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-graphite-700 dark:text-graphite-200 w-20 flex-shrink-0">Position</label>
                <select
                  value={wmPosition}
                  onChange={(e) => setWmPosition(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-graphite-200 dark:border-graphite-700 text-xs text-graphite-900 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
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
                <label className="text-xs font-semibold text-graphite-700 dark:text-graphite-200 w-20 flex-shrink-0">Size</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={wmSize}
                  onChange={(e) => setWmSize(Number(e.target.value))}
                  className="flex-1 accent-cyan"
                />
                <span className="text-xs text-graphite-500 dark:text-graphite-400 w-10 text-right">{wmSize}px</span>
              </div>
              {/* Opacity */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-graphite-700 dark:text-graphite-200 w-20 flex-shrink-0">Opacity</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(wmOpacity * 100)}
                  onChange={(e) => setWmOpacity(Number(e.target.value) / 100)}
                  className="flex-1 accent-cyan"
                />
                <span className="text-xs text-graphite-500 dark:text-graphite-400 w-10 text-right">{Math.round(wmOpacity * 100)}%</span>
              </div>
            </div>
            {/* Live preview */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-graphite-500 dark:text-graphite-400">Preview</span>
              <div className="relative w-full h-28 bg-graphite-300 rounded-lg overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-graphite-400 to-graphite-500 flex items-center justify-center">
                  <span className="text-graphite-600 dark:text-graphite-300 text-xs">Sample photo</span>
                </div>
                {wmText.trim() && (
                  <span
                    className="absolute text-white font-semibold pointer-events-none select-none leading-none"
                    style={{
                      fontSize: `${Math.max(8, Math.round(wmSize * 0.4))}px`,
                      opacity: wmOpacity,
                      textShadow: `0 0 3px rgba(0,0,0,${wmOpacity * 0.5})`,
                      ...(wmPosition === "top-left" && { top: 8, left: 10 }),
                      ...(wmPosition === "top-right" && { top: 8, right: 10 }),
                      ...(wmPosition === "bottom-left" && { bottom: 8, left: 10 }),
                      ...(wmPosition === "bottom-right" && { bottom: 8, right: 10 }),
                      ...(wmPosition === "center" && { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }),
                    }}
                  >
                    {wmText}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveWatermarkSettings}
              disabled={savingWatermark}
              className="px-3 py-1.5 rounded-md bg-cyan text-white text-xs font-semibold hover:bg-cyan-600 disabled:opacity-50"
            >
              {savingWatermark ? "Saving..." : "Save Watermark"}
            </button>
            <button
              onClick={() => setShowWatermarkPanel(false)}
              className="px-3 py-1.5 rounded-md border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Strip - hidden on mobile */}
        <div className="hidden md:flex w-[100px] bg-white dark:bg-graphite-900 border-r border-graphite-200 dark:border-graphite-700 flex-col flex-shrink-0">
          {/* Filter pills */}
          <div className="flex flex-col gap-0.5 p-1 border-b border-graphite-200 dark:border-graphite-700 flex-shrink-0">
            <div className="flex gap-0.5">
              {[
                { v: "all" as const, l: "All" },
                { v: "favorites" as const, l: "★" },
                { v: "edited" as const, l: "New" },
                { v: "approved" as const, l: "✓" },
                { v: "rejected" as const, l: "✗" },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setThumbFilter(opt.v)}
                  className={`flex-1 text-[9px] font-semibold py-1 rounded ${
                    thumbFilter === opt.v ? "bg-graphite-900 text-white" : "text-graphite-500 hover:bg-graphite-100"
                  }`}
                >{opt.l}</button>
              ))}
            </div>
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[9px] px-1.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white bg-white text-graphite-700 w-full"
            >
              <option value="order">Manual order</option>
              <option value="name">Name A-Z</option>
              <option value="date">Newest first</option>
              <option value="flagged">Quality flagged first</option>
              <option value="rejected">Rejected first</option>
            </select>
            {/* Smart sort button */}
            <button
              onClick={handleSmartSort}
              disabled={sorting}
              title="Reorder photos by MLS-standard sequence using AI room detection. Photos without auto-tags fall to the end."
              className="text-[9px] px-1.5 py-1 rounded border border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 disabled:opacity-50 disabled:cursor-not-allowed w-full font-semibold"
            >
              {sorting ? "Sorting..." : "🪄 Smart sort"}
            </button>
            {/* Tag all photos button */}
            <button
              onClick={handleTagAllPhotos}
              disabled={tagging}
              title="AI auto-tags all photos in this job that don't have tags yet"
              className="text-[9px] px-1.5 py-1 rounded border border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 disabled:opacity-50 disabled:cursor-not-allowed w-full font-semibold"
            >
              {tagging ? "Tagging..." : "🏷️ Tag all"}
            </button>
            {/* Select mode toggle */}
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedPhotoIds(new Set());
              }}
              className={`text-[9px] px-1.5 py-1 rounded font-semibold transition-colors ${
                selectMode
                  ? "bg-cyan text-white"
                  : "border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 text-graphite-700 hover:bg-graphite-100 dark:hover:bg-graphite-800"
              }`}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
            {selectMode && selectedPhotoIds.size > 0 && (
              <div className="text-[9px] font-semibold text-cyan bg-cyan/10 rounded px-2 py-1 text-center">
                {selectedPhotoIds.size} selected
              </div>
            )}
            {/* Room type filter */}
            {allTags.length > 0 && (
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
                className="text-[9px] px-1.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white bg-white text-graphite-700 w-full"
              >
                <option value="">All rooms</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
          {/* Scrollable thumbnail list */}
          <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                {sortedPhotos.map((photo, idx) => {
                  if (thumbFilter === "favorites" && !photo.isFavorite) return null;
                  if (thumbFilter !== "all" && thumbFilter !== "favorites" && photo.status !== thumbFilter) return null;
                  if (tagFilter) {
                    try {
                      const tags = photo.autoTags ? JSON.parse(photo.autoTags) : [];
                      if (!Array.isArray(tags) || !tags.includes(tagFilter)) return null;
                    } catch { return null; }
                  }
                  return (
                    <SortableThumb key={photo.id} id={photo.id}>
                      <button
                        onClick={() => setCurrentIndex(sortedPhotos.findIndex(p => p.id === photo.id))}
                        onMouseEnter={(e) => {
                          if (!hoverEnabled) return;
                          const src = photo.editedUrl || photo.originalUrl || "";
                          setHoverPreview({ src, x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={(e) => {
                          if (!hoverEnabled || !hoverPreview) return;
                          setHoverPreview({ ...hoverPreview, x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHoverPreview(null)}
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
                        <div className="relative w-full h-full">
                          {(photo.editedUrl && (photo.status === "edited" || photo.status === "approved")) ? (
                            <LazyThumb
                              src={photo.editedUrl}
                              alt={`Photo ${idx + 1}`}
                              imgClassName="w-full h-full object-cover rounded-md"
                              className="w-full h-full"
                            />
                          ) : (photo.originalUrl || photo.status !== "processing") ? (
                            <LazyThumb
                              src={photo.originalUrl || `/api/jobs/${job.id}/photos/${photo.id}/original`}
                              alt={`Photo ${idx + 1}`}
                              imgClassName="w-full h-full object-cover rounded-md"
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-graphite-400 font-medium">
                              ...
                            </div>
                          )}
                          {/* Status overlay */}
                          {photo.status === "approved" && (
                            <div className="absolute inset-0 ring-2 ring-emerald-500 rounded">
                              <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">✓</div>
                            </div>
                          )}
                          {photo.status === "rejected" && (
                            <div className="absolute inset-0 ring-2 ring-red-500 rounded bg-red-500/30">
                              <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">✗</div>
                              {photo.rejectionReason && (
                                <div className="absolute bottom-1 left-1 right-1 text-[8px] text-red-600 bg-white dark:bg-graphite-900/80 rounded px-1 py-0.5 truncate font-medium">
                                  {photo.rejectionReason}
                                </div>
                              )}
                            </div>
                          )}
                          {photo.status === "edited" && (
                            <div className="absolute inset-0 ring-2 ring-cyan rounded animate-pulse" />
                          )}
                          {photo.status === "regenerating" && (
                            <div className="absolute inset-0 bg-graphite-900/60 flex items-center justify-center rounded">
                              <div className="w-3 h-3 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {photo.isTwilight && (
                          <MoonIcon className="absolute bottom-0.5 left-0.5 w-3 h-3 text-purple-600" />
                        )}
                        {photo.isFavorite && (
                          <div className="absolute top-1 right-1 text-amber-400 text-sm drop-shadow">★</div>
                        )}
                        {photo.flagged && (
                          <div className="absolute top-1 left-1 text-orange-400 text-sm drop-shadow z-10" title="Flagged">🚩</div>
                        )}
                        {photo.note && (
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 drop-shadow" title="Has note" />
                        )}
                        {photo.qualityFlags && (() => {
                          try {
                            const f = JSON.parse(photo.qualityFlags);
                            const hasIssue = f.blurry || f.underexposed || f.overexposed || f.lowContrast;
                            return hasIssue ? (
                              <span className="absolute top-0.5 left-0.5 text-[8px] font-bold text-amber-700 bg-amber-100/90 rounded px-0.5">⚠</span>
                            ) : null;
                          } catch { return null; }
                        })()}
                        {photo.autoTags && (() => {
                          try {
                            const tags = JSON.parse(photo.autoTags);
                            if (!Array.isArray(tags) || tags.length === 0) return null;
                            return (
                              <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-0.5 p-0.5 bg-black/40 pointer-events-none">
                                {tags.slice(0, 2).map((t: string) => (
                                  <span key={t} className="text-[8px] text-white bg-graphite-900/70 px-1 rounded">{t}</span>
                                ))}
                              </div>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                        {/* Multi-select checkbox overlay */}
                        {selectMode && (
                          <div
                            className="absolute top-1 left-1 w-5 h-5 rounded bg-white/90 border-2 border-cyan flex items-center justify-center cursor-pointer hover:bg-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSet = new Set(selectedPhotoIds);
                              if (newSet.has(photo.id)) {
                                newSet.delete(photo.id);
                              } else {
                                newSet.add(photo.id);
                              }
                              setSelectedPhotoIds(newSet);
                            }}
                          >
                            {selectedPhotoIds.has(photo.id) && (
                              <span className="text-cyan text-sm font-bold">✓</span>
                            )}
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-graphite-500 dark:text-graphite-400">
                          {idx + 1}
                        </span>
                      </button>
                    </SortableThumb>
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 flex flex-col" {...swipe}>
          {viewMode === "grid" ? (
            <GridView
              photos={sortedPhotos}
              cols={gridCols}
              jobId={job.id}
              onPhotoClick={(id) => {
                const idx = sortedPhotos.findIndex(p => p.id === id);
                if (idx >= 0) {
                  setCurrentIndex(idx);
                  setViewMode("single");
                }
              }}
            />
          ) : (
            <>
              {/* Before / After Compare */}
              <div className="flex-1 bg-graphite-900 min-h-0 p-2 md:p-4">
            {compareMode === "slider" && currentPhoto ? (
              <div className="w-full h-full rounded-lg overflow-hidden">
                <BeforeAfterSlider
                  beforeUrl={currentPhoto.originalUrl || `/api/jobs/${job.id}/photos/${currentPhoto.id}/original`}
                  afterUrl={currentPhoto.editedUrl}
                  isLoading={enhanceLoading}
                  loadingText={`Enhancing Photo ${currentIndex + 1} with AI...`}
                />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-0.5 w-full h-full relative">
                {/* Zoom level indicator + reset (shown when zoomed) */}
                {zoom > 1 && (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                      className="ml-1 px-1.5 py-0.5 rounded bg-white/20 hover:bg-white dark:bg-graphite-900/30 text-[10px]"
                    >Reset</button>
                  </div>
                )}
                {/* Zoom hint */}
                {showZoomHint && zoom === 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                    Click to zoom · Scroll to zoom · Drag to pan
                  </div>
                )}
                {/* Before */}
                <div className="flex-1 rounded-lg overflow-hidden relative bg-graphite-800">
                  <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm z-10 pointer-events-none">
                    Before
                  </div>
                  {currentPhoto ? (
                    <ZoomableImage
                      src={currentPhoto.originalUrl || `/api/jobs/${job.id}/photos/${currentPhoto.id}/original`}
                      alt="Before"
                      zoom={zoom}
                      pan={pan}
                      onZoomChange={setZoom}
                      onPanChange={setPan}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-graphite-500 dark:text-graphite-400 text-sm">Original HDR Merge</div>
                  )}
                </div>

                {/* After */}
                <div className="flex-1 rounded-lg overflow-hidden relative bg-graphite-800">
                  <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm z-10 pointer-events-none">
                    After
                  </div>
                  {/* Crop suggestion overlay */}
                  {cropSuggestion && currentPhoto && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                      <div
                        className="absolute border-4 border-purple-500 bg-purple-500/10 pointer-events-auto"
                        style={{
                          left: `${cropSuggestion.x}%`,
                          top: `${cropSuggestion.y}%`,
                          width: `${cropSuggestion.width}%`,
                          height: `${cropSuggestion.height}%`,
                        }}
                      >
                        <div className="absolute -top-8 left-0 flex gap-1">
                          <button
                            onClick={applyCrop}
                            className="text-xs px-2 py-1 bg-purple-500 text-white rounded font-semibold"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => setCropSuggestion(null)}
                            className="text-xs px-2 py-1 bg-graphite-200 rounded"
                          >
                            Dismiss
                          </button>
                        </div>
                        <div className="absolute -bottom-6 left-0 right-0 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded truncate">
                          {cropSuggestion.reasoning}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentPhoto?.editedUrl ? (
                    <ZoomableImage
                      src={currentPhoto.editedUrl}
                      alt="After"
                      zoom={zoom}
                      pan={pan}
                      onZoomChange={setZoom}
                      onPanChange={setPan}
                    />
                  ) : enhanceLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
                      <ArrowPathIcon className="w-8 h-8 text-cyan animate-spin" />
                      <div className="text-cyan text-sm font-medium">Enhancing Photo {currentIndex + 1} with AI...</div>
                      <div className="text-graphite-500 dark:text-graphite-400 text-xs">This may take 15-30 seconds</div>
                    </div>
                  ) : enhanceError ? (
                    <div className="flex flex-col items-center justify-center gap-2 w-full h-full max-w-sm text-center px-4">
                      <div className="text-red-400 text-sm font-medium">Enhancement failed</div>
                      <div className="text-graphite-500 dark:text-graphite-400 text-xs">{enhanceError}</div>
                      <button
                        onClick={handleRegenerate}
                        className="mt-2 px-4 py-1.5 rounded-lg bg-cyan/20 text-cyan text-xs font-semibold hover:bg-cyan/30 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-graphite-500 dark:text-graphite-400 text-sm">
                      {currentPhoto?.status === "regenerating"
                        ? "Regenerating..."
                        : "Click 'Enhance with AI' to edit this photo"}
                    </div>
                  )}
                  {currentPhoto?.errorMessage && !enhanceLoading && !currentPhoto.editedUrl && (
                    <div className="absolute inset-x-4 bottom-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                      <div className="font-semibold mb-1">Last enhancement failed (attempt {currentPhoto.errorAttempts}):</div>
                      <div className="font-mono opacity-80">{currentPhoto.errorMessage.substring(0, 200)}</div>
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
                  {/* Quality flag badges */}
                  {currentPhoto?.qualityFlags && (() => {
                    try {
                      const f = JSON.parse(currentPhoto.qualityFlags);
                      const warnings: string[] = [];
                      if (f.blurry) warnings.push("Blurry?");
                      if (f.underexposed) warnings.push("Dark");
                      if (f.overexposed) warnings.push("Blown");
                      if (f.lowContrast) warnings.push("Flat");
                      return warnings.length ? (
                        <div className="absolute bottom-2.5 left-2.5 z-10">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            ⚠ {warnings.join(" · ")}
                          </span>
                        </div>
                      ) : null;
                    } catch { return null; }
                  })()}
                  {/* Pin annotations overlay */}
                  {currentPhoto && (
                    <PhotoPins jobId={job.id} photoId={currentPhoto.id} enabled={pinMode} />
                  )}
                </div>
              </div>
            )}
              </div>
            </>
          )}

          {/* EXIF Info Panel */}
          {currentPhoto && (
            <div className="bg-graphite-50 dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-3">
              <ExifPanel exifData={currentPhoto.exifData} imageUrl={currentPhoto.editedUrl || currentPhoto.originalUrl} widthPx={(currentPhoto as any).widthPx} heightPx={(currentPhoto as any).heightPx} />
            </div>
          )}

          {/* Enhancement Version History */}
          {currentPhoto && (
            <div className="bg-graphite-50 dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-2">
              <PhotoVersions jobId={job.id} photoId={currentPhoto.id} />
            </div>
          )}

          {/* Photo Note */}
          {currentPhoto && (
            <div className="bg-graphite-50 dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-2">
              <PhotoNote jobId={job.id} photoId={currentPhoto.id} initialNote={currentPhoto.note} />
            </div>
          )}

          {/* Photo Caption */}
          {currentPhoto && (
            <div className="bg-graphite-50 dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-2 flex items-center gap-2 flex-wrap">
              {currentPhoto.caption ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs px-2 py-1 rounded bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-300 italic flex-1 min-w-0 truncate">
                    &ldquo;{currentPhoto.caption}&rdquo;
                  </span>
                  <button onClick={generateCaption} disabled={generatingCaption}
                    className="ml-1 text-cyan hover:underline text-[10px] whitespace-nowrap disabled:opacity-50">
                    {generatingCaption ? "Writing..." : "regenerate"}
                  </button>
                </div>
              ) : (
                <button onClick={generateCaption} disabled={generatingCaption}
                  className="text-xs px-2 py-1 rounded border border-purple-500 text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                  {generatingCaption ? "Writing..." : "💬 Generate caption"}
                </button>
              )}
            </div>
          )}

          {/* Failed Photo Banner */}
          {currentPhoto?.status === "failed" && (
            <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-3 md:px-6 py-3">
              <div className="flex flex-col gap-2">
                <div>
                  <strong className="text-red-800 dark:text-red-200">Enhance failed after multiple retries.</strong>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">The AI couldn't process this photo after {currentPhoto.retryCount} attempts. You can retry manually or skip it.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/jobs/${job.id}/photos/${currentPhoto.id}/retry`, { method: "POST" });
                      if (res.ok) {
                        setJob(prev => ({
                          ...prev,
                          photos: prev.photos.map(p =>
                            p.id === currentPhoto.id ? { ...p, status: "pending", retryCount: 0 } : p
                          ),
                        }));
                        addToast("success", "Photo reset for retry");
                      } else {
                        addToast("error", "Failed to reset photo");
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                  >
                    Retry now
                  </button>
                  <button
                    onClick={handleReject}
                    className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold"
                  >
                    Mark as rejected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Internal Job Comments */}
          <div className="bg-graphite-50 dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-2">
            <JobComments jobId={job.id} />
          </div>

          {/* Client Ratings */}
          {currentPhoto && currentPhoto.ratings && currentPhoto.ratings.length > 0 && (() => {
            const ratings = currentPhoto.ratings!;
            const avg = ratings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / ratings.length;
            return (
              <div className="bg-graphite-50 dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-2">
                <div className="text-xs text-amber-600 font-semibold">
                  ★ {avg.toFixed(1)} client rating ({ratings.length})
                </div>
              </div>
            );
          })()}

          {/* Action Bar */}
          <div className="bg-white dark:bg-graphite-900 border-t border-graphite-200 dark:border-graphite-700 px-3 md:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="w-8 h-8 rounded-lg bg-graphite-100 dark:bg-graphite-800 flex items-center justify-center hover:bg-graphite-200 transition-colors disabled:opacity-30"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-graphite-700 dark:text-graphite-200" />
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex === photos.length - 1}
                  className="w-8 h-8 rounded-lg bg-graphite-100 dark:bg-graphite-800 flex items-center justify-center hover:bg-graphite-200 transition-colors disabled:opacity-30"
                >
                  <ChevronRightIcon className="w-4 h-4 text-graphite-700 dark:text-graphite-200" />
                </button>
              </div>
              {/* Pin mode toggle */}
              <button
                onClick={() => setPinMode(!pinMode)}
                className={`text-xs px-3 py-1.5 rounded ${pinMode ? "bg-amber-500 text-white" : "border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"}`}
                title={pinMode ? "Click on the photo to drop a pin" : "Annotate photo with pins"}
              >
                {pinMode ? "📍 Pin mode (click to add)" : "📍 Annotate"}
              </button>
              {/* View Mode Toggle */}
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => setViewMode("single")}
                  className={`text-xs px-2 py-1.5 rounded transition-colors ${viewMode === "single" ? "bg-cyan text-white" : "border border-graphite-200 dark:border-graphite-700 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-100 dark:hover:bg-graphite-800"}`}
                  title="Single photo view"
                >
                  ▦
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`text-xs px-2 py-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-cyan text-white" : "border border-graphite-200 dark:border-graphite-700 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-100 dark:hover:bg-graphite-800"}`}
                  title="Grid view"
                >
                  ⊞
                </button>
                {viewMode === "grid" && (
                  <select
                    value={gridCols}
                    onChange={(e) => setGridCols(parseInt(e.target.value) as 2 | 3 | 4)}
                    className="text-[10px] px-1.5 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white bg-white text-graphite-700 hover:border-graphite-300"
                  >
                    <option value={2}>2 cols</option>
                    <option value={3}>3 cols</option>
                    <option value={4}>4 cols</option>
                  </select>
                )}
              </div>
              <div>
                <span className="text-sm font-semibold text-graphite-900 dark:text-white">
                  Photo {currentIndex + 1}
                </span>
                <span className="text-xs text-graphite-400 ml-1">
                  of {photos.length}
                </span>
              </div>
              <button
                onClick={() => {
                  const nextIdx = photos.findIndex((p, i) => i > currentIndex && p.status === "edited");
                  if (nextIdx >= 0) setCurrentIndex(nextIdx);
                }}
                className="text-xs px-2 py-1 rounded bg-graphite-100 dark:bg-graphite-800 hover:bg-graphite-200 text-graphite-700 dark:text-graphite-200"
                title="Jump to next photo needing review"
              >
                Next pending
              </button>
              <TimeTracker jobId={job.id} initialSeconds={job.trackedTimeSeconds || 0} />
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
                <span className="hidden sm:inline">Approve</span>
              </button>
              <div className="flex gap-1 items-center">
                <select
                  value={rejectionReasonDefault}
                  onChange={(e) => setRejectionReasonDefault(e.target.value)}
                  disabled={isUpdating || enhanceLoading}
                  className="text-xs px-2 py-2 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white hover:border-graphite-300 disabled:opacity-50"
                >
                  <option value="">No reason</option>
                  <option value="blurry">Blurry</option>
                  <option value="dark">Too dark</option>
                  <option value="blown">Too bright</option>
                  <option value="colors">Wrong colors</option>
                  <option value="hallucination">AI hallucination</option>
                  <option value="straighten">Not straightened</option>
                </select>
                <button
                  onClick={handleReject}
                  disabled={isUpdating || enhanceLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Reject</span>
                </button>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isUpdating || enhanceLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-50 text-cyan hover:bg-cyan-50/80 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
              <div className="flex gap-0.5">
                <button onClick={() => rotate(-90)} disabled={rotating || isUpdating || enhanceLoading}
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50"
                  title="Rotate left (90° counter-clockwise)">
                  ↺
                </button>
                <button onClick={() => rotate(90)} disabled={rotating || isUpdating || enhanceLoading}
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50"
                  title="Rotate right (90° clockwise)">
                  ↻
                </button>
                <button onClick={() => rotate(180)} disabled={rotating || isUpdating || enhanceLoading}
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50"
                  title="Flip 180°">
                  ↻↻
                </button>
                <button onClick={() => flip("horizontal")} disabled={rotating || isUpdating || enhanceLoading}
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50"
                  title="Mirror horizontal (left-right)">
                  ⇄
                </button>
                <button onClick={() => flip("vertical")} disabled={rotating || isUpdating || enhanceLoading}
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50"
                  title="Mirror vertical (top-bottom)">
                  ⇅
                </button>
              </div>
              <button
                onClick={handleFavorite}
                disabled={isUpdating || enhanceLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  currentPhoto?.isFavorite
                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                    : "bg-graphite-100 text-graphite-400 hover:bg-amber-100 hover:text-amber-600"
                }`}
                title="Favorite (press F)"
              >
                <span>★</span>
                <span className="hidden sm:inline">Favorite</span>
              </button>
              <button
                onClick={handleToggleFlag}
                disabled={isUpdating || enhanceLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  currentPhoto?.flagged
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                    : "border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
                }`}
                title="Flag for review (press T)"
              >
                <span>🚩</span>
                <span className="hidden sm:inline">{currentPhoto?.flagged ? "Flagged" : "Flag"}</span>
              </button>
              {currentPhoto && (
                <a
                  href={`/api/jobs/${job.id}/photos/${currentPhoto.id}/download`}
                  download
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-graphite-100 text-graphite-700 hover:bg-graphite-200 dark:bg-graphite-800 dark:text-graphite-200 dark:hover:bg-graphite-700 transition-colors"
                  title="Download this photo"
                >
                  <span>⬇</span>
                  <span className="hidden sm:inline">Save</span>
                </a>
              )}
              <button
                onClick={copyPhotoLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-graphite-100 text-graphite-700 hover:bg-graphite-200 dark:bg-graphite-800 dark:text-graphite-200 dark:hover:bg-graphite-700 transition-colors"
                title="Copy shareable link to this photo"
              >
                <span>{linkCopied ? "✓" : "🔗"}</span>
                <span className="hidden sm:inline">{linkCopied ? "Copied" : "Copy link"}</span>
              </button>
              <div className="relative" ref={twilightMenuRef}>
                {currentPhoto?.isTwilight ? (
                  <button
                    onClick={async () => {
                      if (!currentPhoto) return;
                      await updatePhoto(currentPhoto.id, { isTwilight: false, twilightInstructions: null });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700"
                  >
                    <MoonIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove Twilight</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setTwilightMenuOpen(!twilightMenuOpen)}
                    disabled={isUpdating || enhanceLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-100 text-purple-600 hover:bg-purple-200 disabled:opacity-50"
                  >
                    <MoonIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Twilight</span>
                  </button>
                )}

                {twilightMenuOpen && !currentPhoto?.isTwilight && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-xl shadow-lg overflow-hidden z-30">
                    {[
                      { value: "warm-dusk", label: "Warm Dusk", desc: "Golden hour glow" },
                      { value: "blue-hour", label: "Blue Hour", desc: "Cobalt + warm" },
                      { value: "deep-night", label: "Deep Night", desc: "All lights on" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={async () => {
                          setTwilightMenuOpen(false);
                          await fetch(`/api/jobs/${job.id}/photos/${currentPhoto?.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ twilightStyle: opt.value }),
                          });
                          handleTwilight();
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:bg-graphite-900 border-b border-graphite-100 dark:border-graphite-800 last:border-b-0"
                      >
                        <div className="text-xs font-semibold text-graphite-900 dark:text-white">{opt.label}</div>
                        <div className="text-[10px] text-graphite-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSetAsCover}
                disabled={isUpdating || enhanceLoading || !currentPhoto}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-graphite-100 text-graphite-700 hover:bg-graphite-200 dark:bg-graphite-800 dark:text-graphite-200 dark:hover:bg-graphite-700 transition-colors disabled:opacity-50"
                title="Set as job cover/thumbnail"
              >
                <span>🖼</span>
                <span className="hidden sm:inline">Set as cover</span>
              </button>
            </div>

            <div className="hidden md:flex gap-1.5 text-[10px] text-graphite-400">
              <span className="px-2 py-1 bg-graphite-100 dark:bg-graphite-800 rounded">A = Approve</span>
              <span className="px-2 py-1 bg-graphite-100 dark:bg-graphite-800 rounded">R = Reject</span>
              <span className="px-2 py-1 bg-graphite-100 dark:bg-graphite-800 rounded">&larr; &rarr; Navigate</span>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="bg-white dark:bg-graphite-900 border-t border-graphite-100 dark:border-graphite-800 px-6 py-3 flex items-center gap-2.5">
            <div className="flex gap-1.5 flex-wrap">
              {["Remove car", "Make brighter", "Fix sky", "Enhance grass", "Pot lights on", "Remove photographer", "TV: Netflix home screen", "TV: fireplace video", "TV: black screen off", "TV: beach scene"].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQuickTag(tag)}
                    className="px-2.5 py-1 rounded-md bg-graphite-100 dark:bg-graphite-800 text-graphite-500 dark:text-graphite-400 text-[11px] font-semibold border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-200 hover:text-graphite-700 dark:text-graphite-200 transition-colors"
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
              className="flex-1 px-3.5 py-2.5 bg-graphite-100 dark:bg-graphite-800 border border-graphite-200 dark:border-graphite-700 rounded-lg text-sm text-graphite-900 dark:text-white placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
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

      {/* Keyboard Shortcuts Help Overlay */}
      {showHelpOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setShowHelpOverlay(false)}
        />
      )}
      {showHelpOverlay && (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-graphite-900 rounded-lg shadow-lg border border-graphite-200 dark:border-graphite-700 p-4 w-48">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowHelpOverlay(false)}
              className="text-graphite-400 hover:text-graphite-600 dark:text-graphite-300 text-lg"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-sm text-graphite-700 dark:text-graphite-200">
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">A</span>
              <span>Approve</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">R</span>
              <span>Reject</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">E</span>
              <span>Re-enhance</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">S</span>
              <span>Toggle slider</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">Z</span>
              <span>Toggle zoom</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">← →</span>
              <span>Navigate</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">?</span>
              <span>Toggle help</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-graphite-900 dark:text-white">Esc</span>
              <span>Close overlay</span>
            </div>
          </div>
        </div>
      )}

      {showSwipeHint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-graphite-900 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 md:hidden">
          Swipe ← → to navigate · ↑ approve · ↓ reject
        </div>
      )}

      <KeyboardHint />

      {/* MLS Listing Description Modal */}
      {showDescModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDescModal(false)}>
          <div className="bg-white dark:bg-graphite-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">MLS Listing Description</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={14}
              className="w-full p-3 text-sm border border-graphite-200 dark:border-graphite-700 rounded dark:bg-graphite-800 dark:text-white"
            />

            {/* Translation Controls */}
            <div className="mt-3 flex gap-2 items-center">
              <select value={translateLang} onChange={(e) => setTranslateLang(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white">
                <option value="es">🇪🇸 Spanish</option>
                <option value="fr">🇫🇷 French</option>
                <option value="zh">🇨🇳 Mandarin</option>
                <option value="pt">🇵🇹 Portuguese</option>
                <option value="de">🇩🇪 German</option>
                <option value="it">🇮🇹 Italian</option>
              </select>
              <button onClick={translateDescription} disabled={translating}
                className="text-xs px-3 py-1.5 rounded bg-purple-500 text-white font-semibold disabled:opacity-50">
                {translating ? "Translating..." : "🌐 Translate"}
              </button>
            </div>

            {/* Translation Display */}
            {translation && (
              <div className="mt-3 border-t border-graphite-100 dark:border-graphite-800 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Translation ({translation.lang})</span>
                  <button onClick={() => navigator.clipboard.writeText(translation.text)}
                    className="text-xs text-cyan hover:underline dark:text-cyan-400">Copy</button>
                </div>
                <div className="text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">
                  {translation.text}
                </div>
              </div>
            )}

            {/* Regenerate with Feedback */}
            {description && (
              <div className="mt-3 space-y-2 border-t border-graphite-100 dark:border-graphite-800 pt-3">
                <div className="text-xs font-semibold text-graphite-700 dark:text-graphite-300">Regenerate with feedback:</div>
                <div className="flex flex-wrap gap-1">
                  {["Make it shorter (under 200 words)", "Make it longer with more detail", "More luxury/upscale tone", "More casual/friendly tone", "Focus more on lifestyle (entertaining, family)", "Focus more on architectural details", "Less salesy, more factual"].map(p => (
                    <button key={p} onClick={() => setFeedback(p)}
                      className={`text-[10px] px-2 py-0.5 rounded transition-colors ${feedback === p ? "bg-cyan text-white" : "bg-graphite-100 dark:bg-graphite-800 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-200 dark:hover:bg-graphite-700"}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <input type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Or type custom feedback..."
                  className="w-full text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan" />
                <button onClick={generateDescription} disabled={generating}
                  className="text-xs px-3 py-1.5 rounded bg-purple-500 text-white font-semibold w-full disabled:opacity-50 hover:bg-purple-600 transition-colors">
                  {generating ? "Regenerating..." : `🔄 Regenerate${feedback ? " with feedback" : ""}`}
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={() => navigator.clipboard.writeText(description)}
                className="text-xs px-3 py-1.5 rounded bg-cyan text-white"
              >
                Copy to clipboard
              </button>
              <button
                onClick={() => setShowDescModal(false)}
                className="text-xs px-3 py-1.5 rounded border dark:border-graphite-700 dark:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset A/B Compare Modal */}
      {compareOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setCompareOpen(false)}
        >
          <div
            className="bg-white dark:bg-graphite-900 rounded-lg p-4 max-w-6xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold dark:text-white">Compare presets</h2>
              <button onClick={() => setCompareOpen(false)} className="text-graphite-500 hover:text-graphite-800 dark:hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="flex gap-2 mb-3 items-center flex-wrap">
              <span className="text-xs dark:text-white">Compare with:</span>
              <select
                value={compareTarget}
                onChange={(e) => { setCompareTarget(e.target.value); setCompareResult(null); }}
                className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
              >
                {presets.map(p => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={runCompare}
                disabled={comparing}
                className="text-xs px-3 py-1 rounded bg-cyan-500 text-white font-semibold disabled:opacity-50"
              >
                {comparing ? "Generating..." : "Run"}
              </button>
              {compareResult && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Done</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs font-semibold text-center mb-1 dark:text-white">
                  Current ({job.preset})
                </div>
                {currentPhoto?.editedUrl ? (
                  <img src={currentPhoto.editedUrl} className="w-full rounded" alt="Current" />
                ) : (
                  <div className="aspect-[3/2] bg-graphite-100 dark:bg-graphite-800 rounded flex items-center justify-center text-xs text-graphite-400">
                    No edited version yet
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-center mb-1 dark:text-white">
                  Compare ({compareTarget})
                </div>
                {compareResult ? (
                  <img src={compareResult} className="w-full rounded" alt="Compare result" />
                ) : (
                  <div className="aspect-[3/2] bg-graphite-100 dark:bg-graphite-800 rounded flex items-center justify-center text-xs text-graphite-400">
                    {comparing ? "Generating..." : "Click Run to generate"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {slideshowOpen && (
        <Slideshow
          photos={slideshowPhotos}
          initialIndex={0}
          onClose={() => setSlideshowOpen(false)}
        />
      )}

      <InvoicePreviewModal jobId={job.id} open={invoicePreviewOpen} onClose={() => setInvoicePreviewOpen(false)} />
      {hoverPreview && (
        <ThumbHoverPreview
          src={hoverPreview.src}
          visible={true}
          x={hoverPreview.x}
          y={hoverPreview.y}
        />
      )}
    </div>
  );
}
