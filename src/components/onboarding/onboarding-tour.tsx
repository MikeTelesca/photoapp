"use client";
import { useState, useEffect } from "react";

const STEPS = [
  {
    title: "Welcome to BatchBase",
    body: "Merge bracketed HDR photos and apply professional real estate editing automatically with Google Gemini.",
    label: "Welcome",
  },
  {
    title: "Upload your photos",
    body: "Create a new job. Paste a Dropbox shared folder link or upload JPEG/PNG files directly. Bracketed sets (3 or 5 exposures per angle) are auto-detected.",
    label: "Upload",
  },
  {
    title: "AI enhances in minutes",
    body: "The AI merges brackets into HDR, fixes vertical lines, pulls windows, and applies your selected preset (Standard, Bright & Airy, Luxury, MLS Standard, Flambient).",
    label: "Enhance",
  },
  {
    title: "Review and download",
    body: "Approve or reject each photo with A/R keys. Regenerate specific photos with different prompts. Download the final set as a ZIP when done.",
    label: "Deliver",
  },
];

export function OnboardingTour({ hasJobs }: { hasJobs: boolean }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (hasJobs) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("onboarding-dismissed") === "1") return;
    setShow(true);
  }, [hasJobs]);

  function dismiss() {
    localStorage.setItem("onboarding-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={dismiss}>
      <div className="bg-white dark:bg-graphite-900 rounded-xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan text-center mb-3">{current.label}</div>
        <h2 className="text-xl font-bold text-center mb-2 text-graphite-900 dark:text-white">{current.title}</h2>
        <p className="text-sm text-graphite-600 dark:text-graphite-300 text-center leading-relaxed">{current.body}</p>

        <div className="flex justify-center gap-1 mt-5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 w-8 rounded ${i === step ? "bg-cyan" : "bg-graphite-200 dark:bg-graphite-700"}`} />
          ))}
        </div>

        <div className="flex justify-between items-center mt-5">
          <button onClick={dismiss} className="text-xs text-graphite-500 dark:text-graphite-400 hover:underline">
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-white">
                Back
              </button>
            )}
            <button onClick={() => isLast ? dismiss() : setStep(step + 1)}
              className="text-xs px-4 py-1.5 rounded bg-cyan text-white font-semibold">
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
