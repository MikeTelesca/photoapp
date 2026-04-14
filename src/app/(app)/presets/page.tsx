import { Topbar } from "@/components/layout/topbar";

export default function PresetsPage() {
  return (
    <>
      <Topbar title="Editing Presets" subtitle="Manage your editing styles" />
      <div className="p-6">
        <div className="bg-white rounded-card border border-graphite-200 p-12 text-center">
          <p className="text-graphite-400">Presets manager — coming in Phase 2</p>
        </div>
      </div>
    </>
  );
}
