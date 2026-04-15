# Changelog

All notable changes to ATH AI Photo Editor are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Personal style guide (per-user prompt prefix applied to all enhances)
- Daily 5pm summary email (opt-in)
- Settings backup/restore as JSON
- Preset usage statistics page (admin)
- Audit log auto-purge cron (90/30/180 day retention)
- Improved job duplicate (clones settings without photos)

## [2.0] — 2026-04

### Added
- Cmd+K command palette for jumping to jobs, clients, or pages
- In-app notification center with bell icon and unread badge
- Marketing PDF gallery export for client delivery
- Theme accent color picker for brand customization
- Mobile bottom navigation bar
- Two-factor authentication (TOTP)
- 30-day spend forecast chart based on usage trends
- Admin user impersonation capability
- PWA install prompt and service worker
- What's New changelog page
- Settings navigation hub

## [1.9] — 2026-04

### Added
- AI crop suggestions for optimal framing
- AI photo auto-tagging (kitchen, bathroom, exterior, etc.)
- AI preset suggestions based on property analysis
- AI MLS listing description generator from approved photos
- Per-photo notes (separate from job notes)
- Recent activity widget on dashboard
- Mobile swipe gestures (left/right nav, up approve, down reject)
- Preset JSON export/import
- Photo sort options in gallery view
- Prompt playground page for testing

## [1.8] — 2026-03

### Added
- Public share links for client galleries
- Optional password protection on share links
- Client comments on photos via share links
- Email share link functionality with personal message
- Slideshow mode for client presentations
- Star photo ratings (1-5) on share links
- Favorite photos (marked with F shortcut)
- Auto-save photo notes
- Seasonal style variants (spring, summer, autumn, winter, twilight)
- Re-send share email history

## [1.7] — 2026-03

### Added
- Client management database with CRUD pages
- Job templates (save and reuse job configurations)
- Invoice PDF generator with business settings
- Monthly billing/usage page with YTD and projections
- Preset fork feature (duplicate any preset)
- Bulk client CSV export/import
- Photographer leaderboard on analytics page

## [1.6] — 2026-02

### Added
- Grid view mode (2/3/4-up gallery layouts)
- Drag-and-drop photo reordering
- Advanced search page with multi-filter (date, cost, photos, client, tags)
- MLS export sizes (Instagram portrait, Story, Video 16:9, Realtor.ca)
- Customizable keyboard shortcuts with bindings (F, E, S, Z, ?)
- Bulk photo actions (approve/reject/favorite via multi-select)
- Photo A/B preset comparison side-by-side

## [1.5] — 2026-02

### Added
- Prompt playground for testing custom prompts on samples
- Batch re-enhance with preset switching
- Markdown rendering support for job notes
- Job comment thread functionality
- Per-job timeline and activity history

## [1.4] — 2026-02

### Added
- Quality flags auto-detecting blur, exposure, and contrast issues
- Rejection reason tracking for prompt tuning feedback
- Watermark editor (position, size, opacity controls, logo upload)
- Complete dark mode across all pages
- ZIP download of approved photos

## [1.0] — 2026-01

### Added
- HDR bracket merge via Google Gemini API
- Four enhance presets (Standard, Bright & Airy, Luxury, Flambient)
- Dropbox shared folder ingestion
- Direct file upload as alternative to Dropbox
- Review gallery with approve/reject/regenerate workflow
- Initial dashboard, billing, and analytics pages

---

## Deployment & Technical Notes

- App is continuously deployed via Vercel from `master` branch
- Database schema defined in `prisma/schema.prisma`
- Manual migration SQL available in `prisma/migrations/manual-catchup.sql`
- For end-user release notes, see [/whats-new](/whats-new) page in the app
- All versions deployed to production; no maintained legacy branches
