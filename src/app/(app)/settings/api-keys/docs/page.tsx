import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export default function ApiDocsPage() {
  return (
    <>
      <Topbar title="API documentation" />
      <div className="p-6 max-w-3xl space-y-4">
        <Card>
          <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
            <h2 className="text-base font-semibold dark:text-white">Authentication</h2>
            <p className="text-sm text-graphite-600 dark:text-graphite-300">
              Generate an API key in <a href="/settings/api-keys" className="text-cyan hover:underline">Settings → API Keys</a>.
              Pass it as a Bearer token in the Authorization header.
            </p>
            <pre className="text-xs bg-graphite-100 dark:bg-graphite-800 p-3 rounded overflow-x-auto">
{`Authorization: Bearer ath_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            </pre>

            <h2 className="text-base font-semibold dark:text-white mt-4">Endpoints</h2>

            <h3 className="text-sm font-semibold dark:text-white mt-3">GET /api/v1/stats</h3>
            <p className="text-sm text-graphite-600 dark:text-graphite-300">
              Returns aggregate stats for the current user.
            </p>
            <pre className="text-xs bg-graphite-100 dark:bg-graphite-800 p-3 rounded overflow-x-auto">
{`curl https://your-domain/api/v1/stats \\
  -H "Authorization: Bearer ath_..."

# Response:
{
  "totalJobs": 42,
  "monthJobs": 8,
  "monthCost": 287.50,
  "yearCost": 1842.10,
  "awaitingReview": 3,
  "totalPhotos": 1238,
  "timestamp": "2026-04-14T..."
}`}
            </pre>

            <h3 className="text-sm font-semibold dark:text-white mt-3">GET /api/v1/jobs</h3>
            <p className="text-sm text-graphite-600 dark:text-graphite-300">
              Returns recent jobs. Optional query params: <code>limit</code> (max 100, default 20), <code>status</code>.
            </p>
            <pre className="text-xs bg-graphite-100 dark:bg-graphite-800 p-3 rounded overflow-x-auto">
{`curl https://your-domain/api/v1/jobs?status=review&limit=5 \\
  -H "Authorization: Bearer ath_..."`}
            </pre>

            <h2 className="text-base font-semibold dark:text-white mt-4">Rate limits</h2>
            <p className="text-sm text-graphite-600 dark:text-graphite-300">
              300 requests/hour per user. Standard <code>X-RateLimit-*</code> headers returned.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
