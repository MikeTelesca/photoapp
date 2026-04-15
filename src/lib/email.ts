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

export function welcomeTemplate(opts: { name: string; loginUrl: string }) {
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
      <p style="color: #999; font-size: 13px; margin-top: 40px;">
        Questions? Reply to this email or visit the Help page. We read every message.<br>
        — ATH Media
      </p>
    </div>
  `;
}

export function jobCompleteTemplate(opts: { address: string; photoCount: number; jobUrl: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 24px;">Your job is ready for review</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">
        We've finished enhancing <strong>${opts.photoCount}</strong> photos for <strong>${opts.address}</strong>.
      </p>
      <a href="${opts.jobUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Review photos</a>
      <p style="color: #999; font-size: 13px; margin-top: 40px;">ATH Media · AI Photo Editor</p>
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

      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        You can turn this digest off in Settings → Notifications.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
