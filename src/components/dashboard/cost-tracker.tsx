import { Card } from "@/components/ui/card";

interface CostTrackerProps {
  amount: number;
  imageCount: number;
  budget: number;
}

export function CostTracker({ amount, imageCount, budget }: CostTrackerProps) {
  const pct = Math.min(100, (amount / budget) * 100);

  return (
    <Card>
      <div className="p-5 text-center">
        <div className="text-[11px] font-semibold text-graphite-400 uppercase tracking-wider">Cost This Month</div>
        <div className="text-4xl font-extrabold text-graphite-900 tracking-tight mt-2 mb-1 tabular-nums">
          ${Math.floor(amount)}
          <span className="text-lg font-normal text-graphite-400">.{String(Math.round((amount % 1) * 100)).padStart(2, "0")}</span>
        </div>
        <div className="text-[13px] text-graphite-400">{imageCount} images processed</div>
        <div className="mt-4">
          <div className="h-1.5 bg-graphite-100 rounded-full overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-cyan to-cyan-light rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-graphite-300">
            <span>$0</span>
            <span>Budget: ${budget}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
