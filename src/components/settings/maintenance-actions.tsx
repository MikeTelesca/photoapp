"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MaintenanceActions() {
  const [recovering, setRecovering] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRecover() {
    setRecovering(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/recover-stuck", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult(`Reset ${data.reset} stuck photos to pending`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleRecover} disabled={recovering} variant="outline" className="text-xs">
        {recovering ? "Recovering..." : "Recover Stuck Photos"}
      </Button>
      {result && <span className="text-xs text-graphite-500">{result}</span>}
    </div>
  );
}
