"use client";

import { Button } from "@/components/ui/button";

export function DownloadButton({ jobId }: { jobId: string }) {
  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/jobs/${jobId}/download`);
      const data = await res.json();

      if (data.photos && Array.isArray(data.photos)) {
        for (const photo of data.photos) {
          const link = document.createElement("a");
          link.href = photo.downloadUrl;
          link.download = photo.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise((r) => setTimeout(r, 300));
        }
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  return (
    <Button variant="text" className="text-xs" onClick={handleDownload}>
      Download
    </Button>
  );
}
