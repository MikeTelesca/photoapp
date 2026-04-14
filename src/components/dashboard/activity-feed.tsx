import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ActivityItem {
  id: string;
  icon: "approved" | "uploaded" | "regenerated";
  text: string;
  highlight: string;
  time: string;
}

const iconMap = {
  approved: { Icon: CheckCircleIcon, bg: "bg-emerald-100 text-emerald-600" },
  uploaded: { Icon: CloudArrowUpIcon, bg: "bg-cyan-50 text-cyan" },
  regenerated: { Icon: ExclamationTriangleIcon, bg: "bg-amber-100 text-amber-600" },
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <Button variant="text" className="text-xs">See All</Button>
      </CardHeader>
      <div className="px-5 pb-4">
        {items.map((item) => {
          const { Icon, bg } = iconMap[item.icon];
          return (
            <div key={item.id} className="flex items-center gap-2.5 py-2.5 border-b border-graphite-50 last:border-b-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12.5px] text-graphite-700">
                  <strong className="font-semibold text-graphite-900">{item.highlight}</strong> {item.text}
                </div>
                <div className="text-[11px] text-graphite-300 mt-0.5">{item.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
