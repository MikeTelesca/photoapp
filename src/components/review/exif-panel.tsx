"use client";
import { useEffect, useRef, useState } from "react";

interface ExifResponse {
  photoId: string;
  image: {
    width: number | null;
    height: number | null;
    format: string | null;
    space: string | null;
    channels: number | null;
    depth: string | null;
    density: number | null;
    orientation: number | null;
    hasAlpha: boolean | null;
    hasProfile: boolean | null;
    size: number | null;
    megapixels: number | null;
  };
  camera: {
    make: string | null;
    model: string | null;
    lens: string | null;
    software: string | null;
    serial: string | null;
  };
  exposure: {
    iso: number | null;
    fNumber: number | null;
    aperture: string | null;
    exposureTime: number | null;
    shutter: string | null;
    focalLength: number | null;
    focalLengthMm: string | null;
    focalLength35mm: number | null;
    exposureBias: number | null;
    exposureProgram: string | null;
    meteringMode: string | null;
    flash: string | null;
    whiteBalance: string | null;
    dateTaken: string | null;
  };
  location: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    mapsUrl: string;
  } | null;
}

interface Props {
  photoId: string;
  open: boolean;
  onClose: () => void;
}

function formatBytes(n: number | null | undefined): string | null {
  if (!n) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(s: string | null): string | null {
  if (!s) return null;
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === false) return null;
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-graphite-400 dark:text-graphite-500">{label}</span>
      <span className="text-graphite-800 dark:text-graphite-100 font-medium text-right break-all">
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-graphite-200 dark:border-graphite-700 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-graphite-500 dark:text-graphite-400 mb-1">
        {title}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

export function ExifPanel({ photoId, open, onClose }: Props) {
  const [data, setData] = useState<ExifResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !photoId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/photos/${photoId}/exif`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((j: ExifResponse) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load EXIF");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, photoId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="EXIF metadata"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-white dark:bg-graphite-950 shadow-2xl overflow-y-auto border-l border-graphite-200 dark:border-graphite-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-graphite-950 border-b border-graphite-200 dark:border-graphite-800 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-base">🔬</span>
            <h2 className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">
              EXIF Metadata
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close EXIF panel"
            className="text-graphite-500 hover:text-graphite-900 dark:hover:text-graphite-100 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="text-xs text-graphite-500 py-4">Loading metadata…</div>
          )}
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 py-4">{error}</div>
          )}
          {data && (
            <>
              <Section title="Image">
                <Row
                  label="Dimensions"
                  value={
                    data.image.width && data.image.height
                      ? `${data.image.width} × ${data.image.height}`
                      : null
                  }
                />
                <Row label="Resolution" value={data.image.megapixels ? `${data.image.megapixels} MP` : null} />
                <Row label="Format" value={data.image.format} />
                <Row label="Color space" value={data.image.space} />
                <Row label="Channels" value={data.image.channels} />
                <Row label="Bit depth" value={data.image.depth} />
                <Row label="Density" value={data.image.density ? `${data.image.density} dpi` : null} />
                <Row label="Orientation" value={data.image.orientation} />
                <Row label="Alpha" value={data.image.hasAlpha ? "Yes" : null} />
                <Row label="ICC profile" value={data.image.hasProfile ? "Yes" : null} />
                <Row label="File size" value={formatBytes(data.image.size)} />
              </Section>

              <Section title="Camera">
                <Row label="Make" value={data.camera.make} />
                <Row label="Model" value={data.camera.model} />
                <Row label="Lens" value={data.camera.lens} />
                <Row label="Software" value={data.camera.software} />
                <Row label="Serial" value={data.camera.serial} />
              </Section>

              <Section title="Exposure">
                <Row label="ISO" value={data.exposure.iso} />
                <Row label="Aperture" value={data.exposure.aperture} />
                <Row label="Shutter" value={data.exposure.shutter} />
                <Row label="Focal length" value={data.exposure.focalLengthMm} />
                <Row
                  label="Focal length (35mm)"
                  value={data.exposure.focalLength35mm ? `${data.exposure.focalLength35mm}mm` : null}
                />
                <Row
                  label="Exposure bias"
                  value={
                    data.exposure.exposureBias !== null
                      ? `${data.exposure.exposureBias > 0 ? "+" : ""}${data.exposure.exposureBias} EV`
                      : null
                  }
                />
                <Row label="Exposure program" value={data.exposure.exposureProgram} />
                <Row label="Metering" value={data.exposure.meteringMode} />
                <Row label="Flash" value={data.exposure.flash} />
                <Row label="White balance" value={data.exposure.whiteBalance} />
                <Row label="Date taken" value={formatDate(data.exposure.dateTaken)} />
              </Section>

              <Section title="Location">
                {data.location ? (
                  <>
                    <Row label="Latitude" value={data.location.latitude.toFixed(6)} />
                    <Row label="Longitude" value={data.location.longitude.toFixed(6)} />
                    <Row
                      label="Altitude"
                      value={
                        data.location.altitude !== null
                          ? `${data.location.altitude.toFixed(1)} m`
                          : null
                      }
                    />
                    <div className="pt-2">
                      <a
                        href={data.location.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-graphite-500 py-1">No GPS data</div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
