# Phase 1: App Scaffold + Dashboard UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get a working Next.js app deployed on Vercel with the admin dashboard, auth, and Graphite+Cyan design system.

**Architecture:** Next.js 14 App Router with TypeScript, Tailwind CSS for styling, NextAuth.js for authentication, Vercel Postgres for database. The dashboard shows job cards, stat cards, quick actions, cost tracker, and activity feed. Photographer portal is a simpler view of the same app with restricted permissions.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, NextAuth.js, Vercel Postgres, Prisma ORM

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with Inter font + globals
│   ├── page.tsx                      # Redirect to /dashboard
│   ├── globals.css                   # Tailwind directives + custom tokens
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login page
│   │   └── layout.tsx                # Auth layout (centered, no sidebar)
│   ├── (app)/
│   │   ├── layout.tsx                # App layout with sidebar
│   │   ├── dashboard/page.tsx        # Dashboard page
│   │   ├── review/[jobId]/page.tsx   # Review gallery (Phase 5 - stub only)
│   │   ├── presets/page.tsx          # Presets manager (stub)
│   │   └── photographers/page.tsx    # Photographers manager (stub)
│   └── api/
│       └── auth/[...nextauth]/route.ts  # NextAuth API route
├── components/
│   ├── ui/
│   │   ├── button.tsx                # Button variants (primary, outline, text)
│   │   ├── card.tsx                  # Card wrapper
│   │   ├── stat-card.tsx             # Stat card with icon
│   │   ├── badge.tsx                 # Status badge/tag
│   │   └── progress-bar.tsx          # Progress bar
│   ├── layout/
│   │   ├── sidebar.tsx               # Left sidebar navigation
│   │   ├── topbar.tsx                # Top bar with search + actions
│   │   └── user-menu.tsx             # User avatar + dropdown
│   └── dashboard/
│       ├── job-list.tsx              # Job list with filters
│       ├── job-card.tsx              # Individual job row
│       ├── quick-actions.tsx         # Quick action grid
│       ├── cost-tracker.tsx          # Monthly cost card
│       └── activity-feed.tsx         # Recent activity list
├── lib/
│   ├── auth.ts                       # NextAuth config
│   ├── db.ts                         # Prisma client singleton
│   └── types.ts                      # Shared TypeScript types
└── prisma/
    └── schema.prisma                 # Database schema
```

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js with TypeScript and Tailwind**

```bash
cd "/Users/aroundthehouse/Ai Editor ATH"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the full scaffold.

- [ ] **Step 2: Verify it runs**

```bash
npm run dev
```

Expected: Dev server starts on http://localhost:3000, shows Next.js default page.

- [ ] **Step 3: Replace globals.css with design tokens**

Replace `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #F0F2F5;
    --card: #FFFFFF;
    --card-border: #E4E4E7;
    --text-primary: #18181B;
    --text-secondary: #3F3F46;
    --text-muted: #71717A;
    --text-faint: #A1A1AA;
    --accent: #0891B2;
    --accent-light: #CFFAFE;
    --success: #059669;
    --success-light: #D1FAE5;
    --warning: #D97706;
    --warning-light: #FEF3C7;
    --error: #DC2626;
    --error-light: #FEE2E2;
    --purple: #7C3AED;
    --purple-light: #EDE9FE;
  }
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  background: var(--background);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Update tailwind.config.ts with custom theme**

Replace `tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          900: '#18181B',
          800: '#27272A',
          700: '#3F3F46',
          600: '#52525B',
          500: '#71717A',
          400: '#A1A1AA',
          300: '#D4D4D8',
          200: '#E4E4E7',
          100: '#F4F4F5',
          50: '#FAFAFA',
        },
        cyan: {
          DEFAULT: '#0891B2',
          dark: '#0E7490',
          light: '#06B6D4',
          50: '#CFFAFE',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Replace root layout with Inter font**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PhotoApp",
  description: "AI-powered real estate photo editing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Replace home page with redirect**

Replace `src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 7: Verify dev server still runs**

```bash
npm run dev
```

Expected: Redirects to /dashboard (will 404 for now, that's fine).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind and design tokens"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/types.ts

export type JobStatus = "processing" | "review" | "approved" | "rejected";
export type PhotoStatus = "pending" | "processing" | "edited" | "approved" | "rejected" | "regenerating";
export type UserRole = "admin" | "photographer";
export type PresetName = "standard" | "bright-airy" | "luxury" | "custom";

export interface Job {
  id: string;
  address: string;
  photographerId: string;
  photographerName: string;
  preset: PresetName;
  status: JobStatus;
  totalPhotos: number;
  processedPhotos: number;
  approvedPhotos: number;
  rejectedPhotos: number;
  twilightCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  jobId: string;
  orderIndex: number;
  status: PhotoStatus;
  originalUrl: string;
  editedUrl: string | null;
  isExterior: boolean;
  isTwilight: boolean;
  twilightInstructions: string | null;
  customInstructions: string | null;
  detections: string[]; // e.g. ["tv_replaced", "reflection_removed", "sky_replaced"]
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

export interface Preset {
  id: string;
  name: string;
  slug: PresetName;
  description: string;
  promptModifiers: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: UI Components

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/stat-card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/progress-bar.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// src/components/ui/button.tsx

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "text" | "approve" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-graphite-900 to-graphite-700 text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg",
  outline:
    "bg-white text-graphite-700 border border-graphite-200 hover:bg-graphite-50 hover:border-graphite-300",
  text: "bg-transparent text-cyan font-semibold hover:opacity-70",
  approve: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

- [ ] **Step 2: Create Card component**

```tsx
// src/components/ui/card.tsx

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-card border border-graphite-200 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-5 py-4 flex justify-between items-center border-b border-graphite-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-bold text-graphite-900">{children}</h3>;
}
```

- [ ] **Step 3: Create StatCard component**

```tsx
// src/components/ui/stat-card.tsx

import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  iconColor?: "amber" | "cyan" | "green" | "purple";
  highlight?: boolean;
}

const iconBg: Record<string, string> = {
  amber: "bg-amber-100 text-amber-600",
  cyan: "bg-cyan-50 text-cyan",
  green: "bg-emerald-100 text-emerald-600",
  purple: "bg-purple-100 text-purple-600",
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  iconColor = "cyan",
  highlight = false,
}: StatCardProps) {
  if (highlight) {
    return (
      <div className="bg-gradient-to-br from-graphite-900 to-graphite-800 rounded-card p-5 relative overflow-hidden shadow-lg hover:-translate-y-0.5 transition-all duration-250">
        <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
          {label}
        </div>
        <div className="text-[32px] font-extrabold text-white tracking-tight tabular-nums">
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-white/50 mt-1.5">{subtext}</div>
        )}
        <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/10 text-cyan-light flex items-center justify-center">
          {icon}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card border border-graphite-200 p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-250">
      <div className="text-xs font-semibold text-graphite-400 uppercase tracking-wider mb-3">
        {label}
      </div>
      <div className="text-[32px] font-extrabold text-graphite-900 tracking-tight tabular-nums">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-graphite-400 mt-1.5">{subtext}</div>
      )}
      <div
        className={`absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[iconColor]}`}
      >
        {icon}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Badge component**

```tsx
// src/components/ui/badge.tsx

type BadgeVariant = "standard" | "luxury" | "processing" | "review" | "done";

const styles: Record<BadgeVariant, string> = {
  standard: "bg-graphite-100 text-graphite-700",
  luxury: "bg-purple-100 text-purple-600",
  processing: "text-amber-600",
  review: "text-cyan",
  done: "text-emerald-600",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Create ProgressBar component**

```tsx
// src/components/ui/progress-bar.tsx

interface ProgressBarProps {
  value: number; // 0-100
  color?: "amber" | "cyan" | "green";
  className?: string;
}

const colors: Record<string, string> = {
  amber: "bg-amber-500",
  cyan: "bg-gradient-to-r from-cyan to-cyan-light",
  green: "bg-emerald-500",
};

export function ProgressBar({
  value,
  color = "amber",
  className = "",
}: ProgressBarProps) {
  return (
    <div className={`w-[72px] h-1 bg-graphite-100 rounded-sm ${className}`}>
      <div
        className={`h-1 rounded-sm transition-all duration-300 ${colors[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI components (Button, Card, StatCard, Badge, ProgressBar)"
```

---

### Task 4: Sidebar + Topbar Layout

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/topbar.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create Sidebar component**

```tsx
// src/components/layout/sidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PaintBrushIcon,
  UsersIcon,
  Cog6ToothIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { label: "Needs Review", href: "/dashboard?filter=review", icon: EyeIcon, badge: 5 },
  { label: "Processing", href: "/dashboard?filter=processing", icon: ArrowPathIcon },
  { label: "Completed", href: "/dashboard?filter=approved", icon: CheckCircleIcon },
];

const settingsItems = [
  { label: "Presets", href: "/presets", icon: PaintBrushIcon },
  { label: "Photographers", href: "/photographers", icon: UsersIcon },
  { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[230px] bg-white border-r border-graphite-200 flex flex-col fixed top-0 left-0 bottom-0 z-20">
      {/* Brand */}
      <div className="px-6 py-6 mb-2 flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-[10px] flex items-center justify-center shadow-md">
          <CameraIcon className="w-[18px] h-[18px] text-white" />
        </div>
        <span className="text-[17px] font-bold text-graphite-900 tracking-tight">
          PhotoApp
        </span>
      </div>

      {/* Menu */}
      <nav className="mb-7">
        <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">
          Menu
        </div>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard" && !item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-6 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                  : "text-graphite-500 hover:bg-graphite-100 hover:text-graphite-700"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-cyan text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <nav className="mb-7">
        <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">
          Settings
        </div>
        {settingsItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-6 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                  : "text-graphite-500 hover:bg-graphite-100 hover:text-graphite-700"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* User */}
      <div className="px-6 py-4 border-t border-graphite-200 flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-cyan to-cyan-light flex items-center justify-center text-[13px] font-bold text-white">
          A
        </div>
        <div>
          <div className="text-[13px] font-semibold text-graphite-900">Admin</div>
          <div className="text-[11px] text-graphite-400">aroundthehouse</div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create Topbar component**

```tsx
// src/components/layout/topbar.tsx

import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-[rgba(240,242,245,0.85)] backdrop-blur-xl border-b border-graphite-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-[22px] font-bold text-graphite-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-graphite-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-white border border-graphite-200 rounded-[10px] px-3.5 py-2 w-[200px] text-[13px] text-graphite-400 hover:border-graphite-300 transition-colors">
          <MagnifyingGlassIcon className="w-[15px] h-[15px] text-graphite-400" />
          Search jobs...
        </div>
        <Button variant="outline">Import</Button>
        <Button>
          <PlusIcon className="w-3.5 h-3.5" />
          New Job
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create app layout with sidebar**

```tsx
// src/app/(app)/layout.tsx

import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[230px]">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Install heroicons**

```bash
npm install @heroicons/react
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/\(app\)/layout.tsx
git commit -m "feat: add Sidebar and Topbar layout components"
```

---

### Task 5: Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`, `src/components/dashboard/job-list.tsx`, `src/components/dashboard/job-card.tsx`, `src/components/dashboard/quick-actions.tsx`, `src/components/dashboard/cost-tracker.tsx`, `src/components/dashboard/activity-feed.tsx`

- [ ] **Step 1: Create JobCard component**

```tsx
// src/components/dashboard/job-card.tsx

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
}

const dotColors: Record<string, string> = {
  processing: "bg-amber-500",
  review: "bg-cyan",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
};

export function JobCard({ job }: JobCardProps) {
  const progress = job.totalPhotos > 0
    ? Math.round((job.processedPhotos / job.totalPhotos) * 100)
    : 0;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-graphite-50 border-b border-graphite-50 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${dotColors[job.status]}`} />
        <div>
          <div className="text-[13.5px] font-semibold text-graphite-900">
            {job.address}
          </div>
          <div className="flex gap-3 text-xs text-graphite-400 mt-0.5">
            <span>{job.photographerName}</span>
            <span>{formatTime(job.createdAt)}</span>
            <span>{job.totalPhotos} photos{job.twilightCount > 0 ? ` · ${job.twilightCount} twilight` : ""}</span>
            <Badge variant={job.preset === "luxury" ? "luxury" : "standard"}>
              {job.preset.charAt(0).toUpperCase() + job.preset.slice(1)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {job.status === "processing" && (
          <div>
            <div className="text-xs font-semibold text-amber-600">
              Processing {job.processedPhotos}/{job.totalPhotos}
            </div>
            <ProgressBar value={progress} color="amber" />
          </div>
        )}
        {job.status === "review" && (
          <>
            <span className="text-xs font-semibold text-cyan">Ready for Review</span>
            <span className="text-graphite-300 text-base">›</span>
          </>
        )}
        {job.status === "approved" && (
          <>
            <span className="text-xs font-semibold text-emerald-600">Approved</span>
            <Button variant="text" className="text-xs">Download</Button>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  return "Yesterday";
}
```

- [ ] **Step 2: Create JobList component**

```tsx
// src/components/dashboard/job-list.tsx

"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCard } from "./job-card";
import type { Job } from "@/lib/types";

const filters = ["All", "Processing", "Review", "Approved"] as const;

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const filtered = activeFilter === "All"
    ? jobs
    : jobs.filter((j) => j.status === activeFilter.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
        <div className="inline-flex bg-graphite-100 rounded-lg p-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1 rounded-md text-[11.5px] font-semibold transition-all duration-200 ${
                activeFilter === f
                  ? "bg-white text-graphite-900 shadow-sm"
                  : "text-graphite-400 hover:text-graphite-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="py-1">
        {filtered.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create QuickActions component**

```tsx
// src/components/dashboard/quick-actions.tsx

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CloudArrowUpIcon,
  LinkIcon,
  PaintBrushIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

const actions = [
  { label: "Upload Photos", icon: CloudArrowUpIcon, color: "bg-cyan-50 text-cyan" },
  { label: "Dropbox Link", icon: LinkIcon, color: "bg-graphite-100 text-graphite-700" },
  { label: "Edit Presets", icon: PaintBrushIcon, color: "bg-emerald-100 text-emerald-600" },
  { label: "Batch Download", icon: ArrowDownTrayIcon, color: "bg-amber-100 text-amber-600" },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 p-4 bg-graphite-50 border border-graphite-100 rounded-xl cursor-pointer transition-all duration-200 hover:bg-graphite-100 hover:border-graphite-200 hover:-translate-y-0.5"
            >
              <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${a.color}`}>
                <a.icon className="w-[18px] h-[18px]" />
              </div>
              <span className="text-xs font-semibold text-graphite-700">
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create CostTracker component**

```tsx
// src/components/dashboard/cost-tracker.tsx

import { Card } from "@/components/ui/card";

interface CostTrackerProps {
  amount: number;
  imageCount: number;
  budget: number;
}

export function CostTracker({ amount, imageCount, budget }: CostTrackerProps) {
  const pct = Math.min(100, (amount / budget) * 100);

  return (
    <Card>
      <div className="p-5 text-center">
        <div className="text-[11px] font-semibold text-graphite-400 uppercase tracking-wider">
          Cost This Month
        </div>
        <div className="text-4xl font-extrabold text-graphite-900 tracking-tight mt-2 mb-1 tabular-nums">
          ${Math.floor(amount)}
          <span className="text-lg font-normal text-graphite-400">
            .{String(Math.round((amount % 1) * 100)).padStart(2, "0")}
          </span>
        </div>
        <div className="text-[13px] text-graphite-400">
          {imageCount} images processed
        </div>
        <div className="mt-4">
          <div className="h-1.5 bg-graphite-100 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-gradient-to-r from-cyan to-cyan-light rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-graphite-300">
            <span>$0</span>
            <span>Budget: ${budget}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create ActivityFeed component**

```tsx
// src/components/dashboard/activity-feed.tsx

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ActivityItem {
  id: string;
  icon: "approved" | "uploaded" | "regenerated";
  text: string;
  highlight: string;
  time: string;
}

const iconMap = {
  approved: { Icon: CheckCircleIcon, bg: "bg-emerald-100 text-emerald-600" },
  uploaded: { Icon: CloudArrowUpIcon, bg: "bg-cyan-50 text-cyan" },
  regenerated: { Icon: ExclamationTriangleIcon, bg: "bg-amber-100 text-amber-600" },
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <Button variant="text" className="text-xs">See All</Button>
      </CardHeader>
      <div className="px-5 pb-4">
        {items.map((item) => {
          const { Icon, bg } = iconMap[item.icon];
          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 py-2.5 border-b border-graphite-50 last:border-b-0"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[12.5px] text-graphite-700">
                  <strong className="font-semibold text-graphite-900">{item.highlight}</strong>{" "}
                  {item.text}
                </div>
                <div className="text-[11px] text-graphite-300 mt-0.5">{item.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Create Dashboard page**

```tsx
// src/app/(app)/dashboard/page.tsx

import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/ui/stat-card";
import { JobList } from "@/components/dashboard/job-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CostTracker } from "@/components/dashboard/cost-tracker";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  FolderIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { Job } from "@/lib/types";

// Mock data — will be replaced with database queries
const mockJobs: Job[] = [
  {
    id: "1",
    address: "123 Main Street, Toronto",
    photographerId: "p1",
    photographerName: "Mike R.",
    preset: "standard",
    status: "processing",
    totalPhotos: 72,
    processedPhotos: 45,
    approvedPhotos: 0,
    rejectedPhotos: 0,
    twilightCount: 0,
    createdAt: new Date(Date.now() - 35 * 60000),
    updatedAt: new Date(),
  },
  {
    id: "2",
    address: "456 Oak Avenue, Mississauga",
    photographerId: "p2",
    photographerName: "Sarah K.",
    preset: "standard",
    status: "review",
    totalPhotos: 48,
    processedPhotos: 48,
    approvedPhotos: 0,
    rejectedPhotos: 0,
    twilightCount: 0,
    createdAt: new Date(Date.now() - 2 * 3600000),
    updatedAt: new Date(),
  },
  {
    id: "3",
    address: "789 Pine Drive, Oakville",
    photographerId: "p1",
    photographerName: "You",
    preset: "luxury",
    status: "review",
    totalPhotos: 95,
    processedPhotos: 95,
    approvedPhotos: 0,
    rejectedPhotos: 0,
    twilightCount: 0,
    createdAt: new Date(Date.now() - 3 * 3600000),
    updatedAt: new Date(),
  },
  {
    id: "4",
    address: "15 Birch Lane, Burlington",
    photographerId: "p1",
    photographerName: "Mike R.",
    preset: "standard",
    status: "approved",
    totalPhotos: 38,
    processedPhotos: 38,
    approvedPhotos: 38,
    rejectedPhotos: 0,
    twilightCount: 1,
    createdAt: new Date(Date.now() - 24 * 3600000),
    updatedAt: new Date(),
  },
  {
    id: "5",
    address: "220 Lakeshore Blvd, Unit 1405",
    photographerId: "p2",
    photographerName: "Sarah K.",
    preset: "standard",
    status: "approved",
    totalPhotos: 32,
    processedPhotos: 32,
    approvedPhotos: 32,
    rejectedPhotos: 0,
    twilightCount: 0,
    createdAt: new Date(Date.now() - 24 * 3600000),
    updatedAt: new Date(),
  },
];

const mockActivity = [
  { id: "a1", icon: "approved" as const, highlight: "15 Birch Lane", text: "approved", time: "2 hours ago" },
  { id: "a2", icon: "uploaded" as const, highlight: "Mike R.", text: "uploaded 123 Main St", time: "35 min ago" },
  { id: "a3", icon: "regenerated" as const, highlight: "456 Oak Ave", text: "— 2 photos regenerated", time: "3 hours ago" },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" subtitle="Manage your photo editing jobs" />
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Jobs"
            value={24}
            subtext="This week"
            icon={<FolderIcon className="w-[18px] h-[18px]" />}
            highlight
          />
          <StatCard
            label="Processing"
            value={3}
            subtext="~45 min left"
            icon={<ArrowPathIcon className="w-[18px] h-[18px]" />}
            iconColor="amber"
          />
          <StatCard
            label="Needs Review"
            value={5}
            subtext="289 photos"
            icon={<EyeIcon className="w-[18px] h-[18px]" />}
            iconColor="cyan"
          />
          <StatCard
            label="Approved Today"
            value={12}
            subtext="4 properties"
            icon={<CheckCircleIcon className="w-[18px] h-[18px]" />}
            iconColor="green"
          />
        </div>

        {/* Grid: Jobs + Right Panel */}
        <div className="grid grid-cols-[1fr_340px] gap-4">
          <JobList jobs={mockJobs} />
          <div className="flex flex-col gap-4">
            <QuickActions />
            <CostTracker amount={47.2} imageCount={682} budget={150} />
            <ActivityFeed items={mockActivity} />
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Verify dashboard renders**

```bash
npm run dev
```

Navigate to http://localhost:3000 — should redirect to /dashboard and show the full Graphite+Cyan dashboard with mock data.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/ src/app/\(app\)/dashboard/
git commit -m "feat: add Dashboard page with job list, stats, quick actions, cost tracker"
```

---

### Task 6: Stub Pages

**Files:**
- Create: `src/app/(app)/presets/page.tsx`, `src/app/(app)/photographers/page.tsx`, `src/app/(app)/review/[jobId]/page.tsx`

- [ ] **Step 1: Create stub pages**

```tsx
// src/app/(app)/presets/page.tsx
import { Topbar } from "@/components/layout/topbar";

export default function PresetsPage() {
  return (
    <>
      <Topbar title="Editing Presets" subtitle="Manage your editing styles" />
      <div className="p-6">
        <div className="bg-white rounded-card border border-graphite-200 p-12 text-center">
          <p className="text-graphite-400">Presets manager — coming in Phase 2</p>
        </div>
      </div>
    </>
  );
}
```

```tsx
// src/app/(app)/photographers/page.tsx
import { Topbar } from "@/components/layout/topbar";

export default function PhotographersPage() {
  return (
    <>
      <Topbar title="Photographers" subtitle="Manage photographer accounts" />
      <div className="p-6">
        <div className="bg-white rounded-card border border-graphite-200 p-12 text-center">
          <p className="text-graphite-400">Photographer manager — coming in Phase 2</p>
        </div>
      </div>
    </>
  );
}
```

```tsx
// src/app/(app)/review/[jobId]/page.tsx
import { Topbar } from "@/components/layout/topbar";

export default function ReviewPage({ params }: { params: { jobId: string } }) {
  return (
    <>
      <Topbar title="Review Gallery" subtitle={`Job ${params.jobId}`} />
      <div className="p-6">
        <div className="bg-white rounded-card border border-graphite-200 p-12 text-center">
          <p className="text-graphite-400">Review gallery — coming in Phase 5</p>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/presets/ src/app/\(app\)/photographers/ src/app/\(app\)/review/
git commit -m "feat: add stub pages for presets, photographers, review"
```

---

### Task 7: Build and Deploy to Vercel

- [ ] **Step 1: Build locally**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Fix any build errors**

If errors appear, fix them. Common issues: missing imports, type errors, unused variables.

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel --yes
```

Follow prompts to link to existing Vercel account and create new project.

- [ ] **Step 4: Verify deployment**

Open the deployment URL. Should see the full dashboard with Graphite+Cyan theme.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues for Vercel deployment"
```

---

## Summary

After Phase 1 completes, you'll have:
- Working Next.js app deployed on Vercel
- Dashboard with Graphite+Cyan design system
- Sidebar navigation, stat cards, job list, quick actions, cost tracker, activity feed
- All mock data — real data comes in Phase 2+
- Stub pages for presets, photographers, review gallery

**Next phase:** Phase 2 — Dropbox integration + EXIF bracket grouping
