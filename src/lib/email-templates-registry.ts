/**
 * Central registry of transactional email templates used across the app.
 *
 * Each entry exposes a key, a human label, a default subject line, and a
 * render() function that produces HTML from a fixture payload. This powers
 * the admin preview + test-send page at /admin/email-templates.
 *
 * When adding a new template elsewhere in the codebase, also add it here so
 * admins can preview and QA it without needing to trigger the real flow.
 */

import {
  welcomeTemplate,
  jobCompleteTemplate,
  weeklyDigestTemplate,
  dailySummaryTemplate,
  shareLinkTemplate,
} from "@/lib/email";

export interface EmailTemplateEntry {
  key: string;
  name: string;
  subject: string;
  description: string;
  render: () => string;
}

const BASE_URL = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
const DEMO_SIGNATURE = "— Jane Photographer\nATH Media\n(555) 123-4567";

function passwordResetHtml(resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 24px;">Reset your password</h1>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">
        Click the button below to set a new password. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset password</a>
      <p style="color: #999; font-size: 13px; margin-top: 40px;">
        If you didn't request this, ignore this email. Your password stays unchanged.
      </p>
    </div>
  `;
}

function announcementHtml(opts: { title: string; body: string; ctaUrl?: string; ctaLabel?: string }): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #111; font-size: 24px;">${escapeHtml(opts.title)}</h1>
      <div style="color: #444; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(opts.body)}</div>
      ${opts.ctaUrl ? `
        <p style="margin-top: 28px;">
          <a href="${opts.ctaUrl}" style="display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">${escapeHtml(opts.ctaLabel || "Learn more")}</a>
        </p>
      ` : ""}
      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        You're receiving this because you're an ATH Editor user. Manage notifications in Settings.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const EMAIL_TEMPLATES: EmailTemplateEntry[] = [
  {
    key: "welcome",
    name: "Welcome",
    subject: "Welcome to ATH AI Editor",
    description: "Sent to new users on signup.",
    render: () =>
      welcomeTemplate({
        name: "Jane Photographer",
        loginUrl: `${BASE_URL}/dashboard`,
        signature: DEMO_SIGNATURE,
      }),
  },
  {
    key: "job-ready",
    name: "Job Ready",
    subject: "Your job is ready: 123 Maple Ave",
    description: "Sent when a job finishes processing and is ready for review.",
    render: () =>
      jobCompleteTemplate({
        address: "123 Maple Ave, Toronto",
        photoCount: 42,
        jobUrl: `${BASE_URL}/review/demo-job-id`,
        signature: DEMO_SIGNATURE,
      }),
  },
  {
    key: "share-email",
    name: "Share Gallery",
    subject: "Photos are ready: 123 Maple Ave",
    description: "Sent to a client when the photographer shares a gallery link.",
    render: () =>
      shareLinkTemplate({
        photographerName: "Jane Photographer",
        address: "123 Maple Ave, Toronto",
        photoCount: 42,
        shareUrl: `${BASE_URL}/s/demo-token`,
        password: "swan-moon",
        personalMessage: "Hi Mark — here are the final photos for the Maple listing. Let me know if anything needs tweaking!",
        signature: DEMO_SIGNATURE,
      }),
  },
  {
    key: "weekly-digest",
    name: "Weekly Digest",
    subject: "Your week at a glance",
    description: "Weekly activity summary sent on Mondays.",
    render: () =>
      weeklyDigestTemplate({
        name: "Jane Photographer",
        weekStart: "Apr 7, 2026",
        weekEnd: "Apr 13, 2026",
        jobCount: 7,
        photoCount: 284,
        approvedCount: 251,
        totalCost: 12.45,
        topAddress: "456 Oak Street, Mississauga",
        dashboardUrl: `${BASE_URL}/dashboard`,
        signature: DEMO_SIGNATURE,
      }),
  },
  {
    key: "daily-summary",
    name: "Daily Summary",
    subject: "Today's recap",
    description: "End-of-day activity recap (opt-in).",
    render: () =>
      dailySummaryTemplate({
        name: "Jane Photographer",
        date: "Tuesday, April 15, 2026",
        jobsCreated: 2,
        photosProcessed: 68,
        awaitingReview: 24,
        spendToday: 3.12,
        dashboardUrl: `${BASE_URL}/dashboard`,
        signature: DEMO_SIGNATURE,
      }),
  },
  {
    key: "password-reset",
    name: "Password Reset",
    subject: "Reset your ATH Editor password",
    description: "Sent when a user requests a password reset.",
    render: () => passwordResetHtml(`${BASE_URL}/reset?token=demo-reset-token`),
  },
  {
    key: "announcement",
    name: "Announcement",
    subject: "New: Sky Style selector is live",
    description: "Broadcast announcement (demo fixture).",
    render: () =>
      announcementHtml({
        title: "New: Sky Style selector is live",
        body: "You can now pick a consistent sky treatment (clear blue, dramatic, overcast) and we'll apply it across all exterior shots in a job. Find it in New Job → Sky Style.",
        ctaUrl: `${BASE_URL}/dashboard`,
        ctaLabel: "Try it now",
      }),
  },
];

export function getEmailTemplate(key: string): EmailTemplateEntry | undefined {
  return EMAIL_TEMPLATES.find(t => t.key === key);
}
