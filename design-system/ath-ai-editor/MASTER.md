# ATH AI Editor — Design System

> **Scope:** All UI work in this repo. Pages in `design-system/pages/[name].md`
> may override this file if present.

**Project:** ATH AI Editor
**Mood:** Professional, tool-like, fast, quiet. "Dark Lightroom." Not flashy.
**Category:** Photo editing / batch pipeline / review tool.

---

## 1. Philosophy

- **Dark-mode first.** Design every surface in dark mode, then ensure it
  works in light. Real estate photographers work in dim rooms.
- **One accent color.** Cyan. That's it. No rainbow badges, no colored
  icon backgrounds, no gradient CTAs.
- **No decorative emoji in the UI.** Ever. Status = colored dot. Action = label.
  Badge = text. If you reach for an emoji, replace it with an SVG icon
  (Heroicons outline) or a colored dot.
- **Rhythm over decoration.** 4 / 8 / 12 / 16 / 24 / 32 spacing. Surfaces
  earn their weight through type and space, not drop shadows.
- **Transform/opacity only for motion.** 150–300ms. Never animate layout.

---

## 2. Color Tokens

Tailwind aliases live in `tailwind.config.ts`. `graphite-*` = `zinc-*`.

| Role | Light | Dark | Tailwind |
|------|-------|------|----------|
| Page background | `graphite-50` (#FAFAFA) | `graphite-950` (#09090B) | `bg-graphite-50 dark:bg-graphite-950` |
| Surface (card, nav, modal) | `white` | `graphite-900` (#18181B) | `bg-white dark:bg-graphite-900` |
| Surface raised | `graphite-50` | `graphite-800` (#27272A) | `bg-graphite-50 dark:bg-graphite-800` |
| Border | `graphite-200` (#E4E4E7) | `graphite-800` (#27272A) | `border-graphite-200 dark:border-graphite-800` |
| Text primary | `graphite-900` | `white` | `text-graphite-900 dark:text-white` |
| Text secondary | `graphite-500` | `graphite-400` | `text-graphite-500 dark:text-graphite-400` |
| Text tertiary / hint | `graphite-400` | `graphite-500` | `text-graphite-400 dark:text-graphite-500` |
| Accent | `cyan-500` (#06B6D4) | `cyan-500` | `text-cyan-500`, `bg-cyan-500` |
| Success | `emerald-500` | `emerald-500` | sparingly |
| Warning | `amber-500` | `amber-500` | sparingly |
| Danger | `red-500` | `red-500` | destructive actions only |

**Forbidden:** pure `#000` backgrounds, pure `#FFF` on dark, blue/violet/
purple/pink/orange backgrounds, multi-color badge palettes.

---

## 3. Typography

System font stack (no custom webfont, no import, no FOUT):

```css
font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

Monospace for numbers/ids: `ui-monospace, SFMono-Regular, Menlo, monospace`.
Use `tabular-nums` for counters and stats.

| Role | Size / Weight | Tailwind |
|------|---------------|----------|
| Page title | 30–36px / 600 / tight | `text-3xl md:text-4xl font-semibold tracking-tight` |
| Section head | 14px / 600 | `text-sm font-semibold` |
| Body | 14px / 400 | `text-sm` |
| Small / meta | 12px / 400 | `text-xs` |
| Micro / eyebrow | 11px / 500 / uppercase / wider | `text-[11px] font-medium uppercase tracking-wider` |
| Stat number | 28–32px / 600 / tight / tabular | `text-3xl font-semibold tracking-tight tabular-nums` |

---

## 4. Spacing / Radius / Shadow

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-6: 24px;  --space-8: 32px;  --space-12: 48px;
```

Radius: cards/panels `rounded-lg` (8px). Buttons/inputs `rounded-md` (6px).
Modals `rounded-xl` (12px). Full pills only for dots/badges.

Shadows: avoid. Use border + background contrast. Only modals get
`shadow-xl`. No hover drop-shadows.

---

## 5. Components

### Button (`src/components/ui/button.tsx`)

Three variants, three sizes. Nothing else.

- **primary** — `bg-graphite-900 text-white dark:bg-white dark:text-graphite-900`. Main CTA per screen. One per screen max.
- **secondary** — `border border-graphite-200 bg-white dark:border-graphite-700 dark:bg-graphite-900`. Most buttons use this.
- **ghost** — no background, text-only. For icon buttons and low-emphasis actions.

Semantic aliases: `approve` (emerald) and `danger` (red) — destructive only.

Sizes: `sm` h-8 / `md` h-9 / `lg` h-10. Default md.

Focus ring: `focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-graphite-950`.

Hover: darken one step. Never animate transform/scale on click.

### Card / Panel

```tsx
<div className="rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 p-5">
```

No raised shadow. Row hover uses `hover:bg-graphite-50 dark:hover:bg-graphite-800/50`.

### Input

```tsx
<input className="h-9 px-3 rounded-md border border-graphite-200 dark:border-graphite-800
                  bg-white dark:bg-graphite-900 text-sm
                  placeholder:text-graphite-400
                  focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
```

### Badge / Status

- **Dot** — 8×8 rounded-full. Pending=graphite-400, Processing=amber, Review=cyan, Approved=emerald, Rejected=red.
- **Text badge** — `text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded`. Subtle background (`bg-graphite-100 dark:bg-graphite-800`).

### Progress bar (`src/components/ui/progress-bar.tsx`)

Thin (h-1), md (h-1.5), lg (h-2). Track `bg-graphite-200 dark:bg-graphite-800`. Fill `bg-cyan-500` by default. Amber/red/emerald for status-specific.

### Modal

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
<div className="rounded-xl bg-white dark:bg-graphite-900 shadow-xl p-6 max-w-md w-full mx-4" />
```

Always: visible close button, click-outside-dismiss, ESC handler, focus trap.

---

## 6. Icons

**Heroicons outline only.** Size `w-4 h-4` inline, `w-5 h-5` on their own, `w-6 h-6` in nav. Never mix outline + solid in the same view. Color inherits from text (use `text-graphite-500` for passive, `text-graphite-900 dark:text-white` for active).

---

## 7. Layout Primitives

- App shell: `TopNav` (sticky) + content.
- Dashboard content container: `mx-auto max-w-7xl px-6 py-10`.
- Review/editor: full-height shell, `h-[calc(100vh-3.5rem)] overflow-hidden`. No page scroll.
- Breakpoints: design at 375, 768, 1024, 1440.

---

## 8. Anti-Patterns (Do NOT ship)

- ❌ Emoji as icon, status, or action label.
- ❌ Multiple accent colors on one screen.
- ❌ Pure white page background in light mode (use graphite-50).
- ❌ Drop shadows on cards in the default state.
- ❌ `transform: scale()` on hover for list rows.
- ❌ Modals without a visible close button.
- ❌ Colored icon backgrounds (violet/purple/pink tile chips).
- ❌ Badges with emoji inside.
- ❌ Gradient buttons or backgrounds.
- ❌ Text below `text-xs` (12px) for anything the user needs to read.
- ❌ Contrast ratios below 4.5:1.

---

## 9. Pre-Delivery Checklist

- [ ] No emoji anywhere in the rendered UI.
- [ ] Every icon is Heroicons outline.
- [ ] Cyan is the only accent color used.
- [ ] `cursor-pointer` on every clickable element.
- [ ] Hover state = color / opacity change, not layout shift.
- [ ] Focus ring visible on every interactive element.
- [ ] `prefers-reduced-motion` respected (or animation duration ≤300ms).
- [ ] Dark-mode pair for every light-mode class.
- [ ] Responsive check at 375px / 768px / 1024px / 1440px.
- [ ] No content hidden behind sticky nav.
- [ ] No horizontal scroll on mobile.
- [ ] Any button with a destructive action uses `danger` variant + confirm.
