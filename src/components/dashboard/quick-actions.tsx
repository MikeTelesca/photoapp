import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudArrowUpIcon, LinkIcon, PaintBrushIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const actions = [
  { label: "Upload Photos", icon: CloudArrowUpIcon, color: "bg-cyan-50 text-cyan" },
  { label: "Dropbox Link", icon: LinkIcon, color: "bg-graphite-100 text-graphite-700" },
  { label: "Edit Presets", icon: PaintBrushIcon, color: "bg-emerald-100 text-emerald-600" },
  { label: "Batch Download", icon: ArrowDownTrayIcon, color: "bg-amber-100 text-amber-600" },
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
              className="flex flex-col items-center gap-2 p-4 bg-graphite-50 border border-graphite-100 rounded-xl cursor-pointer transition-all duration-200 hover:bg-graphite-100 hover:border-graphite-200 hover:-translate-y-0.5"
            >
              <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${a.color}`}>
                <a.icon className="w-[18px] h-[18px]" />
              </div>
              <span className="text-xs font-semibold text-graphite-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
