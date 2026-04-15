"use client";

import { useEffect, useRef } from "react";

interface JobSnapshot {
  id: string;
  address: string;
  totalPhotos: number;
  processedPhotos: number;
  status: string;
}

export function NotificationHandler({ jobs }: { jobs: JobSnapshot[] }) {
  const previousStates = useRef<Map<string, JobSnapshot>>(new Map());
  const permissionAsked = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Ask for permission once on mount
    if (!permissionAsked.current && Notification.permission === "default") {
      permissionAsked.current = true;
      // Don't auto-request — wait for first job change
    }

    // Compare current jobs to previous to detect transitions
    for (const job of jobs) {
      const prev = previousStates.current.get(job.id);
      if (prev) {
        // Detect: job became "review" from "processing"
        if (prev.status === "processing" && job.status === "review") {
          notify(`✅ Done: ${job.address}`, `${job.processedPhotos} photos enhanced and ready for review.`);
        }
        // Detect: progress milestone (every 25%)
        const oldPct = prev.totalPhotos > 0 ? (prev.processedPhotos / prev.totalPhotos) * 100 : 0;
        const newPct = job.totalPhotos > 0 ? (job.processedPhotos / job.totalPhotos) * 100 : 0;
        if (Math.floor(newPct / 25) > Math.floor(oldPct / 25) && newPct < 100 && newPct > 0) {
          notify(`${Math.floor(newPct)}% done: ${job.address}`, `${job.processedPhotos} of ${job.totalPhotos} photos enhanced.`);
        }
      }
      previousStates.current.set(job.id, job);
    }
  }, [jobs]);

  function notify(title: string, body: string) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch (err) {
        console.error("Notification failed:", err);
      }
    } else if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  return null;
}
