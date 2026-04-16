"use client";

import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from "@heroicons/react/24/solid";
import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export type ProgressState =
  | "uploading"
  | "processing"
  | "queued"
  | "complete"
  | "failed"
  | "paused";

interface ProgressRowProps {
  /** Primary label shown above the bar */
  label: string;
  /** Current percentage 0–100 */
  value: number;
  /** State drives color + right-side icon */
  state?: ProgressState;
  /** Optional byte progress `27MB of 60MB` */
  bytes?: { current: string; total: string };
  /** Optional time-remaining string `9 sec left` */
  timeLeft?: string;
  /** Optional detail message (shown under bar — red for failed) */
  message?: string;
  /** Info tooltip content — shows (i) icon when provided */
  info?: string;
  /** Cancel handler — shows × button when provided */
  onCancel?: () => void;
  /** Retry handler — shows ↻ button when provided (usually on failed state) */
  onRetry?: () => void;
}

const barColor: Record<ProgressState, string> = {
  uploading: "bg-violet-500",
  processing: "bg-cyan-500",
  queued: "bg-graphite-500",
  complete: "bg-emerald-500",
  failed: "bg-red-500",
  paused: "bg-amber-500",
};

const textColor: Record<ProgressState, string> = {
  uploading: "text-violet-600 dark:text-violet-400",
  processing: "text-cyan dark:text-cyan-light",
  queued: "text-graphite-500 dark:text-graphite-400",
  complete: "text-emerald-600 dark:text-emerald-400",
  failed: "text-red-600 dark:text-red-400",
  paused: "text-amber-600 dark:text-amber-400",
};

/**
 * Full-featured progress row matching BatchBase inspo spec:
 * - Label + optional info icon
 * - Percentage + optional size/time meta
 * - Colored state bar (uploading=violet, processing=cyan, complete=green, failed=red, paused=amber, queued=gray)
 * - Inline × cancel and ↻ retry actions
 * - Error message below bar on failure
 *
 * Use for: upload rows, enhancement queue items, any long-running operation.
 */
export function ProgressRow({
  label,
  value,
  state = "processing",
  bytes,
  timeLeft,
  message,
  info,
  onCancel,
  onRetry,
}: ProgressRowProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const showSpinner = state === "uploading" || state === "processing";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-graphite-900 dark:text-white truncate">
            {label}
          </span>
          {info && (
            <span title={info} className="text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300 cursor-help shrink-0">
              <InformationCircleIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bytes && (
            <span className="text-xs text-graphite-500 dark:text-graphite-400 tabular-nums">
              {bytes.current} of {bytes.total}
            </span>
          )}
          {timeLeft && (
            <span className="text-xs text-graphite-500 dark:text-graphite-400">
              {timeLeft}
            </span>
          )}
          <span className={`text-xs font-semibold tabular-nums ${textColor[state]}`}>
            {state === "complete" ? "100%" : state === "failed" ? "—" : `${pct}%`}
          </span>
          {showSpinner && (
            <svg
              className={`w-3.5 h-3.5 animate-spin ${textColor[state]}`}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {state === "complete" && (
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" aria-label="Complete" />
          )}
          {state === "failed" && (
            <XCircleIcon className="w-4 h-4 text-red-500" aria-label="Failed" />
          )}
          {onRetry && state === "failed" && (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Retry"
              className="p-0.5 rounded text-graphite-400 hover:text-graphite-900 dark:hover:text-white"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {onCancel && state !== "complete" && state !== "failed" && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="p-0.5 rounded text-graphite-400 hover:text-graphite-900 dark:hover:text-white"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className="w-full h-1.5 bg-graphite-200/70 dark:bg-graphite-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full ${barColor[state]} rounded-full transition-all duration-300 ${
            state === "processing" || state === "uploading" ? "" : ""
          }`}
          style={{ width: state === "failed" ? "100%" : `${pct}%` }}
        />
      </div>

      {message && (
        <p className={`mt-1 text-xs ${state === "failed" ? "text-red-600 dark:text-red-400" : "text-graphite-500 dark:text-graphite-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Condensed variant: label and counts inline on one row with a small bar.
 * Matches the "Class A / 368" pattern from inspo — for per-preset or per-photographer stats.
 */
export function ProgressStat({
  label,
  value,
  total,
  color = "cyan",
}: {
  label: string;
  value: number;
  total?: number;
  color?: "cyan" | "violet" | "emerald" | "amber" | "red" | "pink";
}) {
  const pct = total ? Math.min(100, (value / total) * 100) : value;
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    pink: "bg-pink-500",
  };
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-graphite-900 dark:text-white">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-graphite-900 dark:text-white">
          {value.toLocaleString()}
          {total !== undefined && (
            <span className="text-xs font-normal text-graphite-500 dark:text-graphite-400"> / {total.toLocaleString()}</span>
          )}
        </span>
      </div>
      <div className="w-full h-1.5 bg-graphite-200/70 dark:bg-graphite-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
