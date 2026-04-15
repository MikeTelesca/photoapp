"use client";
import { useState, useEffect } from "react";

interface Props {
  jobId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareAnalyticsModal({ jobId, open, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/jobs/${jobId}/share/analytics`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [open, jobId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-graphite-900 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-graphite-100 dark:border-graphite-800 flex justify-between items-center sticky top-0 bg-white dark:bg-graphite-900 z-10">
          <h2 className="text-sm font-semibold dark:text-white">📊 Share link analytics</h2>
          <button onClick={onClose} className="text-graphite-400 text-xl leading-none">×</button>
        </div>

        {loading || !data ? (
          <div className="p-8 text-center text-xs text-graphite-400">Loading...</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Summary stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Page views" value={data.summary.shareViewCount} />
              <Stat label="Emails sent" value={data.summary.emailsSent} />
              <Stat label="Emails opened" value={`${data.summary.emailsOpened}/${data.summary.emailsSent}`} />
              <Stat label="Avg rating" value={data.summary.avgRating > 0 ? `★ ${data.summary.avgRating.toFixed(1)}` : "—"} />
            </div>

            {data.summary.shareLastViewedAt && (
              <div className="text-xs text-graphite-500 dark:text-graphite-400">
                Last viewed: {new Date(data.summary.shareLastViewedAt).toLocaleString()}
              </div>
            )}

            {data.requests?.length > 0 && (
              <Section title={`Requests (${data.requests.length})`}>
                {data.requests.map((r: any) => (
                  <div key={r.id} className="text-xs py-1 border-b border-graphite-100 dark:border-graphite-800 last:border-b-0">
                    <div className="font-semibold dark:text-white">{r.fromName} {r.resolvedAt && <span className="text-emerald-500 ml-1">✓</span>}</div>
                    <div className="text-graphite-500 dark:text-graphite-400 line-clamp-2">{r.message}</div>
                    <div className="text-[10px] text-graphite-400">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </Section>
            )}

            {data.comments?.length > 0 && (
              <Section title={`Recent comments (${data.comments.length})`}>
                {data.comments.map((c: any) => (
                  <div key={c.id} className="text-xs py-1 border-b border-graphite-100 dark:border-graphite-800 last:border-b-0">
                    <div className="font-semibold dark:text-white">{c.authorName}</div>
                    <div className="text-graphite-500 dark:text-graphite-400 line-clamp-2">{c.message}</div>
                  </div>
                ))}
              </Section>
            )}

            {data.shareViews?.length > 0 && (
              <Section title={`Recent views (${data.shareViews.length})`}>
                {data.shareViews.map((v: any) => {
                  const ua = parseUserAgent(v.userAgent || "");
                  const ref = truncateReferrer(v.referrer);
                  return (
                    <div key={v.id} className="text-xs py-1 border-b border-graphite-100 dark:border-graphite-800 last:border-b-0">
                      <div className="flex justify-between">
                        <div className="font-semibold dark:text-white">{ua.browser} on {ua.os}</div>
                        <div className="text-[10px] text-graphite-400">{new Date(v.viewedAt).toLocaleString()}</div>
                      </div>
                      {ref && <div className="text-[10px] text-graphite-400 truncate">from {ref}</div>}
                    </div>
                  );
                })}
              </Section>
            )}

            {data.emailLogs?.length > 0 && (
              <Section title={`Recipients (${data.emailLogs.length})`}>
                {data.emailLogs.map((l: any) => (
                  <div key={l.id} className="text-xs py-1 border-b border-graphite-100 dark:border-graphite-800 last:border-b-0 flex justify-between">
                    <div>
                      <div className="font-semibold dark:text-white">{l.toEmail}</div>
                      <div className="text-[10px] text-graphite-400">Sent {new Date(l.sentAt).toLocaleString()}</div>
                    </div>
                    <div className="text-xs">
                      {l.openedAt ? <span className="text-emerald-500">Opened ×{l.openCount}</span> : <span className="text-graphite-400">Not opened</span>}
                    </div>
                  </div>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-graphite-50 dark:bg-graphite-800 rounded p-2">
      <div className="text-[10px] text-graphite-500 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-graphite-900 dark:text-white">{value}</div>
    </div>
  );
}

function parseUserAgent(ua: string): { browser: string; os: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown" };
  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/MSIE |Trident\//.test(ua)) browser = "IE";

  let os = "Unknown";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os };
}

function truncateReferrer(ref: string | null | undefined): string | null {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const path = u.pathname.length > 20 ? u.pathname.slice(0, 20) + "…" : u.pathname;
    return u.hostname + path;
  } catch {
    return ref.length > 40 ? ref.slice(0, 40) + "…" : ref;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-1">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
