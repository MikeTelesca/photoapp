# Changelog

All notable changes to PhotoApp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-14

### Added
- Initial public release of PhotoApp AI real estate photo editor
- HDR merge and auto-enhancement pipeline using Google Gemini 3 Pro Image
- Dropbox integration for file ingestion and output delivery
- Photo review gallery with split-screen before/after comparison
- Draggable slider and zoom/pan controls for detailed inspection
- Editing presets (Standard, Bright & Airy, Luxury, Flambient, Long-shadows-sunlight)
- Per-job TV style selector (Netflix, beach, mountains, fireplace, art, black, off)
- Per-job sky style selector (blue-clouds, clear-blue, golden-hour, dramatic, overcast-soft, as-is)
- Per-photo twilight mode (warm-dusk, blue-hour, deep-night) for dusk/night conversions
- Per-photo custom prompts for targeted adjustments
- Watermark customization on download
- Bulk photo approval, rejection, and re-enhancement
- ZIP download with optional watermark
- Dropbox folder share link generation
- Photographer invite system with time-limited signup tokens
- Role-based access control (admin vs. photographer)
- Per-user monthly AI cost limit enforcement ($50 default, configurable)
- Activity log with full audit trail of all operations
- Analytics dashboard (jobs created, photos processed, total costs)
- Admin preset manager (create, edit, delete editing templates)
- Admin photographer manager (invite, disable, cost limit adjustment)
- Preset cloning for creating custom variants
- Job duplication with all settings preserved
- Job notes with auto-save
- Dark mode toggle (light/dark/system preference)
- PWA installable on mobile devices
- Mobile-responsive gallery and UI
- Browser notifications when jobs complete
- Health check endpoint (`/api/health`)
- Server-side photo processing that survives page refresh and navigation
- Intelligent Gemini model fallback cascade (3 Pro → 3.1 Flash 4K → 3.1 Flash 2K → 2.5 Flash)
- Sharp upscaling (Lanczos) for outputs below 4K

### Technical
- Next.js 14 App Router with TypeScript
- NextAuth.js v5 for authentication
- Prisma ORM with Neon PostgreSQL
- Tailwind CSS for styling
- React 19 with modern hooks
- Dropbox API for file management
- Google Generative AI API integration

### Database
- User model with role-based access and monthly cost tracking
- Job model with status tracking, preset selection, and cost accounting
- Photo model with bracket grouping, EXIF data, and error tracking
- Preset model for editing style templates
- Invite model for photographer onboarding
- ActivityLog model for full audit trail

## [Unreleased]

### Planned Features
- Batch webhook notifications for processing completion
- Integration with photo delivery platforms (Shutterfly, Dropbox Paper)
- AI-generated property descriptions from photos
- Advanced EXIF comparison and preservation
- Custom LUT (Look-Up Table) support for consistent color grading
- Scheduled processing (queue jobs for off-peak hours)
- Multi-language support (i18n)
- Custom watermark image upload
- Comparison with professional manual edits for quality assurance
- Cost analytics by photographer, job type, and time period
