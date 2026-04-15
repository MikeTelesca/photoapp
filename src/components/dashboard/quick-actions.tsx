import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudArrowUpIcon, LinkIcon, PaintBrushIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const actions = [
  { label: "Upload Photos", icon: CloudArrowUpIcon, color: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan" },
  { label: "Dropbox Link", icon: LinkIcon, color: "bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-200" },
  { label: "Edit Presets", icon: PaintBrushIcon, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
  { label: "Batch Download", icon: ArrowDownTrayIcon, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 p-4 bg-graphite-50 dark:bg-graphite-800 border border-graphite-100 dark:border-graphite-700 rounded-xl cursor-pointer transition-all duration-200 hover:bg-graphite-100 dark:hover:bg-graphite-700 hover:border-graphite-200 dark:hover:border-graphite-600 hover:-translate-y-0.5"
            >
              <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${a.color}`}>
                <a.icon className="w-[18px] h-[18px]" />
              </div>
              <span className="text-xs font-semibold text-graphite-700 dark:text-graphite-200">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
