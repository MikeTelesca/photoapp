type BadgeVariant = "standard" | "luxury" | "processing" | "review" | "done";

const styles: Record<BadgeVariant, string> = {
  standard: "bg-graphite-100 text-graphite-700",
  luxury: "bg-purple-100 text-purple-600",
  processing: "text-amber-600",
  review: "text-cyan",
  done: "text-emerald-600",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${styles[variant]}`}>
      {children}
    </span>
  );
}
