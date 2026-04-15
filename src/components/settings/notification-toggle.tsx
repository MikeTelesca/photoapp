"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const { addToast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  async function handleRequest() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      addToast("success", "Notifications enabled");
      new Notification("Notifications on", { body: "You'll be notified when jobs finish." });
    } else if (result === "denied") {
      addToast("error", "Notifications blocked - enable in your browser settings");
    }
  }

  if (permission === "unsupported") {
    return <span className="text-xs text-graphite-400">Browser notifications not supported</span>;
  }

  if (permission === "granted") {
    return <span className="text-xs text-emerald-600 font-semibold">✓ Notifications enabled</span>;
  }

  if (permission === "denied") {
    return <span className="text-xs text-red-500">Blocked — enable in browser settings</span>;
  }

  return (
    <Button onClick={handleRequest} variant="outline" className="text-xs">
      Enable Browser Notifications
    </Button>
  );
}
