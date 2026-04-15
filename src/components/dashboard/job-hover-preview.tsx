"use client";
import { useState, useEffect } from "react";

interface Photo {
  id: string;
  editedUrl?: string | null;
  originalUrl?: string | null;
}

interface Props {
  jobId: string;
  visible: boolean;
  x: number;
  y: number;
}

export function JobHoverPreview({ jobId, visible, x, y }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (photos.length > 0) return; // already loaded
    setLoading(true);
    fetch(`/api/jobs/${jobId}/photos-preview`)
      .then(r => r.json())
      .then(d => setPhotos(d.photos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, jobId, photos.length]);

  if (!visible) return null;

  // Position offscreen-aware
  const w = 280;
  const h = 200;
  let left = x + 16;
  let top = y - 50;
  if (typeof window !== "undefined") {
    if (left + w > window.innerWidth) left = x - w - 16;
    if (top < 0) top = 16;
    if (top + h > window.innerHeight) top = window.innerHeight - h - 16;
  }

  return (
    <div className="fixed z-50 pointer-events-none rounded-lg shadow-2xl bg-graphite-900 overflow-hidden grid grid-cols-2 gap-0.5 p-0.5"
      style={{ left, top, width: w, height: h }}>
      {loading ? (
        <div className="col-span-2 flex items-center justify-center text-white text-xs">Loading...</div>
      ) : photos.length === 0 ? (
        <div className="col-span-2 flex items-center justify-center text-white/60 text-xs">No photos</div>
      ) : (
        photos.slice(0, 4).map(p => {
          const src = p.editedUrl || p.originalUrl;
          if (!src) return null;
          return (
            <img key={p.id} src={src} alt=""
              className="w-full h-full object-cover rounded-sm" />
          );
        })
      )}
    </div>
  );
}
