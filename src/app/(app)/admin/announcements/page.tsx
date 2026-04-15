"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Announcement { id: string; message: string; type: string; active: boolean; createdAt: string; }

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("info");

  async function load() {
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    setList(data.announcements || []);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!msg.trim()) return;
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, type }),
    });
    if (res.ok) {
      setMsg("");
      load();
    }
  }

  async function toggle(a: Announcement) {
    await fetch(`/api/admin/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete announcement?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <Topbar title="Announcements" />
      <div className="p-6 space-y-4">
        <Card>
          <div className="p-4 space-y-2">
            <h2 className="text-sm font-semibold dark:text-white">Post an announcement</h2>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
              placeholder="Message text"
              className="w-full text-sm p-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
            <div className="flex gap-2">
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="text-sm px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </select>
              <button onClick={create} disabled={!msg.trim()}
                className="text-xs px-4 py-1.5 rounded bg-cyan text-white font-semibold disabled:opacity-50">Post</button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">All announcements</h2>
            {list.length === 0 ? (
              <div className="text-xs text-graphite-400 text-center py-4">No announcements yet</div>
            ) : (
              <ul className="space-y-2">
                {list.map(a => (
                  <li key={a.id} className="flex justify-between items-center py-2 border-b border-graphite-50 dark:border-graphite-800 last:border-b-0">
                    <div>
                      <div className={`text-xs font-semibold ${a.active ? "text-emerald-600" : "text-graphite-400"}`}>
                        [{a.type}] {a.active ? "ACTIVE" : "hidden"}
                      </div>
                      <div className="text-sm dark:text-white">{a.message}</div>
                      <div className="text-[11px] text-graphite-400">{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggle(a)}
                        className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
                        {a.active ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => del(a.id)}
                        className="text-xs px-2 py-1 rounded bg-red-500 text-white">
                        Delete
                      </button>
                    </div>
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
