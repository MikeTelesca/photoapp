import { Topbar } from "@/components/layout/topbar";

export default async function ReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return (
    <>
      <Topbar title="Review Gallery" subtitle={`Job ${jobId}`} />
      <div className="p-6">
        <div className="bg-white rounded-card border border-graphite-200 p-12 text-center">
          <p className="text-graphite-400">Review gallery — coming in Phase 5</p>
        </div>
      </div>
    </>
  );
}
