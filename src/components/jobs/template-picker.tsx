"use client";

import { useEffect, useState } from "react";
import { BookmarkIcon } from "@heroicons/react/24/outline";

interface JobTemplate {
  id: string;
  name: string;
  preset: string;
  tvStyle: string | null;
  skyStyle: string | null;
  watermarkText: string | null;
  photographerName: string | null;
  clientName: string | null;
  tags: string | null;
  notes: string | null;
}

interface TemplatePickerProps {
  onApply: (template: JobTemplate) => void;
}

export function TemplatePicker({ onApply }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || templates.length === 0) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelected(id);
    if (!id) return;
    const template = templates.find((t) => t.id === id);
    if (template) onApply(template);
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-cyan-50 border border-cyan/20 rounded-xl">
      <BookmarkIcon className="w-4 h-4 text-cyan flex-shrink-0" />
      <label className="text-sm font-semibold text-graphite-700 flex-shrink-0">
        Load template
      </label>
      <select
        value={selected}
        onChange={handleChange}
        className="flex-1 px-3 py-1.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan bg-white"
      >
        <option value="">Pick a template to prefill fields...</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
