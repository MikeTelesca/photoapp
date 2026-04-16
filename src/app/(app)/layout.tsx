export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-graphite-50 dark:bg-graphite-950">{children}</div>;
}
