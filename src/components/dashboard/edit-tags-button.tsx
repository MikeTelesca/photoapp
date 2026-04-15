"use client";
import { useState } from "react";
import { TagInput } from "@/components/common/tag-input";

export function EditTagsButton({ jobId, initial }: { jobId: string; initial: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: value }),
    });
    setEditing(false);
    window.location.reload();
  }

  if (editing) {
    return (
      <div
        className="flex flex-col gap-1 w-56"
        onClick={(e) => e.stopPropagation()}
      >
        <TagInput
          autoFocus
          value={value}
          onChange={setValue}
          placeholder="Add a tag…"
        />
        <div className="flex gap-2 text-[10px]">
          <button
            onClick={save}
            disabled={saving}
            className="text-cyan font-semibold hover:text-cyan-dark disabled:opacity-50"
          >
            {saving ? "saving…" : "save"}
          </button>
          <button
            onClick={() => {
              setValue(initial);
              setEditing(false);
            }}
            className="text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-200"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setEditing(true);
      }}
      className="text-[10px] text-graphite-400 hover:text-cyan underline"
    >
      edit tags
    </button>
  );
}
