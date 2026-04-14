# Photo Editor — AI Real Estate Photo Editing Pipeline

## Overview

Automated photo editing pipeline for real estate photography. Photographers upload bracketed photos (3 or 5 exposures per angle), the system merges them into HDR, applies programmatic corrections, runs AI enhancement via Google Imagen 4, and presents edited photos for admin review before download.

**Goal:** Replace manual editing workflow ($0.40/image with offshore editor) with an automated pipeline (~$0.05-0.09/image).

## Users

- **Photographers** — upload bracketed photos via Dropbox link, view own job status
- **Admins** (owner + 1-2 trusted people) — review all jobs, approve/reject/regenerate photos, manage presets and photographer accounts

## Architecture

```
Dropbox → Web App (Vercel/Next.js) → Cloud Run Worker → Google Imagen 4 → Review Gallery → Download
```

### Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js on Vercel | Web app UI (dashboard, review gallery, upload) |
| Auth | NextAuth.js | Photographer + Admin login |
| Storage | Dropbox API (15TB existing) | Photo intake and optional output |
| Processing | Google Cloud Run | HDR merge, straighten, lens correction, color balance |
| AI Enhancement | Google Imagen 4 API | Sky/TV/reflection/grass/flare removal, twilight conversion |
| Database | Vercel Postgres or Supabase | Jobs, users, presets, photo metadata |
| File handling | Dropbox API + temporary Cloud Storage | Bracket intake, intermediate files, final output |

### Processing Pipeline

1. **Intake** — Photographer pastes Dropbox link into web app
2. **Pull & Group** — App pulls photos via Dropbox API, reads EXIF metadata (exposure compensation, timestamp, aperture), auto-groups brackets (3 or 5 per angle)
3. **Programmatic Processing** (Cloud Run, free, full-res):
   - HDR merge using enfuse or OpenCV
   - Vertical/horizontal straightening
   - Lens distortion correction (lensfun)
   - Brightness and color balance
4. **AI Detection** — Imagen 4 or Claude Vision analyzes each merged photo:
   - Auto-detect interior vs exterior
   - Detect TVs, mirrors with reflections, sky, grass, lens flares
5. **AI Enhancement** (Google Imagen 4, ~$0.04-0.08/image):
   - Exteriors: sky replacement, grass enhancement
   - Interiors: TV replacement (lifestyle image), window pulls
   - Both: reflection/photographer removal, lens flare removal
   - Apply editing preset (Standard, Bright & Airy, Luxury, Custom)
6. **Review** — Admin reviews in gallery with before/after comparison
7. **Output** — Download approved photos (under 19MB, under 7999px)

### Twilight Conversion

Separate workflow triggered per-photo after initial review:
- Admin marks 1-2 exterior shots for twilight conversion
- Can specify details: "pot lights on, exterior sconces lit"
- Uses Imagen 4 to convert daytime exterior to dusk/evening look
- One twilight per property by default (no condos/apartments unless requested)
- Option to request more twilights as needed

## Standard Editing Recipe

Applied to every photo automatically:

1. HDR merge the brackets
2. Straighten photos (vertical/horizontal correction)
3. Fix lens distortion
4. Brighten — balanced exposure, window-pulled HDR style
5. Color correction — accurate, natural colors
6. Sky replacement — on exterior shots
7. TV replacement — lifestyle image on screens
8. Window replacement — pull the view through windows (no blowouts)
9. Remove lens flares from lights/sun
10. Remove photographer from mirrors/reflections
11. Grass enhancement — on exterior shots
12. Output: under 19MB, under 7999px

### Editing Style

Window-pulled HDR with a magazine touch but natural. Mix of:
- Window-pulled HDR (can see interior AND view through windows)
- Magazine-style (rich colors, strong contrast)
- Natural/true-to-life (minimal over-processing)

No blown-out windows. 4K quality, no blur, no AI artifacts.

## Editing Presets

| Preset | Description |
|--------|------------|
| Standard | Window-pulled HDR, natural+magazine (default) |
| Bright & Airy | Light, warm, lifted shadows |
| Luxury | Rich contrast, dramatic, moody |
| Custom | User-defined prompt adjustments |

## Web App Screens

### 1. Dashboard

- **Design:** Light mode, Graphite + Cyan color scheme
- **Layout:** Left sidebar nav + main content area + right panel
- **Sidebar:** Menu (Dashboard, Needs Review, Processing, Completed), Settings (Presets, Photographers, Settings), User profile at bottom
- **Main content:** Stat cards (Total Jobs, Processing, Needs Review, Approved Today), Recent Jobs list with status filters (segmented control)
- **Right panel:** Quick Actions (Upload Photos, Dropbox Link, Edit Presets, Batch Download), Cost This Month with budget bar, Activity feed
- **Job cards:** Property address, photographer name, photo count, preset tag, status (Processing with progress bar, Ready for Review, Approved with download)

### 2. Review Gallery

- **Layout:** Thumbnail strip (left) + Before/After viewer (center) + Action bar (bottom)
- **Top bar:** Back to dashboard, property address, progress (32/48 approved), Approve All Remaining, Download Approved
- **Thumbnail strip:** Scrollable column, green dot = approved, red dot = rejected, moon icon = twilight
- **Viewer:** Side-by-side Before (original HDR merge) and After (AI enhanced) with draggable divider
- **Detection badges:** Auto-detected edits shown on After image (Interior, TV Replaced, Reflection Removed, Sky Replaced, Grass Enhanced)
- **Action buttons:** Approve, Reject, Regenerate, Make Twilight
- **Keyboard shortcuts:** A = Approve, R = Reject, Arrow keys = Navigate
- **Custom instructions:** Quick tags (Remove car, Make brighter, Fix sky, Enhance grass, Pot lights on) + text input + Send & Regenerate

### 3. New Job / Upload

- Paste Dropbox link or drag-and-drop upload
- Select editing preset
- Optional: property address/name
- Submit → starts processing pipeline

### 4. Photographer Portal

- Simple login for photographers
- Paste Dropbox link to submit new job
- View own job statuses (processing, ready for review, approved)
- Cannot review or approve

### 5. Presets Manager

- View, create, edit, delete editing presets
- Each preset stores AI prompt adjustments for the editing style

### 6. Photographers Manager

- Add/remove photographer accounts
- View photographer job history

## Design System

| Token | Value |
|-------|-------|
| Primary | Graphite #18181B → #3F3F46 gradient |
| Accent | Cyan #0891B2 / #06B6D4 |
| Success | Green #059669 |
| Warning | Amber #D97706 |
| Error | Red #DC2626 |
| Background | #F0F2F5 |
| Card | White #FFFFFF, border #E4E4E7, radius 16px |
| Font | Inter, -apple-system fallback |
| Hover | translateY(-2px), shadow increase, 200ms ease |

## Volume & Cost Estimates

| Season | Properties/week | Photos/property | Total images/month | AI cost/month |
|--------|----------------|----------------|-------------------|--------------|
| Slow | 5-8 | 30-100 | ~800-2,400 | $40-215 |
| Busy | 15-20 | 30-100 | ~1,800-6,000 | $90-540 |

Current cost: $0.40/image → ~$720-2,400/month
New cost: ~$0.05-0.09/image → ~$90-540/month
**Savings: ~$500-1,800/month**

Hosting: Vercel free/pro tier + Cloud Run (~$5-15/month, scales to zero)

## Turnaround

Target: same day, ideally within a few hours of upload. Processing pipeline should handle a 70-photo property in under 30 minutes.

## Output Requirements

- Under 19MB per photo
- Under 7999 pixels on longest edge
- JPEG format
- 4K quality, no blur, no AI artifacts

## External Services Required

- **Vercel account** (existing)
- **Google Cloud account** (new — for Cloud Run + Imagen 4 API)
- **Dropbox API app** (new — for reading/writing to user's existing 15TB Dropbox)
- **Database** (Vercel Postgres or Supabase — new)

## Out of Scope (v1)

- Direct client delivery (handled separately via Oreio or custom delivery system)
- Mobile app
- Real-time collaboration between reviewers
- Custom AI model training
- Video editing
