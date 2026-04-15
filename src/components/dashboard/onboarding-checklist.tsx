import { prisma } from "@/lib/db";
import Link from "next/link";

interface Props {
  userId: string;
}

interface Step {
  id: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

export async function OnboardingChecklist({ userId }: Props) {
  // Detect completion state
  const [user, jobCount, approvedCount, clientCount, jobTemplateCount] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: userId },
        select: {
          businessName: true,
          emailSignature: true,
          slackWebhookUrl: true,
          promptPrefix: true,
        },
      })
      .catch(() => null),
    prisma.job.count({ where: { photographerId: userId } }).catch(() => 0),
    prisma.job
      .count({ where: { photographerId: userId, status: "approved" } })
      .catch(() => 0),
    prisma.client.count({ where: { ownerId: userId } }).catch(() => 0),
    prisma.jobTemplate.count({ where: { ownerId: userId } }).catch(() => 0),
  ]);

  const steps: Step[] = [
    {
      id: "first-job",
      label: "Create your first job",
      done: jobCount > 0,
      href: "/jobs/new",
      cta: "Start a job",
    },
    {
      id: "approve",
      label: "Approve a photo",
      done: approvedCount > 0,
      href: "/dashboard",
      cta: "Review jobs",
    },
    {
      id: "client",
      label: "Add a client",
      done: clientCount > 0,
      href: "/clients",
      cta: "Add client",
    },
    {
      id: "business",
      label: "Set up business info (for invoices)",
      done: !!user?.businessName,
      href: "/settings",
      cta: "Set business name",
    },
    {
      id: "signature",
      label: "Add an email signature",
      done: !!user?.emailSignature,
      href: "/settings",
      cta: "Add signature",
    },
    {
      id: "template",
      label: "Create a job template",
      done: jobTemplateCount > 0,
      href: "/settings",
      cta: "Create template",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const progress = (doneCount / steps.length) * 100;

  // Don't show if all done
  if (allDone) return null;

  return (
    <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">
            🚀 Get started
          </h3>
          <p className="text-xs text-graphite-500 dark:text-graphite-400 mt-0.5">
            {doneCount} of {steps.length} complete
          </p>
        </div>
        <div className="text-xs text-cyan font-bold">{Math.round(progress)}%</div>
      </div>

      <div className="h-1.5 bg-graphite-100 dark:bg-graphite-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-cyan transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step.done
                  ? "bg-emerald-500 text-white"
                  : "bg-graphite-200 dark:bg-graphite-700 text-graphite-500"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            <span
              className={`flex-1 ${
                step.done
                  ? "text-graphite-400 line-through"
                  : "text-graphite-700 dark:text-graphite-300"
              }`}
            >
              {step.label}
            </span>
            {!step.done && (
              <Link href={step.href} className="text-xs text-cyan hover:underline">
                {step.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
