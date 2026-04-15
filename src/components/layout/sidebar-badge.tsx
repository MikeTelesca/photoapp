"use client";
import { useEffect, useState } from "react";

interface Props {
  endpoint: string;
  countKey?: string;
  className?: string;
}

export function SidebarBadge({ endpoint, countKey = "count", className }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (!cancelled) setCount(data[countKey] || 0);
      } catch {}
    }
    load();
    const timer = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [endpoint, countKey]);

  if (!count || count === 0) return null;
  return (
    <span className={className || "ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-cyan text-white font-bold min-w-[18px] text-center"}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
