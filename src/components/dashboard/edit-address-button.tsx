"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
  initial: string;
}

export function EditAddressButton({ jobId, initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (!value.trim() || value === initial) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: value.trim() }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setValue(initial); setEditing(false); }
          }}
          onBlur={save}
          className="text-[13.5px] font-semibold px-2 py-0.5 rounded border border-cyan-300 dark:bg-graphite-800 dark:text-white"
        />
        {saving && <span className="text-xs text-graphite-400">...</span>}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
      className="text-[10px] uppercase tracking-wide text-graphite-400 hover:text-cyan ml-2"
      title="Edit address"
    >
      Edit
    </button>
  );
}
