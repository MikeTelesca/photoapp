"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export default function PlaygroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [prompt, setPrompt] = useState("Professional real estate editing: balanced exposure, window pull, straighten vertical lines, fix lens distortion, natural colors, MLS-ready output.");
  const [result, setResult] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }

  async function run() {
    if (!file || !prompt.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("prompt", prompt);
    try {
      const res = await fetch("/api/playground/enhance", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setResult(data.dataUrl);
        setModel(data.model);
      } else {
        setError(data.error || "Failed");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Topbar title="Prompt Playground" />
      <div className="p-6 space-y-4">
        <Card>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 dark:text-white">1. Upload sample photo</label>
              <input type="file" accept="image/jpeg,image/png" onChange={onFile}
                className="text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 dark:text-white">2. Write your prompt</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6}
                className="w-full text-sm p-3 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono" />
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={run} disabled={!file || !prompt || running}
                className="text-xs px-4 py-2 rounded bg-cyan text-white font-semibold disabled:bg-graphite-300">
                {running ? "Running..." : "Run enhance"}
              </button>
              {error && <span className="text-xs text-red-500">{error}</span>}
              {model && !error && <span className="text-xs text-graphite-500 dark:text-graphite-400">Model: {model}</span>}
            </div>
          </div>
        </Card>

        {(preview || result) && (
          <Card>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-center mb-1 dark:text-white">Original</div>
                  {preview && <img src={preview} className="w-full rounded" alt="Original" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-center mb-1 dark:text-white">Enhanced</div>
                  {result ? (
                    <img src={result} className="w-full rounded" alt="Enhanced" />
                  ) : (
                    <div className="aspect-[3/2] bg-graphite-100 dark:bg-graphite-800 rounded flex items-center justify-center text-xs text-graphite-400">
                      {running ? "Processing..." : "Click Run to generate"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-4 text-xs text-graphite-500 dark:text-graphite-400">
            <strong className="dark:text-white">Tips:</strong>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Test single photos before committing to a full job</li>
              <li>Save winning prompts as presets for reuse</li>
              <li>Each run costs roughly $0.07 (same as a regular photo)</li>
              <li>Bracketed HDR isn&apos;t supported here — use full jobs for HDR merge</li>
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
