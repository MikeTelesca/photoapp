"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  text: string;
  children?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({ text, children, position = "top" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  const positionStyles = {
    top: "bottom-full mb-1 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-1 left-1/2 -translate-x-1/2",
    left: "right-full mr-1 top-1/2 -translate-y-1/2",
    right: "left-full ml-1 top-1/2 -translate-y-1/2",
  }[position];

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-graphite-200 dark:bg-graphite-700 text-graphite-500 dark:text-graphite-400 text-[10px] font-bold cursor-help"
      >
        ?
      </span>
      {open && (
        <span className={`absolute ${positionStyles} z-50 w-56 p-2 rounded bg-graphite-900 dark:bg-graphite-700 text-white text-xs leading-tight shadow-lg pointer-events-none`}>
          {text}
        </span>
      )}
      {children}
    </span>
  );
}
