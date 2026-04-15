"use client";
import { useState, useEffect } from "react";

interface Props {
  exifData: string | null | undefined;
  imageUrl?: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
}

export function ExifPanel({ exifData, imageUrl, widthPx, heightPx }: Props) {
  const [open, setOpen] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Load dimensions from image or use provided values
  useEffect(() => {
    if (!open || !imageUrl) return;

    // If we have database values, use them immediately
    if (widthPx && heightPx) {
      setDims({ w: widthPx, h: heightPx });
      return;
    }

    // Otherwise fetch from image
    const img = new Image();
    img.onload = () => {
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      // Silent fail - just won't display dimensions
    };
    img.src = imageUrl;
  }, [open, imageUrl, widthPx, heightPx]);

  if (!exifData && !imageUrl) return null;

  let data: any = null;
  if (exifData) {
    try { data = JSON.parse(exifData); } catch { data = null; }
  }
  if (!data && !imageUrl) return null;

  // Flatten commonly-useful fields
  const primary = data?.photos?.[0] || data || {};
  const rows: [string, string | number | undefined][] = [
    ["Dimensions", dims ? `${dims.w} × ${dims.h}` : undefined],
    ["Resolution", dims ? `${(dims.w * dims.h / 1_000_000).toFixed(1)} MP` : undefined],
    ["Camera", [primary.make, primary.model].filter(Boolean).join(" ")],
    ["Lens", primary.lens || primary.lensModel],
    ["Focal length", primary.focalLength ? `${primary.focalLength}mm` : undefined],
    ["Aperture", primary.fNumber ? `f/${primary.fNumber}` : undefined],
    ["Shutter", primary.exposureTime || primary.shutterSpeed],
    ["ISO", primary.iso || primary.isoSpeedRatings],
    ["Exposure bias", primary.exposureBias],
    ["Date taken", primary.dateTaken || primary.dateTimeOriginal],
    ["Brackets", data?.photos?.length],
  ];

  const visible = rows.filter(r => r[1] !== undefined && r[1] !== null && r[1] !== "");
  if (visible.length === 0) return null;

  return (
    <div className="border border-graphite-100 dark:border-graphite-800 rounded">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 text-xs font-semibold text-graphite-600 dark:text-graphite-300 flex justify-between items-center bg-graphite-50 dark:bg-graphite-900 hover:bg-graphite-100 dark:hover:bg-graphite-800"
      >
        Photo info (EXIF)
        <span className="text-graphite-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 text-xs space-y-1 border-t border-graphite-100 dark:border-graphite-800">
          {visible.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-graphite-400">{label}</span>
              <span className="text-graphite-700 dark:text-graphite-200 font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
