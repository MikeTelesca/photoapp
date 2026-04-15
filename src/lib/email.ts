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
