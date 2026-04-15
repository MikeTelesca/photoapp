"use client";
import { useState } from "react";

export function WatermarkLogoUpload({ initial }: { initial: string | null }) {
  const [hasLogo, setHasLogo] = useState(!!initial);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/user/watermark-logo", { method: "POST", body: fd });
      if (res.ok) setHasLogo(true);
      else alert((await res.json()).error);
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!confirm("Remove watermark logo?")) return;
    await fetch("/api/user/watermark-logo", { method: "DELETE" });
    setHasLogo(false);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Upload a PNG logo (transparent background recommended, max 2MB). Overrides text watermark on downloads.
      </div>
      {hasLogo && (
        <div className="flex items-center gap-3">
          <img src="/api/user/watermark-logo/preview" alt="Logo" className="h-12 bg-graphite-100 dark:bg-graphite-800 p-1 rounded" />
          <button onClick={remove} className="text-xs text-red-500 hover:underline">
            Remove
          </button>
        </div>
      )}
      <label className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold cursor-pointer inline-block">
        {uploading ? "Uploading..." : hasLogo ? "Replace logo" : "Upload PNG logo"}
        <input
          type="file"
          accept="image/png,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </label>
    </div>
  );
}
