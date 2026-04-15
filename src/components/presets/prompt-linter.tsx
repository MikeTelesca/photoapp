"use client";
import { useMemo } from "react";
import { lintPrompt } from "@/lib/prompt-linter";

interface Props {
  text: string;
}

export function PromptLinter({ text }: Props) {
  const issues = useMemo(() => lintPrompt(text), [text]);
  if (issues.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {issues.map((issue, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 text-[11px] px-2 py-1 rounded ${
            issue.severity === "warn"
              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
              : "bg-graphite-50 dark:bg-graphite-800 text-graphite-600 dark:text-graphite-300"
          }`}
        >
          <span>{issue.severity === "warn" ? "⚠" : "💡"}</span>
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
