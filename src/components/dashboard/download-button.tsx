"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DownloadButton({ jobId }: { jobId: string }) {
  const { addToast } = useToast();

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    addToast("info", "Preparing ZIP download...");
    try {
      const link = document.createElement("a");
      link.href = `/api/jobs/${jobId}/download?format=zip`;
      link.download = "photos.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("success", "Download started");
    } catch (err: any) {
      addToast("error", `Download failed: ${err.message}`);
    }
  }

  return (
    <Button variant="text" className="text-xs" onClick={handleDownload}>
      Download
    </Button>
  );
}
