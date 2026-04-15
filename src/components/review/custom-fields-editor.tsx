"use client";
import { useState, useEffect } from "react";

interface Props {
  jobId: string;
  initial: string | null;
}

interface Field { key: string; value: string; }

export function CustomFieldsEditor({ jobId, initial }: Props) {
  const [fields, setFields] = useState<Field[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      try {
        const obj = JSON.parse(initial);
        setFields(Object.entries(obj).map(([key, value]) => ({ key, value: String(value) })));
      } catch {}
    }
  }, [initial]);

  function addField() {
    setFields([...fields, { key: "", value: "" }]);
  }

  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, field: "key" | "value", val: string) {
    const newFields = [...fields];
    newFields[idx] = { ...newFields[idx], [field]: val };
    setFields(newFields);
  }

  async function save() {
    setSaving(true);
    try {
      const obj: Record<string, string> = {};
      for (const f of fields) {
        if (f.key.trim()) obj[f.key.trim()] = f.value.trim();
      }
      const json = Object.keys(obj).length > 0 ? JSON.stringify(obj) : null;
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customFields: json }),
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  // Suggestions
  const SUGGESTIONS = ["square_feet", "listing_price", "mls_number", "bedrooms", "bathrooms", "year_built", "lot_size"];

  if (!open && fields.length === 0) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-[10px] text-graphite-400 hover:text-cyan underline">
        + add custom field
      </button>
    );
  }

  if (!open) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-baseline">
          <div className="text-[11px] uppercase tracking-wide text-graphite-500 font-semibold">Custom fields</div>
          <button onClick={() => setOpen(true)} className="text-[10px] text-cyan hover:underline">edit</button>
        </div>
        {fields.map((f, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-graphite-500 dark:text-graphite-400">{f.key}</span>
            <span className="font-medium dark:text-white">{f.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 border border-graphite-200 dark:border-graphite-700 rounded">
      <div className="flex justify-between items-baseline">
        <h4 className="text-xs font-semibold dark:text-white">Edit custom fields</h4>
      </div>
      {fields.map((f, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input
            type="text"
            value={f.key}
            onChange={(e) => updateField(i, "key", e.target.value)}
            placeholder="field name"
            list="field-suggestions"
            className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white flex-1"
          />
          <input
            type="text"
            value={f.value}
            onChange={(e) => updateField(i, "value", e.target.value)}
            placeholder="value"
            className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white flex-1"
          />
          <button onClick={() => removeField(i)} className="text-red-500 text-xs">×</button>
        </div>
      ))}
      <datalist id="field-suggestions">
        {SUGGESTIONS.map(s => <option key={s} value={s} />)}
      </datalist>
      <div className="flex justify-between">
        <button onClick={addField} className="text-xs text-cyan hover:underline">+ add field</button>
        <div className="flex gap-1">
          <button onClick={() => setOpen(false)} className="text-xs text-graphite-500">Cancel</button>
          <button onClick={save} disabled={saving} className="text-xs px-2 py-1 rounded bg-cyan text-white">
            {saving ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
