"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportClientsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/clients/import", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        alert(
          `Imported ${data.created} clients (${data.skipped} skipped).${
            data.details?.length ? "\n\n" + data.details.join("\n") : ""
          }`
        );
        router.refresh();
      } else {
        alert(data.error || "Import failed");
      }
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <label
      className={`text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 cursor-pointer dark:text-graphite-300 transition-colors ${
        loading ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {loading ? "Importing..." : "Import CSV"}
      <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
    </label>
  );
}
