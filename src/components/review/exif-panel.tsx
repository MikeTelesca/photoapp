"use client";
import { useState } from "react";

interface Props {
  exifData: string | null | undefined;
}

export function ExifPanel({ exifData }: Props) {
  const [open, setOpen] = useState(false);

  if (!exifData) return null;

  let data: any = null;
  try { data = JSON.parse(exifData); } catch { return null; }
  if (!data) return null;

  // Flatten commonly-useful fields
  const primary = data.photos?.[0] || data;
  const rows: [string, string | number | undefined][] = [
    ["Camera", [primary.make, primary.model].filter(Boolean).join(" ")],
    ["Lens", primary.lens || primary.lensModel],
    ["Focal length", primary.focalLength ? `${primary.focalLength}mm` : undefined],
    ["Aperture", primary.fNumber ? `f/${primary.fNumber}` : undefined],
    ["Shutter", primary.exposureTime || primary.shutterSpeed],
    ["ISO", primary.iso || primary.isoSpeedRatings],
    ["Exposure bias", primary.exposureBias],
    ["Date taken", primary.dateTaken || primary.dateTimeOriginal],
    ["Brackets", data.photos?.length],
  ];

  const visible = rows.filter(r => r[1] !== undefined && r[1] !== null && r[1] !== "");
  if (visible.length === 0) return null;

  return (
    <div className="border border-graphite-100 rounded">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 text-xs font-semibold text-graphite-600 flex justify-between items-center hover:bg-graphite-50"
      >
        Photo info (EXIF)
        <span className="text-graphite-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 text-xs space-y-1 border-t border-graphite-100">
          {visible.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-graphite-400">{label}</span>
              <span className="text-graphite-700 font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
