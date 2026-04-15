type BadgeVariant = "standard" | "luxury" | "processing" | "review" | "done";

const styles: Record<BadgeVariant, string> = {
  standard: "bg-graphite-100 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-200",
  luxury: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300",
  processing: "text-amber-600 dark:text-amber-400",
  review: "text-cyan dark:text-cyan-light",
  done: "text-emerald-600 dark:text-emerald-400",
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
