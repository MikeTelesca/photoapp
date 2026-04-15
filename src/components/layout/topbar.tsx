"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      router.push(`/dashboard?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-[rgba(240,242,245,0.85)] dark:bg-[rgba(10,10,10,0.85)] backdrop-blur-xl border-b border-graphite-200 dark:border-graphite-800 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-[22px] font-bold text-graphite-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-graphite-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-[10px] px-3.5 py-2 w-[200px] text-[13px] hover:border-graphite-300 dark:hover:border-graphite-600 transition-colors focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan">
            <MagnifyingGlassIcon className="w-[15px] h-[15px] text-graphite-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="flex-1 bg-transparent text-graphite-900 dark:text-white placeholder:text-graphite-400 focus:outline-none min-w-0"
            />
          </div>
        </form>
        <Button variant="outline">Import</Button>
        <Link href="/jobs/new">
          <Button>
            <PlusIcon className="w-3.5 h-3.5" />
            New Job
          </Button>
        </Link>
      </div>
    </div>
  );
}
