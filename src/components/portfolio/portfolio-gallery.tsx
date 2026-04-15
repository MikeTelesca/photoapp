"use client";
import { useEffect, useState } from "react";

interface Photo {
  id: string;
  url: string;
  thumb: string;
  caption: string | null;
}

interface Props {
  photos: Photo[];
  photographerName: string;
}

export function PortfolioGallery({ photos, photographerName }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
      else if (e.key === "ArrowRight") setOpenIdx((i) => (i === null ? i : Math.min(photos.length - 1, i + 1)));
      else if (e.key === "ArrowLeft") setOpenIdx((i) => (i === null ? i : Math.max(0, i - 1)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, photos.length]);

  const active = openIdx !== null ? photos[openIdx] : null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-graphite-100 dark:bg-graphite-800 border border-graphite-200 dark:border-graphite-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumb}
              alt={photo.caption ?? `Photo by ${photographerName}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpenIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpenIdx(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            ×
          </button>
          {openIdx !== null && openIdx > 0 && (
            <button
              type="button"
              aria-label="Previous"
              onClick={(e) => { e.stopPropagation(); setOpenIdx((i) => (i === null ? i : Math.max(0, i - 1))); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              ‹
            </button>
          )}
          {openIdx !== null && openIdx < photos.length - 1 && (
            <button
              type="button"
              aria-label="Next"
              onClick={(e) => { e.stopPropagation(); setOpenIdx((i) => (i === null ? i : Math.min(photos.length - 1, i + 1))); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              ›
            </button>
          )}
          <div className="max-w-6xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.caption ?? `Photo by ${photographerName}`}
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
            {active.caption && (
              <p className="mt-3 text-sm text-white/80 text-center max-w-2xl">{active.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
