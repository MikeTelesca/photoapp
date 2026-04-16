# BatchBase — Design System (MASTER)

> **Retrieval rule:** When building a page, first check `design-system/batchbase/pages/[page].md`.
> If that file exists, its rules override this master. Otherwise, follow these.

**Project:** BatchBase
**Category:** SaaS / Analytics Dashboard — "Data-Dense Dashboard" pattern per ui-ux-pro-max
**Personality:** Dark-first, professional, technical, cyan-accent, minimal chrome, high signal density.

---

## 1. Brand tokens (DO NOT CHANGE)

### Color

| Role | Hex | Tailwind |
|---|---|---|
| Brand primary | `#06B6D4` | `cyan` (text-cyan / bg-cyan) |
| Brand primary dark | `#0891B2` | `cyan-DEFAULT` |
| Ink (headings light mode) | `#18181B` | `graphite-900` |
| White (headings dark mode) | `#FFFFFF` | `white` |
| Surface light | `#FFFFFF` | `bg-white` |
| Surface dark | `#09090B` / `#18181B` | `graphite-950 / 900` |
| Body text | `graphite-600` light / `graphite-300` dark | |
| Muted text | `graphite-500` light / `graphite-400` dark | |
| Border | `graphite-200` light / `graphite-800` dark | |

### Semantic

| State | Color | Usage |
|---|---|---|
| Processing / active | `violet-500` → `cyan` | Progress bars, "in progress" |
| Success / approved | `emerald-500` | "Done" pills, completed bars |
| Review / pending | `amber-500` | "Needs review", "stale" |
| Destructive / failed | `red-500` | Errors, delete |
| Info / neutral | `sky-500` | Tooltips, info badges |

**Rule:** never convey state by color alone — pair with an icon or label (ui-ux-pro-max §1 `color-not-only`).

### Typography

- **All UI:** Inter (weights 400 / 500 / 600)
- **Tabular numerals** everywhere a count, price, or progress value appears (`tabular-nums`)
- **Headings:** letter-spacing `-0.02em` at h1/h2
- **Wordmark:** `-0.05em` tracking, `Batch` (ink/white) + `Base` (cyan)
- **Body base size:** 14px / 1.5 (the app is data-dense; 14 is intentional)

### Spacing & radius

- 4px base rhythm: gaps/padding pick from `4 / 8 / 12 / 16 / 24 / 32 / 48`
- Card radius: `rounded-xl` (12px) for stat cards, `rounded-2xl` (16px) for hero containers, `rounded-lg` (8px) for buttons, `rounded-full` for pills
- Border on all cards: `border border-graphite-200 dark:border-graphite-800`

### Elevation

| Level | Class | Usage |
|---|---|---|
| 0 | `shadow-none` | Inline rows, table cells |
| 1 | `shadow-sm` | Buttons, toast |
| 2 | `shadow-md` | Floating pills, dropdowns |
| 3 | `shadow-xl` | Modals, popovers |
| brand-glow | `shadow-lg shadow-cyan/30` | Primary CTA, active rail icon |

---

## 2. Pattern rules (from ui-ux-pro-max "Data-Dense Dashboard")

1. **KPI cards** at top — 4 across on desktop, each with: uppercase eyebrow label, big value in tabular-nums, one-line context, subtle gradient edge tinted to its semantic (cyan/violet/amber/emerald), optional sparkline.
2. **Hero row under KPIs** — either a weekly activity chart OR a greeting, never both.
3. **Primary list/board below the fold** — the Jobs list is the center of gravity. Toggleable list ↔ kanban. Kanban is default.
4. **Hover tooltips** on every truncated field, every status pill, every progress bar.
5. **Row highlight on hover** — `hover:bg-graphite-50 dark:hover:bg-graphite-900/50`.
6. **Filters are always visible** above the list — search, status dropdown, preset dropdown, grouping, export.
7. **Pagination** when count > 25.

---

## 3. Component language

- **Buttons:**
  - Primary: `bg-cyan text-white rounded-lg h-9 px-3.5 font-semibold shadow-sm shadow-cyan/20 hover:bg-cyan/90`
  - Secondary: `bg-graphite-100 dark:bg-graphite-900 text-graphite-900 dark:text-white rounded-lg h-9 px-3 border border-graphite-200 dark:border-graphite-800`
  - Ghost: `text-graphite-600 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-900`
  - Destructive: `text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30`
- **Pills:** `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap` — soft bg (color-100/900-30) + colored text.
- **Inputs:** `h-9 rounded-lg bg-graphite-100 dark:bg-graphite-900 border border-transparent focus:border-cyan focus:ring-2 focus:ring-cyan/20 text-sm`.
- **Tables:** 13px body, 11px header uppercase, single-line rows, avatar circle with gradient + initials for any "person" column, pill badges for state.
- **Progress bars:** 6px tall, `rounded-full`, shimmer on active states, color by state (cyan=active, violet=uploading, emerald=done, amber=review, red=failed).
- **Icons:** Stroke-only, 1.6 width, 18–20px. Use inline SVG (no emojis anywhere).

---

## 4. Motion

- Micro-interactions: 150ms, ease-out
- Panel transitions: 200ms
- Shimmer on progress: 2s linear infinite
- Respect `prefers-reduced-motion` — all keyframe animations should be disabled then.
- Never animate `width`/`height` — use `transform` or `opacity`.

---

## 5. A11y non-negotiables

- Focus ring: `focus-visible:ring-2 focus-visible:ring-cyan` on every interactive element
- Min touch target 44×44 on mobile (desktop: 36×36 acceptable)
- Contrast ≥ 4.5:1 body, ≥ 3:1 large text — both themes
- `aria-label` on every icon-only button
- Tab order follows visual order
- No info conveyed by color alone

---

## 6. Anti-patterns

- ❌ Ornate decoration — no full-surface gradients, only as *edge tints* on cards
- ❌ Missing filters on any list > 10 items
- ❌ Emojis as UI icons (stripped project-wide — keep it that way)
- ❌ Pure-white sections in dark mode
- ❌ Text under 12px on data rows
- ❌ Raw hex in components — use Tailwind tokens or the `graphite-*` scale
