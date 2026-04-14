import Link from "next/link";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-[rgba(240,242,245,0.85)] backdrop-blur-xl border-b border-graphite-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-[22px] font-bold text-graphite-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-graphite-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-white border border-graphite-200 rounded-[10px] px-3.5 py-2 w-[200px] text-[13px] text-graphite-400 hover:border-graphite-300 transition-colors cursor-text">
          <MagnifyingGlassIcon className="w-[15px] h-[15px] text-graphite-400" />
          Search jobs...
        </div>
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
