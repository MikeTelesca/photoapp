"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded bg-cyan text-white text-sm font-semibold"
    >
      🖨 Print
    </button>
  );
}
