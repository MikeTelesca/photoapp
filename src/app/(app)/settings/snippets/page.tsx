"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Template { id: string; title: string; body: string; category: string; }

export default function SnippetsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");

  async function load() {
    const res = await fetch("/api/note-templates");
    const data = await res.json();
    setTemplates(data.templates || []);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim() || !body.trim()) return;
    await fetch("/api/note-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, category }),
    });
    setTitle(""); setBody("");
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this snippet?")) return;
    await fetch(`/api/note-templates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <Topbar title="Note snippets" />
      <div className="p-6 space-y-4">
        <Card>
          <div className="p-4 space-y-2">
            <h2 className="text-sm font-semibold dark:text-white">Create snippet</h2>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Snippet title (e.g. 'Twilight reshoot needed')"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              placeholder="Snippet body (the text to insert)"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
            <div className="flex justify-between items-center">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white">
                <option value="general">General</option>
                <option value="job">Job notes</option>
                <option value="photo">Photo notes</option>
              </select>
              <button onClick={create} disabled={!title.trim() || !body.trim()}
                className="text-xs px-4 py-1.5 rounded bg-cyan text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Save snippet</button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">Your snippets ({templates.length})</h2>
            {templates.length === 0 ? (
              <div className="text-xs text-graphite-400 text-center py-4">No snippets yet</div>
            ) : (
              <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
                {templates.map(t => (
                  <li key={t.id} className="py-3 flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium dark:text-white">{t.title} <span className="text-[10px] text-graphite-400 ml-1 uppercase">{t.category}</span></div>
                      <div className="text-xs text-graphite-500 dark:text-graphite-400 mt-0.5 whitespace-pre-wrap">{t.body}</div>
                    </div>
                    <button onClick={() => del(t.id)}
                      className="text-xs text-red-500 hover:underline self-start flex-shrink-0">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
