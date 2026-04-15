import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { EMAIL_TEMPLATES } from "@/lib/email-templates-registry";
import { EmailTemplateRowActions } from "./_components/row-actions";

export const metadata = {
  title: "Email Templates",
};

export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const templates = EMAIL_TEMPLATES.map(t => ({
    key: t.key,
    name: t.name,
    subject: t.subject,
    description: t.description,
  }));

  return (
    <>
      <Topbar title="Email Templates" subtitle="Preview and test-send transactional emails" />
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>All templates</CardTitle>
            <div className="text-sm text-graphite-400 ml-auto">
              {templates.length} template{templates.length !== 1 ? "s" : ""}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800 bg-graphite-50 dark:bg-graphite-800/30">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold">Template</th>
                  <th className="text-left py-3 px-5 font-semibold">Subject</th>
                  <th className="text-right py-3 px-5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr
                    key={t.key}
                    className="border-b border-graphite-50 dark:border-graphite-800 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800/40 transition-colors align-top"
                  >
                    <td className="py-3 px-5">
                      <div className="font-medium text-graphite-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-graphite-400 mt-0.5">{t.description}</div>
                      <div className="text-[11px] font-mono text-graphite-400 mt-1">{t.key}</div>
                    </td>
                    <td className="py-3 px-5 text-graphite-600 dark:text-graphite-300">{t.subject}</td>
                    <td className="py-3 px-5 text-right">
                      <EmailTemplateRowActions templateKey={t.key} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-graphite-400 mt-4">
          Previews render with demo fixture data. Test sends go through the same Resend transport as production.
        </p>
      </div>
    </>
  );
}
