# Dashboard Page — Overrides

> Overrides MASTER. Missing items fall through to MASTER.

## Layout

- Max width: `max-w-[1400px]` — data-dense style per ui-ux-pro-max
- Outer padding: `px-6 py-6`
- Vertical rhythm between sections: `space-y-6`
- Grid: CSS grid, 12 columns, `gap-4`

## Sections (top → bottom)

1. **Page header row** — `flex items-center justify-between`
   - Left: cyan uppercase eyebrow "DASHBOARD", h1 `Welcome back, {firstName}`, one-line status ("2 jobs waiting on your review")
   - Right: segmented view toggle (Today / Week / All)
2. **KPI strip** — 4-col grid on lg, 2-col on md
   - Total jobs (cyan edge)
   - Processing (violet edge, sparkline)
   - Needs review (amber edge, sparkline)
   - Approved today (emerald edge)
3. **Weekly activity chart** — wide card, 7-day bar chart of photos processed, cyan fill, gridlines subtle
4. **Live progress banner** (conditional) — only if any job is processing; thin row showing "3 jobs processing · 47 photos enhanced in the last hour"
5. **Jobs area**
   - Section header: "Jobs" + count + List/Board toggle right-aligned
   - Filter bar: search | status | preset | grouping | export
   - Board or List body
6. **Side widgets** (optional, below jobs on desktop, above on narrow) — Recent activity + Cost this month

## Component choices

- KPI cards → `StatCard` with `accent` + `delta` + optional `sparkline`
- Progress bars on job rows → `ProgressBar` with shimmer, color by `job.status`
- Board cards → `JobKanban` columns with tinted top border per column status
- Filters → `JobFilterBar`

## Don'ts

- No decorative illustrations above the fold — density > flourish
- No sidebars inside the dashboard content area (side rail is the app shell's job)
- No pagination above the fold — it lives at the bottom of the jobs list
