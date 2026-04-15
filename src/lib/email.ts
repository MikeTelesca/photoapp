import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "ATH Media <noreply@athmedia.ca>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!resend) {
    console.log("[email] Resend not configured, skipping:", opts.subject, "to", opts.to);
    return false;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, ...opts });
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

export function welcomeTemplate(opts: { name: string; loginUrl: string; signature?: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 28px;">Welcome to ATH AI Editor, ${escapeHtml(opts.name)} 👋</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        You just signed up for the fastest way to batch-edit real estate photos. Here's what to do next:
      </p>
      <ol style="color: #444; font-size: 15px; line-height: 1.7;">
        <li><strong>Create your first job</strong> — paste a Dropbox shared folder link or upload files directly.</li>
        <li><strong>Let the AI enhance them</strong> — HDR merge, window pull, straightened lines, professional finish.</li>
        <li><strong>Review & download</strong> — approve/reject with A/R keys, download ZIP when ready.</li>
      </ol>
      <p style="margin-top: 28px;">
        <a href="${opts.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Open your dashboard</a>
      </p>
      <h3 style="color: #111; margin-top: 32px; font-size: 16px;">Quick tips</h3>
      <ul style="color: #555; font-size: 14px; line-height: 1.6;">
        <li>Bracketed HDR (3 or 5 exposures per angle) is auto-detected</li>
        <li>Use the Prompt Playground to test prompts before full jobs</li>
        <li>Share a preview link with your realtor client — no login required for them</li>
        <li>Settings → Keyboard shortcuts to rebind for your workflow</li>
      </ul>
      ${opts.signature ? `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; white-space: pre-wrap;">
          ${escapeHtml(opts.signature)}
        </div>
      ` : `<p style="color: #999; font-size: 13px; margin-top: 40px;">
        Questions? Reply to this email or visit the Help page. We read every message.<br>
        — ATH Media
      </p>`}
    </div>
  `;
}

export function jobCompleteTemplate(opts: { address: string; photoCount: number; jobUrl: string; signature?: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 24px;">Your job is ready for review</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">
        We've finished enhancing <strong>${opts.photoCount}</strong> photos for <strong>${opts.address}</strong>.
      </p>
      <a href="${opts.jobUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Review photos</a>
      ${opts.signature ? `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; white-space: pre-wrap;">
          ${escapeHtml(opts.signature)}
        </div>
      ` : `<p style="color: #999; font-size: 13px; margin-top: 40px;">ATH Media · AI Photo Editor</p>`}
    </div>
  `;
}

export interface WeeklyDigestData {
  name: string;
  weekStart: string;
  weekEnd: string;
  jobCount: number;
  photoCount: number;
  approvedCount: number;
  totalCost: number;
  topAddress?: string;
  dashboardUrl: string;
  signature?: string;
}

export function weeklyDigestTemplate(data: WeeklyDigestData) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 24px;">Your week at a glance, ${escapeHtml(data.name)}</h1>
      <p style="color: #666; font-size: 14px;">${data.weekStart} → ${data.weekEnd}</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0;">
        <div style="background: #f0fdfa; border-radius: 8px; padding: 16px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Jobs</div>
          <div style="font-size: 28px; font-weight: 700; color: #0891b2;">${data.jobCount}</div>
        </div>
        <div style="background: #f0fdfa; border-radius: 8px; padding: 16px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Photos approved</div>
          <div style="font-size: 28px; font-weight: 700; color: #0891b2;">${data.approvedCount} / ${data.photoCount}</div>
        </div>
        <div style="background: #f0fdfa; border-radius: 8px; padding: 16px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total spend</div>
          <div style="font-size: 28px; font-weight: 700; color: #0891b2;">$${data.totalCost.toFixed(2)}</div>
        </div>
        <div style="background: #f0fdfa; border-radius: 8px; padding: 16px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Avg / photo</div>
          <div style="font-size: 28px; font-weight: 700; color: #0891b2;">$${data.photoCount > 0 ? (data.totalCost / data.photoCount).toFixed(3) : "0.00"}</div>
        </div>
      </div>

      ${data.topAddress ? `<p style="color: #444; font-size: 14px;">Top address this week: <strong>${escapeHtml(data.topAddress)}</strong></p>` : ""}

      <p style="margin-top: 28px;">
        <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Open dashboard</a>
      </p>

      ${data.signature ? `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; white-space: pre-wrap;">
          ${escapeHtml(data.signature)}
        </div>
      ` : `<p style="color: #999; font-size: 12px; margin-top: 40px;">
        You can turn this digest off in Settings → Notifications.
      </p>`}
    </div>
  `;
}

export interface DailySummaryData {
  name: string;
  date: string;
  jobsCreated: number;
  photosProcessed: number;
  awaitingReview: number;
  spendToday: number;
  dashboardUrl: string;
  signature?: string;
}

export function dailySummaryTemplate(data: DailySummaryData) {
  const hasActivity = data.jobsCreated > 0 || data.photosProcessed > 0 || data.awaitingReview > 0;

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <h1 style="color: #111; font-size: 22px; margin: 0 0 8px;">Today's recap, ${escapeHtml(data.name)}</h1>
      <p style="color: #888; font-size: 13px; margin: 0;">${data.date}</p>

      ${hasActivity ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0;">
          <div style="background: #f0fdfa; padding: 14px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Jobs created</div>
            <div style="font-size: 24px; font-weight: 700; color: #0891b2;">${data.jobsCreated}</div>
          </div>
          <div style="background: #f0fdfa; padding: 14px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Photos enhanced</div>
            <div style="font-size: 24px; font-weight: 700; color: #0891b2;">${data.photosProcessed}</div>
          </div>
          <div style="background: ${data.awaitingReview > 0 ? '#fef3c7' : '#f0fdfa'}; padding: 14px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Awaiting review</div>
            <div style="font-size: 24px; font-weight: 700; color: ${data.awaitingReview > 0 ? '#92400e' : '#0891b2'};">${data.awaitingReview}</div>
          </div>
          <div style="background: #f0fdfa; padding: 14px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; text-transform: uppercase;">Spend today</div>
            <div style="font-size: 24px; font-weight: 700; color: #0891b2;">$${data.spendToday.toFixed(2)}</div>
          </div>
        </div>
      ` : `
        <p style="color: #666; font-size: 14px; margin: 24px 0;">Quiet day — no new activity. 😌</p>
      `}

      ${data.awaitingReview > 0 ? `
        <p style="margin: 24px 0;">
          <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Review pending photos →</a>
        </p>
      ` : ""}

      ${data.signature ? `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; white-space: pre-wrap;">
          ${escapeHtml(data.signature)}
        </div>
      ` : ""}

      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        Turn this off in Settings → Notifications.
      </p>
    </div>
  `;
}

export function shareLinkTemplate(opts: {
  photographerName: string;
  address: string;
  photoCount: number;
  shareUrl: string;
  password?: string;
  personalMessage?: string;
  signature?: string;
  trackingPixelUrl?: string;
}) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 24px;">Photos are ready: ${escapeHtml(opts.address)}</h1>
      <p style="color: #555; font-size: 15px; line-height: 1.5;">
        ${escapeHtml(opts.photographerName)} has shared a private gallery of ${opts.photoCount} photos with you.
      </p>
      ${opts.personalMessage ? `
        <div style="background: #f0fdfa; border-left: 4px solid #06b6d4; padding: 12px 16px; margin: 20px 0;">
          <div style="font-size: 12px; color: #999; margin-bottom: 4px;">Message from ${escapeHtml(opts.photographerName)}:</div>
          <div style="color: #333; font-size: 14px; font-style: italic;">${escapeHtml(opts.personalMessage)}</div>
        </div>
      ` : ""}
      <a href="${opts.shareUrl}" style="display: inline-block; margin-top: 16px; padding: 14px 28px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
        View gallery →
      </a>
      ${opts.password ? `
        <p style="margin-top: 20px; font-size: 13px; color: #666;">
          <strong>Password:</strong> <span style="font-family: monospace; background: #f5f5f5; padding: 2px 8px; border-radius: 4px;">${escapeHtml(opts.password)}</span>
        </p>
      ` : ""}
      ${opts.signature ? `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; white-space: pre-wrap;">
          ${escapeHtml(opts.signature)}
        </div>
      ` : `<p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        This link gives view-only access to the photos. If you have questions, reply to this email to contact ${escapeHtml(opts.photographerName)} directly.
      </p>`}
      ${opts.trackingPixelUrl ? `<img src="${opts.trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">` : ""}
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
