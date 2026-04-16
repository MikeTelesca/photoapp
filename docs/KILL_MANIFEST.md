# Kill Manifest — strip-to-core

Target responsibilities after the cut:
1. Upload photos (Dropbox link + direct upload)
2. Merge bracketed HDRs
3. AI-enhance photos (per-photo or bulk)
4. Export (Dropbox + local zip)
5. NextAuth email/password login + tiny `/users` admin page

Everything not supporting those five items dies.

## Summary

- KILL count: ~445 files across ~80 directories (most of `src/app/api/`, most of `src/app/(app)/`, most of `src/components/`, all of `src/app/share/`, ~20 lib files, all cron routes, all admin routes, all share routes, all billing/invoicing, all client/calendar/analytics, all PWA+push+service-worker infra)
- KEEP count: ~32 files (core enhance/HDR/dropbox/auth pipeline + UI primitives)
- KEEP (strip) count: ~10 files
- REBUILD count: ~6 files (landing, listings index, job grid, users, login, app layout)
- Prisma models to DELETE: Client, JobTemplate, Preset, Invite, ActivityLog, ErrorLog, PasswordResetToken, Notification, Announcement, FeatureFlag, ShareEmailLog, ApiKey, NoteTemplate, JobComment, PushSubscription, DownloadLog, FeedbackReport, ShareRequest, ShareView, CommentReaction, PhotoComment, PhotoRating, PhotoVersion, PhotoPin, JobWatch, LoginRecord
- Prisma models to KEEP (stripped): User, Job, Photo

---

## Pages (`src/app/**/page.tsx`, `layout.tsx`, and non-API routes)

### KILL

Entire admin panel:
- `src/app/(app)/admin/downloads/page.tsx`
- `src/app/(app)/admin/feedback/page.tsx`
- `src/app/(app)/admin/preset-stats/page.tsx`
- `src/app/(app)/admin/users/_components/impersonate-button.tsx`
- `src/app/(app)/admin/users/_components/role-toggle-button.tsx`
- `src/app/(app)/admin/users/_components/users-table.tsx`
- `src/app/(app)/admin/users/page.tsx` — replaced by minimal `/users`

Non-core features in `(app)`:
- `src/app/(app)/activity/page.tsx` — activity log killed
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/billing/page.tsx`
- `src/app/(app)/calendar/page.tsx`
- `src/app/(app)/clients/[id]/page.tsx`
- `src/app/(app)/clients/page.tsx`
- `src/app/(app)/help/page.tsx`
- `src/app/(app)/jobs/archived/page.tsx`
- `src/app/(app)/jobs/new/page.tsx` — new-job flow folds into listings REBUILD
- `src/app/(app)/photographers/page.tsx`
- `src/app/(app)/playground/page.tsx`
- `src/app/(app)/presets/page.tsx` — Preset model killed
- `src/app/(app)/review/[jobId]/invoice/print/page.tsx`
- `src/app/(app)/search/comments/page.tsx`
- `src/app/(app)/search/page.tsx`
- `src/app/(app)/search/photos/page.tsx`
- `src/app/(app)/settings/api-keys/docs/page.tsx`
- `src/app/(app)/settings/api-keys/page.tsx`
- `src/app/(app)/settings/keyboard/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/settings/sessions/page.tsx`
- `src/app/(app)/settings/snippets/page.tsx`
- `src/app/(app)/templates/page.tsx`
- `src/app/(app)/trash/page.tsx`
- `src/app/(app)/trash/row-actions.tsx`
- `src/app/(app)/whats-new/page.tsx`
- `src/app/(app)/error.tsx` — keep Next default, delete custom

Auth extras:
- `src/app/(auth)/forgot/page.tsx` — no password reset flow
- `src/app/(auth)/reset/page.tsx`
- `src/app/(auth)/signup/[token]/page.tsx` — no invites
- `src/app/(auth)/layout.tsx` — tiny; fold into REBUILD login

Public share gallery (entire feature):
- `src/app/share/[token]/page.tsx`
- `src/app/share/[token]/photo/[photoId]/page.tsx`

Misc public pages:
- `src/app/status/page.tsx`
- `src/app/opengraph-image.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/global-error.tsx` — keep Next default
- `src/app/not-found.tsx` — keep Next default

Current dashboard:
- `src/app/(app)/dashboard/page.tsx` — superseded by new listings REBUILD at `/`
- `src/app/(app)/review/[jobId]/page.tsx` — superseded by `/job/[jobId]` REBUILD

### KEEP
- `src/app/layout.tsx` — KEEP (strip): drop `SpeedInsights`, `Analytics`, `InstallPrompt`, `ServiceWorkerRegister`, `UpdateBanner`, `CookieConsent`, PWA manifest/meta, OG tags, Twitter tags. Keep Inter font, Providers, title.
- `src/app/globals.css`
- `src/app/favicon.ico`

### KEEP (strip)
- `src/app/(app)/layout.tsx` — drop `AppTopbar`, `DropboxAlertBanner`, `CommandPalette`, `ShortcutCheatsheet`, `GlobalShortcuts`, `FeedbackWidget`, `MobileBottomNav`. Keep minimal `TopNav` (or collapse to one simple header) and `SideNav` (reduced to: Jobs, Users, Logout).

### REBUILD
- `src/app/page.tsx` — new minimal landing or redirect-to-login; current marketing page is over-specified
- `src/app/(app)/jobs/page.tsx` (NEW) — listings index: table of Jobs with upload button
- `src/app/(app)/job/[jobId]/page.tsx` (NEW) — photo grid + full-screen viewer with per-photo enhance + bulk enhance + export
- `src/app/(app)/users/page.tsx` (NEW) — admin add/remove shooter accounts, tiny form
- `src/app/(auth)/login/page.tsx` — REBUILD as minimal email/password form (current version exists but fold forgot/signup cruft out)

---

## API Routes (`src/app/api/**`)

### KILL

All cron:
- `src/app/api/cron/auto-archive/route.ts`
- `src/app/api/cron/daily-summary/route.ts`
- `src/app/api/cron/fire-reminders/route.ts`
- `src/app/api/cron/pre-archive-warn/route.ts`
- `src/app/api/cron/purge-logs/route.ts`
- `src/app/api/cron/purge-trash/route.ts`
- `src/app/api/cron/recover-stuck/route.ts`
- `src/app/api/cron/recurring-templates/route.ts`
- `src/app/api/cron/weekly-digest/route.ts`

All admin (except `/api/users` which is separate):
- `src/app/api/admin/errors/export/route.ts`
- `src/app/api/admin/events/route.ts`
- `src/app/api/admin/feedback/[id]/route.ts`
- `src/app/api/admin/feedback/route.ts`
- `src/app/api/admin/flags/route.ts`
- `src/app/api/admin/health/route.ts`
- `src/app/api/admin/preset-stats/route.ts`
- `src/app/api/admin/recover-stuck/route.ts`
- `src/app/api/admin/seed-demo/route.ts`
- `src/app/api/admin/storage/route.ts`
- `src/app/api/admin/users/[id]/role/route.ts`
- `src/app/api/admin/users/[id]/route.ts`

All share (public client gallery + email + ratings + comments):
- `src/app/api/share/[token]/approve/route.ts`
- `src/app/api/share/[token]/photos/[photoId]/comment/route.ts`
- `src/app/api/share/[token]/photos/[photoId]/rating/route.ts`
- `src/app/api/share/[token]/request/route.ts`
- `src/app/api/share/[token]/verify/route.ts`
- `src/app/api/jobs/[jobId]/share/analytics/route.ts`
- `src/app/api/jobs/[jobId]/share/email/route.ts`
- `src/app/api/jobs/[jobId]/share/expiry/route.ts`
- `src/app/api/jobs/[jobId]/share/password/route.ts`
- `src/app/api/jobs/[jobId]/share/recipients/route.ts`
- `src/app/api/jobs/[jobId]/share/route.ts`
- `src/app/api/track/email-open/[id]/route.ts`

Auth extras (keep only `[...nextauth]`):
- `src/app/api/auth/forgot/route.ts`
- `src/app/api/auth/reset/route.ts`
- `src/app/api/auth/signup/route.ts`

Dropbox OAuth admin (unused token flow — Dropbox SDK auto-refreshes):
- `src/app/api/auth/dropbox/route.ts`

Invites / notifications / push / feedback:
- `src/app/api/invites/[token]/route.ts`
- `src/app/api/invites/route.ts`
- `src/app/api/notifications/read/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/feedback/route.ts`

Clients / activity / billing / dashboard / stats / status / search / playground:
- `src/app/api/clients/[id]/merge/route.ts`
- `src/app/api/clients/[id]/route.ts`
- `src/app/api/clients/bulk/route.ts`
- `src/app/api/clients/export/route.ts`
- `src/app/api/clients/import/route.ts`
- `src/app/api/clients/route.ts`
- `src/app/api/activity/export/route.ts`
- `src/app/api/activity/route.ts`
- `src/app/api/billing/usage-csv/route.ts`
- `src/app/api/dashboard/heatmap/route.ts`
- `src/app/api/dashboard/photo-stats/route.ts`
- `src/app/api/stats/route.ts`
- `src/app/api/status/dropbox/route.ts`
- `src/app/api/public/status/route.ts`
- `src/app/api/search/palette/route.ts`
- `src/app/api/search/route.ts`
- `src/app/api/comments/react/route.ts`
- `src/app/api/comments/search/route.ts`
- `src/app/api/photos/search/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/playground/enhance/route.ts`

Presets / templates / note-templates / shortcuts:
- `src/app/api/presets/[presetId]/clone/route.ts`
- `src/app/api/presets/[presetId]/fork/route.ts`
- `src/app/api/presets/[presetId]/route.ts`
- `src/app/api/presets/export/route.ts`
- `src/app/api/presets/import/route.ts`
- `src/app/api/presets/route.ts`
- `src/app/api/note-templates/[id]/route.ts`
- `src/app/api/note-templates/route.ts`
- `src/app/api/templates/[id]/route.ts`
- `src/app/api/templates/route.ts`
- `src/app/api/shortcuts/pdf/route.ts`

User settings routes (keep nothing — simplified app has no settings):
- `src/app/api/user/2fa/disable/route.ts`
- `src/app/api/user/2fa/setup/route.ts`
- `src/app/api/user/2fa/verify/route.ts`
- `src/app/api/user/api-keys/[id]/route.ts`
- `src/app/api/user/api-keys/route.ts`
- `src/app/api/user/delete-account/route.ts`
- `src/app/api/user/export-data/route.ts`
- `src/app/api/user/invoice-logo/preview/route.ts`
- `src/app/api/user/invoice-logo/route.ts`
- `src/app/api/user/password/route.ts`
- `src/app/api/user/profile/route.ts`
- `src/app/api/user/settings/export/route.ts`
- `src/app/api/user/settings/import/route.ts`
- `src/app/api/user/status-snippets/route.ts`
- `src/app/api/user/suggested-preset/route.ts`
- `src/app/api/user/tags/route.ts`
- `src/app/api/user/test-webhook/route.ts`
- `src/app/api/user/watermark-logo/preview/route.ts`
- `src/app/api/user/watermark-logo/route.ts`

Public API v1:
- `src/app/api/v1/jobs/route.ts`
- `src/app/api/v1/stats/route.ts`

Jobs feature extras (non-core) — large batch to KILL:
- `src/app/api/jobs/[jobId]/annotation-pdf/route.ts`
- `src/app/api/jobs/[jobId]/approve-all/route.ts`
- `src/app/api/jobs/[jobId]/archive/route.ts`
- `src/app/api/jobs/[jobId]/auto-caption-all/route.ts`
- `src/app/api/jobs/[jobId]/auto-tag/route.ts`
- `src/app/api/jobs/[jobId]/captions/route.ts`
- `src/app/api/jobs/[jobId]/color-palette/route.ts`
- `src/app/api/jobs/[jobId]/comments/[commentId]/route.ts`
- `src/app/api/jobs/[jobId]/comments/route.ts`
- `src/app/api/jobs/[jobId]/contact-sheet/route.ts`
- `src/app/api/jobs/[jobId]/cover-photo/route.ts`
- `src/app/api/jobs/[jobId]/download-mls/route.ts`
- `src/app/api/jobs/[jobId]/download-originals/route.ts`
- `src/app/api/jobs/[jobId]/download-selected/route.ts`
- `src/app/api/jobs/[jobId]/download/route.ts` — replaced by download-zip
- `src/app/api/jobs/[jobId]/dropbox-link/route.ts` — merge into sync-dropbox or strip
- `src/app/api/jobs/[jobId]/duplicate/route.ts`
- `src/app/api/jobs/[jobId]/estimate/route.ts`
- `src/app/api/jobs/[jobId]/eta/route.ts`
- `src/app/api/jobs/[jobId]/generate-description/route.ts`
- `src/app/api/jobs/[jobId]/invoice/paid/route.ts`
- `src/app/api/jobs/[jobId]/invoice/preview/route.ts`
- `src/app/api/jobs/[jobId]/invoice/route.ts`
- `src/app/api/jobs/[jobId]/lock/route.ts`
- `src/app/api/jobs/[jobId]/notes/route.ts`
- `src/app/api/jobs/[jobId]/pdf-gallery/route.ts`
- `src/app/api/jobs/[jobId]/photos-csv/route.ts`
- `src/app/api/jobs/[jobId]/photos-preview/route.ts`
- `src/app/api/jobs/[jobId]/pin/route.ts`
- `src/app/api/jobs/[jobId]/purge/route.ts`
- `src/app/api/jobs/[jobId]/redetect-twilight/route.ts`
- `src/app/api/jobs/[jobId]/regroup-by-exif/route.ts` — merge logic into start-enhance if desired
- `src/app/api/jobs/[jobId]/reingest/route.ts`
- `src/app/api/jobs/[jobId]/reject-all-pending/route.ts`
- `src/app/api/jobs/[jobId]/reminder/route.ts`
- `src/app/api/jobs/[jobId]/reorder/route.ts`
- `src/app/api/jobs/[jobId]/reset-edited/route.ts`
- `src/app/api/jobs/[jobId]/restore/route.ts`
- `src/app/api/jobs/[jobId]/smart-order/route.ts`
- `src/app/api/jobs/[jobId]/snooze/route.ts`
- `src/app/api/jobs/[jobId]/suggest-preset/route.ts`
- `src/app/api/jobs/[jobId]/suggest-tags/route.ts`
- `src/app/api/jobs/[jobId]/timeline/route.ts`
- `src/app/api/jobs/[jobId]/track-time/route.ts`
- `src/app/api/jobs/[jobId]/translate-description/route.ts`
- `src/app/api/jobs/[jobId]/watch/route.ts`
- `src/app/api/jobs/[jobId]/progress/stream/route.ts` (if not needed; progress can poll)

Top-level jobs extras:
- `src/app/api/jobs/addresses/route.ts`
- `src/app/api/jobs/bulk-assign-client/route.ts`
- `src/app/api/jobs/bulk/route.ts`
- `src/app/api/jobs/check-duplicate/route.ts`
- `src/app/api/jobs/demo/route.ts`
- `src/app/api/jobs/export-csv/route.ts`
- `src/app/api/jobs/export/route.ts`
- `src/app/api/jobs/inbox-count/route.ts`
- `src/app/api/jobs/progress/stream/route.ts`
- `src/app/api/jobs/search/route.ts`
- `src/app/api/jobs/tags/route.ts`
- `src/app/api/jobs/today-count/route.ts`
- `src/app/api/jobs/today-summary/route.ts`

Per-photo routes NOT in core:
- `src/app/api/jobs/[jobId]/photos/[photoId]/apply-crop/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/aspect-crop/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/caption/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/compare/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/favorite/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/flip/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/pins/[pinId]/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/pins/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/retry/route.ts` — covered by re-enhance
- `src/app/api/jobs/[jobId]/photos/[photoId]/rotate/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/suggest-crop/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/versions/[versionId]/revert/route.ts`
- `src/app/api/jobs/[jobId]/photos/[photoId]/versions/route.ts`

Batch photo ops:
- `src/app/api/jobs/[jobId]/photos/batch-metadata/route.ts`
- `src/app/api/jobs/[jobId]/photos/batch-rotate/route.ts`
- `src/app/api/jobs/[jobId]/photos/batch-tags/route.ts`
- `src/app/api/jobs/[jobId]/photos/bulk-rotate/route.ts`
- `src/app/api/jobs/[jobId]/photos/bulk/route.ts`
- `src/app/api/jobs/[jobId]/photos/reorder/route.ts` — reorder keep? See unknown.

Top-level photos/* (all extras except bare GET):
- `src/app/api/photos/[photoId]/auto-caption/route.ts`
- `src/app/api/photos/[photoId]/color-label/route.ts`
- `src/app/api/photos/[photoId]/detect-orientation/route.ts`
- `src/app/api/photos/[photoId]/download/route.ts` — duplicated under jobs/[jobId]/photos
- `src/app/api/photos/[photoId]/exif/route.ts`
- `src/app/api/photos/[photoId]/favorite/route.ts`
- `src/app/api/photos/[photoId]/move/route.ts`
- `src/app/api/photos/[photoId]/note-pin/route.ts`
- `src/app/api/photos/[photoId]/preset-override/route.ts`
- `src/app/api/photos/[photoId]/public-url/route.ts`
- `src/app/api/photos/[photoId]/rename/route.ts`
- `src/app/api/photos/[photoId]/replace/route.ts`
- `src/app/api/photos/[photoId]/retouch-request/route.ts`

Dropbox test:
- `src/app/api/dropbox/test/route.ts`

### KEEP
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/app/api/dropbox/list/route.ts` — Dropbox folder listing for upload flow
- `src/app/api/users/route.ts` — admin add/remove shooters
- `src/app/api/users/[userId]/route.ts` — admin update/delete

### KEEP (strip)
- `src/app/api/jobs/route.ts` — strip `logActivity` calls; keep job create + list
- `src/app/api/jobs/[jobId]/route.ts` — strip `logActivity`; drop kill-related fields (shareToken, watermarkText, clientApproval*, pinnedAt, snoozed*, reminder*, invoice*, lockedAt, archivedAt, colorLabel, customFields, listingDescription, trackedTimeSeconds, coverPhotoId). Keep status, preset, tvStyle, skyStyle, address, tags, notes.
- `src/app/api/jobs/[jobId]/ingest/route.ts` — KEEP; depends on `ingest.ts`
- `src/app/api/jobs/[jobId]/ingest-uploaded/route.ts` — KEEP if used by direct upload flow; else KILL
- `src/app/api/jobs/[jobId]/upload/route.ts` — KEEP; direct file upload to Dropbox
- `src/app/api/jobs/[jobId]/start-enhance/route.ts` — KEEP (strip): remove email templates, slack notifications, push notifications, applySubject, notifyJobWatchers, shouldNotify. Keep Gemini enhance loop + EXIF + bracket logic + dropbox upload.
- `src/app/api/jobs/[jobId]/batch-enhance/route.ts` — KEEP (strip): remove rate-limit if desired; core bulk enhance loop
- `src/app/api/jobs/[jobId]/photos/[photoId]/enhance/route.ts` — KEEP (strip): remove `logActivity`, `detectPhotoTags`, twilight override fields
- `src/app/api/jobs/[jobId]/photos/[photoId]/route.ts` — KEEP (strip): restrict PATCH fields to `status`, `note`, `customInstructions`, `customPromptOverride`. Drop colorLabel, notePinned, caption, flagged, presetOverride, retouchRequest, twilightInstructions, twilightStyle.
- `src/app/api/jobs/[jobId]/photos/route.ts` — KEEP: list photos for a job
- `src/app/api/jobs/[jobId]/photos/[photoId]/original/route.ts` — KEEP: serve original image
- `src/app/api/jobs/[jobId]/photos/[photoId]/download/route.ts` — KEEP (strip): remove watermark
- `src/app/api/jobs/[jobId]/download-zip/route.ts` — KEEP (strip): remove watermark logic; keep JSZip + sharp + filename pattern
- `src/app/api/jobs/[jobId]/sync-dropbox/route.ts` — KEEP (strip): remove sharp watermark; keep uploadInternalFile

---

## Components (`src/components/**`)

### KILL

Admin / activity / analytics / billing / calendar / clients / comments / dashboard (most) / feedback / help / jobs helpers / notes / notifications / onboarding / photographers / presets / pwa / settings / share / templates / legal — entire trees:

- `src/components/activity/activity-filter.tsx`
- `src/components/admin/seed-demo-button.tsx`
- `src/components/analytics/completion-time-chart.tsx`
- `src/components/analytics/daily-chart.tsx`
- `src/components/analytics/forecast-chart.tsx`
- `src/components/analytics/photographer-cost-chart.tsx`
- `src/components/billing/invoice-preview-modal.tsx`
- `src/components/billing/print-button.tsx`
- `src/components/billing/revenue-chart.tsx`
- `src/components/billing/usage-csv-export.tsx`
- `src/components/calendar/calendar-day-popover.tsx`
- `src/components/clients/add-client-modal.tsx`
- `src/components/clients/client-detail-actions.tsx`
- `src/components/clients/client-monthly-chart.tsx`
- `src/components/clients/clients-list-with-select.tsx`
- `src/components/clients/import-button.tsx`
- `src/components/clients/merge-client-button.tsx`
- `src/components/clients/sparkline.tsx`
- `src/components/comments/reactions.tsx`
- `src/components/common/tag-input.tsx`
- `src/components/dashboard/activity-feed.tsx`
- `src/components/dashboard/activity-heatmap.tsx`
- `src/components/dashboard/archive-button.tsx`
- `src/components/dashboard/auto-refresh.tsx`
- `src/components/dashboard/color-label-picker.tsx`
- `src/components/dashboard/copy-job-link-button.tsx`
- `src/components/dashboard/cost-tracker.tsx`
- `src/components/dashboard/customize-button.tsx`
- `src/components/dashboard/delete-job-button.tsx`
- `src/components/dashboard/delete-template-button.tsx`
- `src/components/dashboard/demo-job-button.tsx`
- `src/components/dashboard/download-button.tsx`
- `src/components/dashboard/duplicate-job-button.tsx`
- `src/components/dashboard/edit-address-button.tsx`
- `src/components/dashboard/edit-tags-button.tsx`
- `src/components/dashboard/eta-badge.tsx`
- `src/components/dashboard/greeting-widget.tsx`
- `src/components/dashboard/inbox-widget.tsx`
- `src/components/dashboard/inline-preset-switch.tsx`
- `src/components/dashboard/job-card.tsx`
- `src/components/dashboard/job-filter-bar.tsx`
- `src/components/dashboard/job-hover-preview.tsx`
- `src/components/dashboard/job-kanban.tsx`
- `src/components/dashboard/job-list.tsx` — REBUILD inline into listings page
- `src/components/dashboard/live-progress-indicator.tsx`
- `src/components/dashboard/lock-button.tsx`
- `src/components/dashboard/onboarding-checklist.tsx`
- `src/components/dashboard/photo-stats-widget.tsx`
- `src/components/dashboard/pin-button.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/dashboard/recent-activity-widget.tsx`
- `src/components/dashboard/recently-viewed-widget.tsx`
- `src/components/dashboard/row-overflow-menu.tsx`
- `src/components/dashboard/save-template-button.tsx`
- `src/components/dashboard/snooze-button.tsx`
- `src/components/dashboard/stats-cards.tsx`
- `src/components/dashboard/status-hover-card.tsx`
- `src/components/dashboard/watch-button.tsx`
- `src/components/dashboard/weekly-activity.tsx`
- `src/components/dashboard/widget-wrapper.tsx`
- `src/components/feedback/feedback-widget.tsx`
- `src/components/help/restart-tour-button.tsx`
- `src/components/jobs/client-picker.tsx`
- `src/components/jobs/duplicate-warning.tsx`
- `src/components/jobs/tag-autocomplete.tsx`
- `src/components/jobs/template-picker.tsx`
- `src/components/layout/app-topbar.tsx`
- `src/components/layout/command-palette.tsx`
- `src/components/layout/dropbox-alert-banner.tsx`
- `src/components/layout/dropbox-status.tsx`
- `src/components/layout/global-shortcuts.tsx`
- `src/components/layout/mobile-bottom-nav.tsx`
- `src/components/layout/quick-add-fab.tsx`
- `src/components/layout/shortcut-cheatsheet.tsx`
- `src/components/layout/sidebar-badge.tsx`
- `src/components/layout/sidebar-search.tsx`
- `src/components/layout/today-count-chip.tsx`
- `src/components/layout/topbar.tsx` — duplicate of top-nav
- `src/components/legal/cookie-consent.tsx`
- `src/components/notes/snippet-picker.tsx`
- `src/components/notes/status-snippet-picker.tsx`
- `src/components/notifications/notification-handler.tsx`
- `src/components/notifications/push-subscribe-button.tsx`
- `src/components/onboarding/onboarding-tour.tsx`
- `src/components/onboarding/welcome-modal.tsx`
- `src/components/photographers/photographers-manager.tsx` — replaced by REBUILD `/users`
- `src/components/presets/fork-preset-button.tsx`
- `src/components/presets/presets-manager.tsx`
- `src/components/presets/prompt-linter.tsx`
- `src/components/pwa/install-prompt.tsx`
- `src/components/pwa/sw-register.tsx`
- `src/components/pwa/update-banner.tsx`
- `src/components/settings/accent-picker.tsx`
- `src/components/settings/account-form.tsx`
- `src/components/settings/auto-archive-select.tsx`
- `src/components/settings/backup-restore.tsx`
- `src/components/settings/budget-input.tsx`
- `src/components/settings/daily-summary-toggle.tsx`
- `src/components/settings/date-format-picker.tsx`
- `src/components/settings/delete-account-form.tsx`
- `src/components/settings/email-notification-toggle.tsx`
- `src/components/settings/email-signature-form.tsx`
- `src/components/settings/email-subject-form.tsx`
- `src/components/settings/filename-pattern-form.tsx`
- `src/components/settings/invoice-logo-upload.tsx`
- `src/components/settings/invoice-settings-form.tsx`
- `src/components/settings/job-prefix-input.tsx`
- `src/components/settings/maintenance-actions.tsx`
- `src/components/settings/notification-prefs.tsx`
- `src/components/settings/notification-toggle.tsx`
- `src/components/settings/portfolio-settings-form.tsx`
- `src/components/settings/prompt-prefix-form.tsx`
- `src/components/settings/referral-card.tsx`
- `src/components/settings/replay-onboarding-button.tsx`
- `src/components/settings/sound-toggle.tsx`
- `src/components/settings/status-snippets-form.tsx`
- `src/components/settings/tags-inherit-toggle.tsx`
- `src/components/settings/timezone-picker.tsx`
- `src/components/settings/two-factor-form.tsx`
- `src/components/settings/watermark-logo-upload.tsx`
- `src/components/settings/webhook-form.tsx`
- `src/components/settings/weekly-digest-toggle.tsx`
- `src/components/share/approval-form.tsx`
- `src/components/share/comment-form.tsx`
- `src/components/share/contact-form.tsx`
- `src/components/share/password-gate.tsx`
- `src/components/share/star-rating.tsx`
- `src/components/templates/recurrence-picker.tsx`

Review sub-components tied to killed features:
- `src/components/review/before-after-slider.tsx` (duplicate of ui/before-after-slider)
- `src/components/review/custom-fields-editor.tsx`
- `src/components/review/exif-panel.tsx` — killable; exif stays internally, not UI
- `src/components/review/job-color-palette.tsx`
- `src/components/review/job-comments.tsx`
- `src/components/review/job-timeline.tsx`
- `src/components/review/keyboard-hint.tsx`
- `src/components/review/notes-popover.tsx`
- `src/components/review/photo-minimap.tsx`
- `src/components/review/photo-note.tsx`
- `src/components/review/photo-pins.tsx`
- `src/components/review/photo-versions.tsx`
- `src/components/review/reingest-button.tsx`
- `src/components/review/reminder-button.tsx`
- `src/components/review/share-analytics-modal.tsx`
- `src/components/review/share-button.tsx`
- `src/components/review/slideshow.tsx`
- `src/components/review/thumb-hover-preview.tsx`
- `src/components/review/time-tracker.tsx`
- `src/components/review/watermark-preview-overlay.tsx`
- `src/components/review/zoomable-image.tsx` — keep only if full-screen viewer REBUILD uses it; safer to REBUILD inline
- `src/components/review/compare-slider.tsx` — decide in unknowns
- `src/components/review/lazy-thumb.tsx` — small, trivial to reinline; kill

### KEEP
- `src/components/providers.tsx` — KEEP (strip): drop `AccentProvider`; keep `SessionProvider`, `ToastProvider`, `ThemeProvider`
- `src/components/theme-provider.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/info-tooltip.tsx`
- `src/components/ui/markdown.tsx`
- `src/components/ui/password-strength.tsx`
- `src/components/ui/progress-bar.tsx`
- `src/components/ui/stat-card.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/floating-toolbar.tsx` — used by new review UI
- `src/components/ui/icon-rail.tsx`
- `src/components/ui/progress-row.tsx`
- `src/components/ui/before-after-slider.tsx` — KEEP; enhance viewer uses it
- `src/components/layout/dark-mode-toggle.tsx`

### KEEP (strip)
- `src/components/layout/top-nav.tsx` — strip links to killed pages (activity, analytics, billing, calendar, clients, presets, templates, settings). Keep Jobs + Users (admin) + Logout.
- `src/components/layout/side-nav.tsx` — same stripping as top-nav

### REBUILD
- `src/components/review/review-gallery.tsx` — 5400-line god-component. Do NOT read it. REBUILD as minimal photo grid + full-screen viewer with: per-photo enhance, bulk enhance, approve/reject, download zip, Dropbox sync. Use new small files, not a single monolith.
- `src/components/theme/accent-provider.tsx` — decide in unknowns (can just delete, theming already handled by ThemeProvider)

---

## Libraries (`src/lib/**`)

Verified through import grep. The enhance pipeline, HDR group logic, Dropbox, auth, and export path determine what stays.

### KILL

Unused or tied to killed features:
- `src/lib/activity.ts` — `ActivityLog` model killed; all `logActivity` calls stripped from keep routes
- `src/lib/dashboard-filters.ts`
- `src/lib/dashboard-widgets.ts`
- `src/lib/dropbox-token.ts` — DEAD CODE; not imported anywhere (dropbox.ts uses SDK auto-refresh)
- `src/lib/email.ts` — no transactional email in stripped app
- `src/lib/email-subject.ts`
- `src/lib/error-log.ts` — ErrorLog model killed
- `src/lib/feature-flags.ts`
- `src/lib/forecast.ts`
- `src/lib/job-stale.ts`
- `src/lib/keyboard-shortcuts.ts`
- `src/lib/mls-order.ts`
- `src/lib/notify.ts` — Notification model killed
- `src/lib/photo-tags.ts` — auto-tagging killed
- `src/lib/pricing.ts` — single constant, inline into enhance lib
- `src/lib/prompt-linter.ts`
- `src/lib/push.ts` — PushSubscription model killed
- `src/lib/recently-viewed.ts`
- `src/lib/referral-code.ts`
- `src/lib/search-history.ts`
- `src/lib/seasonal-styles.ts` — keep-or-kill; folded into ai-enhance; mark KILL for strip-to-core
- `src/lib/slack.ts`
- `src/lib/sounds.ts`
- `src/lib/tag-color.ts`
- `src/lib/vapid.ts` — push keys, killed
- `src/lib/watermark.ts` — watermark feature killed
- `src/lib/webhook.ts`
- `src/lib/api-keys.ts` — ApiKey model killed
- `src/lib/api-key-auth.ts` — no more public API
- `src/lib/job-number.ts` — decide in unknowns (can reuse simple counter)
- `src/lib/date-format.ts` / `src/lib/format-date.ts` — use native Intl; kill both
- `src/lib/download-log.ts` — DownloadLog model killed

### KEEP
- `src/lib/db.ts` — Prisma client singleton
- `src/lib/auth.ts` — NextAuth initializer (strip invites/reset downstream)
- `src/lib/auth.config.ts` — edge auth config
- `src/lib/api-auth.ts` — session + admin gating
- `src/lib/dropbox.ts` — SDK wrapper
- `src/lib/ai-enhance.ts` — Gemini call pipeline (only deps: `@google/generative-ai`, `./prompt-safety`)
- `src/lib/prompt-safety.ts` — used by ai-enhance
- `src/lib/bracket-grouping.ts` — EXIF-based HDR grouping; used by regroup-by-exif. Will be wired into start-enhance during rebuild.
- `src/lib/exif.ts` — EXIF parse; used by start-enhance + bracket-grouping
- `src/lib/image-quality.ts` — used by enhance routes
- `src/lib/twilight-detect.ts` — used by ingest
- `src/lib/ingest.ts` — Dropbox folder ingestion
- `src/lib/logger.ts` — structured JSON logger
- `src/lib/types.ts` — shared TS types (strip unused ones)

### KEEP (strip)
- `src/lib/filename-pattern.ts` — used by download-zip; KEEP (strip): drop any template placeholders that refer to killed fields (client, invoice, etc)
- `src/lib/rate-limit.ts` — KEEP (strip) or KILL; enhance is the only hot path. If left in, simplify.

---

## Prisma models (`prisma/schema.prisma`)

### KILL (drop models entirely)

- `Client` — no client roster
- `JobTemplate` — no job templates
- `Preset` — no preset management (prompt presets move to hardcoded strings in code)
- `Invite` — no user invitations
- `ActivityLog` — no activity feed
- `ErrorLog` — rely on platform logs (Vercel)
- `PasswordResetToken` — no reset flow
- `Notification` — no in-app notifications
- `Announcement` — no announcements bar
- `FeatureFlag` — kill
- `ShareEmailLog` — share killed
- `ShareRequest` — share killed
- `ShareView` — share killed
- `ApiKey` — no public API
- `NoteTemplate` — no snippets
- `JobComment` — no job comments
- `PushSubscription` — no push
- `DownloadLog` — no usage tracking
- `FeedbackReport` — no in-app feedback widget
- `CommentReaction` — comments killed
- `PhotoComment` — comments killed
- `PhotoRating` — ratings killed
- `PhotoVersion` — versioning killed
- `PhotoPin` — pins killed
- `JobWatch` — watchers killed
- `LoginRecord` — no session audit log

### KEEP (strip relations and fields)

- `User`:
  - KILL fields: `monthlyAiCostLimit`, `budgetPerJob`, `emailNotifications`, `businessName`, `businessEmail`, `businessPhone`, `businessAddress`, `invoiceRate`, `pricePerPhoto`, `fixedFeeCents`, `invoicePrefix`, `invoiceCounter`, `jobSequenceCounter`, `jobSequencePrefix`, `slackWebhookUrl`, `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes`, `watermarkLogoPath`, `invoiceLogoPath`, `weeklyDigest`, `dailySummary`, `notifyJobReady`, `notifyClientComment`, `notifyPhotoFailed`, `timezone`, `emailSignature`, `shareEmailSignature`, `autoArchiveDays`, `promptPrefix`, `filenamePattern`, `shareEmailSubject`, `jobReadyEmailSubject`, `portfolioSlug`, `portfolioEnabled`, `portfolioBio`, `statusSnippets`, `tagsInheritFromJob`, `rateLimitTier`, `onboardedAt`, `referralCode`, `referredByUserId`, `avatarUrl`
  - KILL relations: `jobTemplates`, `clients`, `passwordResetTokens`, `loginRecords`, `notifications`, `apiKeys`, `noteTemplates`, `jobComments`, `pushSubscriptions`, `feedbackReports`, `jobWatches`
  - KEEP: `id`, `name`, `email`, `password`, `role`, `createdAt`, `updatedAt`, `jobs`

- `Job`:
  - KILL fields: `seasonalStyle` (if twilight killed — see unknowns), `priority`, `twilightCount`, `cost`, `internalNotes`, `watermarkText`, `watermarkPosition`, `watermarkSize`, `watermarkOpacity`, `tags`, `clientName`, `clientId`, `customPromptOverride`, `customFields`, `sequenceNumber`, `shareToken`, `shareEnabled`, `sharePassword`, `sharePasswordHash`, `sharePasswordSalt`, `shareExpiresAt`, `shareViewCount`, `shareFirstViewedAt`, `shareLastViewedAt`, `listingDescription`, `archivedAt`, `invoicePaidAt`, `invoiceSentAt`, `invoiceNumber`, `pinnedAt`, `snoozedUntil`, `reminderAt`, `reminderNote`, `reminderSent`, `lockedAt`, `trackedTimeSeconds`, `coverPhotoId`, `colorLabel`, `deletedAt`, `clientApprovalStatus`, `clientApprovedAt`, `clientApprovalNote`
  - KILL relations: `client`, `shareEmailLogs`, `jobComments`, `shareRequests`, `shareViews`, `watches`
  - KEEP: `id`, `address`, `dropboxUrl`, `preset`, `tvStyle`, `skyStyle`, `status`, `totalPhotos`, `processedPhotos`, `approvedPhotos`, `rejectedPhotos`, `notes`, `dropboxSyncPath`, `dropboxSyncUrl`, `dropboxSyncedAt`, `createdAt`, `updatedAt`, `photographer`, `photographerId`, `photos`

- `Photo`:
  - KILL fields: `isFavorite`, `favorited`, `flagged`, `twilightInstructions`, `twilightStyle`, `customPromptOverride`, `presetOverride`, `retouchRequest`, `detections`, `qualityFlags`, `autoTags`, `rejectionReason`, `notePinned`, `caption`, `customFilename`, `colorLabel`
  - KILL relations: `comments`, `ratings`, `versions`, `pins`
  - KEEP: `id`, `jobId`, `job`, `orderIndex`, `status`, `originalUrl`, `editedUrl`, `thumbnailUrl`, `isExterior`, `isTwilight` (if twilight stays), `customInstructions`, `bracketGroup`, `bracketIndex`, `exifData`, `fileSizeBytes`, `widthPx`, `heightPx`, `errorMessage`, `errorAttempts`, `retryCount`, `maxRetries`, `note`, `createdAt`, `updatedAt`

---

## Prisma generated (`src/generated/prisma/**`)

Entire directory will regenerate from the stripped schema on next `prisma generate`. Files currently there must all be deleted (or left for regeneration), but they are not hand-maintained:

- `src/generated/prisma/` (whole directory) — will auto-regenerate after schema cut

Only the model files for killed models (`ActivityLog.ts`, `ApiKey.ts`, `Client.ts`, `CommentReaction.ts`, `DownloadLog.ts`, `ErrorLog.ts`, `FeatureFlag.ts`, `FeedbackReport.ts`, `Invite.ts`, `JobComment.ts`, `JobTemplate.ts`, `JobWatch.ts`, `LoginRecord.ts`, `NoteTemplate.ts`, `Notification.ts`, `PasswordResetToken.ts`, `PhotoComment.ts`, `PhotoPin.ts`, `PhotoRating.ts`, `PhotoVersion.ts`, `Preset.ts`, `PushSubscription.ts`, `ShareEmailLog.ts`, `ShareRequest.ts`, `ShareView.ts`, plus `Announcement.ts`) will simply not regenerate. Remaining: `User.ts`, `Job.ts`, `Photo.ts`, plus internal module files.

---

## Hooks (`src/hooks/**`)

### KILL
- `src/hooks/use-global-shortcuts.ts` — global keyboard shortcut infra
- `src/hooks/use-job-progress.ts` — only needed if progress/stream route stays; SSE kill

### KEEP
- `src/hooks/use-swipe.ts` — used by full-screen viewer (reuse in REBUILD job page)

---

## Types (`src/types/**`)

### KEEP (strip)
- `src/types/next-auth.d.ts` — strip `impersonating`, `realUserId`, `impersonatedUserId` (no impersonation feature). Keep `user.id`, `user.role`.

---

## Prisma + migrations

### KEEP (strip)
- `prisma/schema.prisma` — apply model/field cuts listed above
- `prisma/seed.ts` — strip to: create first admin user; kill everything else

### KILL
- `prisma/dev.db` — empty local sqlite stub
- `dev.db` (repo root) — empty local sqlite stub
- `prisma/migrations/` — contains a single historical catch-up + notes. If you plan to `prisma db push` from the new schema on Neon, KILL the whole directory and start fresh. If you use `prisma migrate`, KEEP and author a new reduction migration. (Decision needed — see unknowns.)
- `prisma.config.ts` — KEEP; trivial

---

## Public assets (`public/**`)

### KILL
- `public/sw.js` — service worker, PWA killed
- `public/manifest.json` — PWA manifest killed
- `public/icon-192.png` — PWA only
- `public/icon-512.png` — PWA only
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` — unused Next.js boilerplate

### KEEP
- (none strictly required)

---

## Scripts (`scripts/**`)

### KILL
- `scripts/apply-catchup.mjs` — one-shot catch-up, no longer relevant after schema reset
- `scripts/bump-sw-version.mjs` — service worker killed; remove `prebuild` from package.json
- `scripts/reconcile-schema.mjs` — one-shot schema reconciliation helper

---

## Config files / root

### KILL
- `dev.db` (empty SQLite stub)
- `CHANGELOG.md` — feature-heavy changelog; no longer meaningful after strip
- `.env.local-sqlite-backup` — stale sqlite env backup
- `.env.vercel-check` — stale debugging env

### KEEP
- `.env`, `.env.example`, `.env.local`, `.env.production` — keep; audit secrets (Dropbox, Google Gemini, NextAuth, Neon) and remove Slack/Resend/VAPID/webhook keys
- `next.config.ts`, `next-env.d.ts`, `tsconfig.json`, `tsconfig.tsbuildinfo`
- `postcss.config.mjs`, `tailwind.config.ts`, `eslint.config.mjs`
- `vercel.json` — KEEP (strip): remove crons, sw headers, maintenance rewrites
- `README.md` — KEEP (strip to ~30 lines); current is heavy
- `prisma.config.ts`

### KEEP (strip)
- `package.json`:
  - Remove `prebuild` script (service worker killed)
  - Deps to remove:
    - `@vercel/analytics`, `@vercel/speed-insights` (telemetry killed)
    - `web-push` (push killed)
    - `resend` (email killed)
    - `otpauth`, `qrcode` (2FA killed)
    - `@heroicons/react` (only if no KEEP components use it — verify before delete)
    - `pdfkit`, `@types/pdfkit` (pdf gallery + invoice + annotation PDFs all killed)
    - `recharts` (charts killed)
    - `react-markdown`, `remark-gfm` (markdown only used in help + whats-new, killed) — verify ui/markdown.tsx consumers first
    - `@libsql/client`, `@prisma/adapter-libsql`, `@prisma/adapter-better-sqlite3`, `better-sqlite3` (sqlite fallbacks, Neon only)
    - `exif-reader`, `@types/exif-reader` (only if exif.ts uses exifr — verify; currently both exist)
  - Deps to keep:
    - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — used in reorder (verify reorder stays, see unknowns)
    - `@google/generative-ai` — core enhance
    - `@neondatabase/serverless`, `@prisma/adapter-neon`, `@prisma/client`, `prisma` — DB
    - `bcryptjs`, `@types/bcryptjs`, `next-auth` — auth
    - `dropbox` — Dropbox SDK
    - `exifr` — EXIF parsing
    - `jszip` — zip export
    - `sharp` — image ops (resize, thumbnails, zip prep)
    - `next`, `react`, `react-dom` — core framework

---

## Unknowns / decisions needed

1. **Twilight conversion feature** — Keep `isTwilight`, `twilight-detect.ts`, `seasonalStyle`? It's wired into `ingest.ts` and `ai-enhance.ts`. If yes, keep `seasonalStyle` on Job and `isTwilight` on Photo. If no, kill `twilight-detect.ts` and those fields. Recommend KEEP (minimal twilight detect is basically free).
2. **Photo reorder (drag-and-drop)** — Does the new job page need reorder? If yes, keep `@dnd-kit/*` and the reorder API. If no, drop `@dnd-kit/*` entirely.
3. **Before/after compare slider** — Keep `components/ui/before-after-slider.tsx` + `components/review/compare-slider.tsx`? Useful UX for reviewing AI edits. Recommend KEEP one.
4. **Prisma migrations history** — Reset migrations dir and start fresh, or author a reduction migration? Neon contains real data — the safer path is `prisma db push` with a fresh schema. Recommend reset, but you must verify data is preserved (column drops do NOT drop data unless Prisma is told to).
5. **`/users` admin permissions** — Keep the `role = "admin" | "photographer"` split, or single-role? Required for `/users` admin page to exist.
6. **`image-quality.ts`** — currently writes `qualityFlags` to Photo (which is killed). Keep the function for internal warnings, or kill entirely? Recommend KILL unless you want a blur/exposure warning badge in the new UI.
7. **Structured JSON logger (`logger.ts`)** — keep, or switch to plain `console`? Recommend KEEP.
8. **Filename pattern** — with `filenamePattern` removed from User, keep `filename-pattern.ts` as a constant template (`{address}-{seq}.{ext}`) or inline into download-zip route?
9. **Default theme / accent colors** — kill `accent-provider.tsx` and flatten theming to a single accent, or keep full theme customization?
10. **Dropbox OAuth admin endpoint (`/api/auth/dropbox`)** — fully kill? You mentioned Dropbox stays; but the SDK uses refresh tokens from env, not a UI-driven OAuth dance, so this route is safe to kill.

---

## Decisions (locked 2026-04-16)

1. **Twilight conversion** — KEEP. Keep `Photo.isTwilight`, `Job.seasonalStyle`, `lib/twilight-detect.ts`, twilight prompts in `ai-enhance.ts`.
2. **Photo reorder drag-and-drop** — KEEP. Keep `@dnd-kit/*` deps + `/api/jobs/[jobId]/photos/reorder/route.ts`.
3. **Prisma migration** — `prisma db push` against Neon. Delete `prisma/migrations/` dir; next push creates a fresh baseline. Column drops in Prisma preserve row data on other columns.
4. **Before/after compare slider** — KEEP `components/ui/before-after-slider.tsx`. KILL duplicate `components/review/before-after-slider.tsx` and `components/review/compare-slider.tsx`.
5. **/users role split** — KEEP `role: "admin" | "photographer"`. `/users` page gated to admin.
6. **image-quality.ts** — KILL. `qualityFlags` Photo field is gone; no badge in new UI.
7. **logger.ts** — KEEP.
8. **filename-pattern.ts** — KEEP as inline constant `{address}-{seq}.{ext}` in `download-zip` route; delete the separate file.
9. **accent-provider.tsx** — KILL. ThemeProvider handles dark/light only.
10. **/api/auth/dropbox** — KILL. SDK uses env refresh token.

---

## Rough file counts

- Total source files currently (`src/**` ts/tsx): 520
- Total src lines of code + CSS: ~106,200
- Estimated files after deletion: ~75 (src/**), ~6 new REBUILD files
- Estimated source LOC deleted: ~90,000+ (roughly 85% reduction)
- Dependencies deleted: ~14 npm packages
- Prisma models deleted: 26 of 29 (kept: User, Job, Photo)
