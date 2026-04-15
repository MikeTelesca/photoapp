"use client";

import { useState } from "react";
import {
  XMarkIcon,
  SparklesIcon,
  LinkIcon,
  EyeIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

type Step = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to ATH AI Editor",
    body:
      "ATH AI Editor is an AI-powered batch editing pipeline for real estate photographers. Drop in your bracketed HDR shots and the app handles merging, color, sky replacement, TV overlays, and more. Let's take a quick 4-step tour so you know where everything lives.",
    icon: SparklesIcon,
    placeholder: "Welcome / hero screenshot",
  },
  {
    title: "Create a job from a Dropbox link",
    body:
      "Click \"New Job\" from the dashboard and paste the Dropbox shared folder link that contains your bracketed photos. Add an address, pick a preset and sky style, and the app will pull the files in and group them into bracket sets automatically.",
    icon: LinkIcon,
    placeholder: "New Job form screenshot",
  },
  {
    title: "Review and approve photos",
    body:
      "Once the AI finishes enhancing, open the job's Review tab to flip through edited photos. Use A to approve, R to reject, and the arrow keys to navigate. Approved photos are ready to download as a ZIP or share with clients via a share link.",
    icon: EyeIcon,
    placeholder: "Review page screenshot",
  },
  {
    title: "Make it yours in Settings",
    body:
      "Head to Settings to manage presets, watermark and invoice logos, email preferences, billing, API keys, and more. You can also replay this tour any time from the Onboarding section of Settings.",
    icon: Cog6ToothIcon,
    placeholder: "Settings page screenshot",
  },
];

async function markOnboarded() {
  try {
    await fetch("/api/user/onboarded", { method: "POST" });
  } catch {
    // best-effort; user can still dismiss
  }
}

export function ProductTour({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  function close() {
    setOpen(false);
    void markOnboarded();
  }

  function next() {
    if (isLast) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  }

  function prev() {
    if (!isFirst) setStep((s) => s - 1);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-graphite-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={close}
          aria-label="Skip tour"
          className="absolute top-4 right-4 text-graphite-400 hover:text-graphite-700 dark:hover:text-graphite-200"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-xl flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="text-[11px] uppercase tracking-wide text-graphite-400 mb-1">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2 className="text-xl font-bold text-graphite-900 dark:text-white mb-2">
          {current.title}
        </h2>
        <p className="text-sm text-graphite-600 dark:text-graphite-300 mb-4 leading-relaxed">
          {current.body}
        </p>

        {/* Screenshot / icon placeholder */}
        <div className="aspect-video w-full rounded-lg border border-dashed border-graphite-200 dark:border-graphite-700 bg-graphite-50 dark:bg-graphite-800 flex items-center justify-center mb-5">
          <div className="flex flex-col items-center gap-2 text-graphite-400">
            <Icon className="w-10 h-10" />
            <span className="text-xs">{current.placeholder}</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-graphite-900 dark:bg-white" : "w-1.5 bg-graphite-200 dark:bg-graphite-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={close}
            className="text-xs text-graphite-500 hover:text-graphite-700 dark:hover:text-graphite-200"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={isFirst}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-graphite-700 dark:text-graphite-200 bg-graphite-100 dark:bg-graphite-800 hover:bg-graphite-200 dark:hover:bg-graphite-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={next}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-graphite-900 to-graphite-700 hover:opacity-95"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
