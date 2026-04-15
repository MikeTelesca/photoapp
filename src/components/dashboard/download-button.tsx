"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DownloadButton({ jobId }: { jobId: string }) {
  const { addToast } = useToast();

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/jobs/${jobId}/download`);
      const data = await res.json();

      if (data.photos && Array.isArray(data.photos)) {
        addToast("info", `Downloading ${data.photos.length} photo${data.photos.length === 1 ? "" : "s"}…`);
        for (const photo of data.photos) {
          const link = document.createElement("a");
          link.href = photo.downloadUrl;
          link.download = photo.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise((r) => setTimeout(r, 300));
        }
        addToast("success", "Download complete!");
      } else if (data.error) {
        addToast("error", data.error);
      }
    } catch (err) {
      addToast("error", "Download failed. Please try again.");
    }
  }

  return (
    <Button variant="text" className="text-xs" onClick={handleDownload}>
      Download
    </Button>
  );
}
