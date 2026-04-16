# BatchBase — Design Inspo

Visual references Mike sent. Patterns to steal from each, mapped to BatchBase screens.

---

## 1. Photo Editor (dark, rounded sidebar, before/after slider, right panel sliders)

**Use for:** `/review/[jobId]` review gallery rebuild, `/playground`

**Steal:**
- **Left rail** — icon-only vertical nav, pill-rounded container, active icon = bright cyan filled circle, inactive = muted graphite. Our sidebar should do the same for review modes (Edit / Compare / Meta / Presets / Settings).
- **Before/after slider** — vertical divider with a cyan circular drag handle bearing the "B" mark. Exactly the pattern for before/after on an enhanced photo. Currently ours uses a static pair.
- **Floating pill toolbar** — zoom +/−, 100%, dimensions, undo/redo, rotate — all in one rounded-full dark pill floating at the bottom of the canvas. Way better than our scattered top toolbar.
- **Right panel** — grouped sections ("Basic" collapsible, "White Balance", "Tone", "Tone Curve"). Each slider has label + value. Tiny "Custom v" and "Auto v" dropdowns to the right of section titles.
- **Header CTA** — secondary "Share" (muted) + primary "Save / Export" (bright cyan, rounded-lg, white text, semibold). Strong hierarchy.
- **Filename bar** — `Greseel.raw` style, just a small text label with ⋯ at the far right.
- **Recent Edits strip** — horizontal row of thumbnails below the canvas. We should add this for "other photos in this job" below the active photo.

## 2. Project Kanban (welcome header, nested left nav, progress bars on cards)

**Use for:** `/dashboard` (we're already list-view — consider a kanban toggle), card design

**Steal:**
- **"Welcome back, Mike"** header top of dashboard. Personal. Matches our voice.
- **Nested left sidebar** — sectioned groups ("Team / Projects / Tasks / Reminders / Messengers") with collapse chevrons and a highlighted active leaf. Much richer than our current TopNav dropdowns. Could replace them on desktop.
- **Card progress bar** — 3-color status (orange=WIP, pink=blocked, green=done). We have ProgressBar but it's single-color; tint by status.
- **Card meta row** — date pill + avatar stack `+2` overlay + comment count + attachment count icons. Perfect for job cards showing `photographer + client + comment count`.
- **Light/Dark toggle at bottom of sidebar** — a pill with sun/moon icons. Cleaner than our current header icon.
- **"Drag your task here…"** dashed empty slot. Use for empty buckets on the dashboard when a date group is empty.
- **"New template" CTA** — same bright cyan pill pattern, top-right.

## 3. User Management Table (ResolvedX style)

**Use for:** `/admin/users`, `/clients`, `/photographers`, `/trash`

**Steal:**
- **Table density** — single-line rows, avatar circle with initials or photo, clear column alignment. Our admin tables are a mess — match this.
- **Pill badges for state** — `Low / Medium / High / Custom` (permission) and `Active / Inactive` (status). Soft bg, colored text. Not loud.
- **Collapsible sidebar** — `«` chevron at top of sidebar to collapse to icons-only. Good for power users on the dashboard.
- **"Need Help?" card** at sidebar bottom — could replace our help link with a nicer always-visible card.
- **Pagination row** — page numbers, per-page dropdown, `1-3 of 10 items`. Use for the dashboard job list when jobs > 50.
- **Search + filter dropdown + primary action** row above the table. Exactly the layout we want for the filter bar (which we're already close to).

## 4. Wallet Dashboard (gradient-edge stat cards, sparkline, floating panel)

**Use for:** `/analytics`, `/billing`, dashboard top stats

**Steal:**
- **Stat cards with colored gradient edges** — a subtle inner radial gradient tinting one corner (orange/teal/red) keyed to the icon. Gives life to otherwise flat dark cards. Apply to "Jobs this month / Photos enhanced / Avg cost" cards.
- **Sparkline in-card** — small line chart inside each stat card. We should add to analytics.
- **Floating side panel** — the "Sell Order" card pops out of the layout with deeper shadow. Use for the enhancement cost breakdown on job detail.
- **Chart tooltip** — the `$2954 / Nov 29 2020` bubble that follows the cursor on the line chart. Standard but we don't have it yet.

## 5. Progress Bar Library

**Use for:** upload progress, enhancement progress, storage quota, everywhere we have a ProgressBar

**Steal (direct spec):**
- **Uploading:** purple bar, `27MB of 60MB`, percentage + spinner on right, info `(i)` hover
- **Complete:** green bar, ✓ on right, `60MB of 60MB`
- **Failed:** red bar, ✗ on right, error message in red below `Oops, something went wrong`
- **Classed bars** — `Class A / B / C` with color-coded progress and raw count on right (green/orange/pink). Use for preset usage / photographer stats.
- **With filename and time remaining:** `design-system.fig (23.6MB)` … `50% (9 sec left) ×` — exactly the pattern for upload rows.
- **Bottom totals line:** `(650MB/1.12GB) · 17 seconds remaining` — concise and informative.

**Rules to adopt:**
- Rounded-full, ~6px tall
- Track: `bg-graphite-800/60` on dark, `bg-graphite-100` on light
- Fill color tied to state (purple=active, green=done, red=fail, cyan=default/neutral)
- Always show percentage + either size-progress or time-remaining
- Inline `×` cancel button for cancellable operations
- Inline `(i)` info icon for states that need explanation

---

## What's already aligned with BatchBase brand

- Dark-first ✓
- Cyan `#06B6D4` primary ✓
- Inter typeface ✓
- No emojis ✓ (just stripped)
- Rounded-xl cards ✓
- Graphite neutrals ✓

## Biggest gaps vs inspo

1. **Before/after slider on review gallery** — critical for real estate workflow, currently missing a proper slider handle
2. **Stat cards feel flat** — need gradient edges + sparklines
3. **Left rail** — we rely on top nav; a collapsible left rail (inspo #1 + #3) would fit the editor paradigm better
4. **Progress bar variants** — we have ONE progress bar; need state variants (uploading/done/failed/queued)
5. **Card progress bars colored by status** — job card progress should tint orange/green based on state
6. **Welcome header** — "Welcome back, Mike" on dashboard, date top-right, notification bell
7. **Floating pill toolbar** — replace scattered review-gallery toolbars with one floating bottom pill
