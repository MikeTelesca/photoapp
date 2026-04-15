import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookmarkIcon } from "@heroicons/react/24/outline";
import { DeleteTemplateButton } from "@/components/dashboard/delete-template-button";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const templates = await prisma.jobTemplate.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Topbar title="Templates" subtitle="Saved job configurations for quick reuse" />
      <div className="p-6 max-w-3xl">
        {templates.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <BookmarkIcon className="w-10 h-10 text-graphite-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-graphite-600 mb-1">No templates yet</p>
              <p className="text-xs text-graphite-400">
                Save a job as a template from the Jobs page using the bookmark icon on any job card.
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-graphite-100">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold text-graphite-900">{t.name}</div>
                    <div className="flex gap-3 text-xs text-graphite-400 mt-0.5 flex-wrap">
                      <span className="capitalize">{t.preset}</span>
                      {t.photographerName && <span>{t.photographerName}</span>}
                      {t.clientName && <span>{t.clientName}</span>}
                      {t.tvStyle && t.tvStyle !== "off" && (
                        <span>TV: {t.tvStyle}</span>
                      )}
                      {t.skyStyle && t.skyStyle !== "as-is" && (
                        <span>Sky: {t.skyStyle}</span>
                      )}
                      {t.tags && (
                        <span>Tags: {t.tags}</span>
                      )}
                    </div>
                    {t.notes && (
                      <p className="text-xs text-graphite-500 mt-1 line-clamp-1">{t.notes}</p>
                    )}
                  </div>
                  <DeleteTemplateButton templateId={t.id} />
                </div>
              ))}
            </div>
          </Card>
        )}
        <p className="mt-4 text-xs text-graphite-400">
          Templates are applied when creating a new job. Pick a template from the dropdown at the top of the New Job form.
        </p>
      </div>
    </>
  );
}
