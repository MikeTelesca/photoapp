"use client";

export type PhotoRow = {
  id: string;
  orderIndex: number;
  status: string;
  originalUrl: string | null;
  editedUrl: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
};

type Props = {
  photos: PhotoRow[];
  onOpen: (index: number) => void;
  onEnhance: (photoId: string) => void;
  onApprove: (photoId: string) => void;
  onReject: (photoId: string) => void;
  onDelete: (photoId: string) => void;
};

const statusTone: Record<string, string> = {
  pending: "bg-graphite-800/80 text-graphite-200",
  processing: "bg-cyan/80 text-white",
  regenerating: "bg-cyan/80 text-white",
  edited: "bg-white/90 text-graphite-900",
  approved: "bg-emerald-500/90 text-white",
  rejected: "bg-red-500/90 text-white",
  failed: "bg-red-700/90 text-white",
};

export function JobGrid({ photos, onOpen, onEnhance, onApprove, onReject, onDelete }: Props) {
  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-graphite-200 dark:border-graphite-800 p-12 text-center text-graphite-500">
        No photos yet. Sync Dropbox or upload files above.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {photos.map((p, i) => {
        const src = p.thumbnailUrl || p.editedUrl || p.originalUrl || "";
        return (
          <div
            key={p.id}
            className="group relative aspect-[3/2] overflow-hidden rounded-lg bg-graphite-100 dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-800"
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onOpen(i)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-graphite-500">
                No image
              </div>
            )}

            <span
              className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${statusTone[p.status] ?? statusTone.pending}`}
            >
              {p.status}
            </span>

            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 justify-center">
              <ActionBtn label="View" onClick={() => onOpen(i)} />
              <ActionBtn label="Enhance" onClick={() => onEnhance(p.id)} />
              <ActionBtn label="Approve" onClick={() => onApprove(p.id)} tone="emerald" />
              <ActionBtn label="Reject" onClick={() => onReject(p.id)} tone="red" />
              <ActionBtn label="Delete" onClick={() => onDelete(p.id)} tone="red" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: "red" | "emerald";
}) {
  const toneCls =
    tone === "red"
      ? "bg-red-500/90 hover:bg-red-500 text-white"
      : tone === "emerald"
      ? "bg-emerald-500/90 hover:bg-emerald-500 text-white"
      : "bg-white/90 hover:bg-white text-graphite-900";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`text-[11px] font-medium px-2 py-1 rounded ${toneCls}`}
    >
      {label}
    </button>
  );
}
