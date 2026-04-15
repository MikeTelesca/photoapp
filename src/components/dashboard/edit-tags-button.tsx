"use client";
import { useState } from "react";

export function EditTagsButton({ jobId, initial }: { jobId: string; initial: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);

  async function save() {
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
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="comma,separated,tags"
          className="text-[10px] px-1 py-0.5 rounded border border-graphite-300 w-32"
        />
        <button
          onClick={save}
          className="text-[10px] text-cyan font-semibold"
        >
          save
        </button>
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
