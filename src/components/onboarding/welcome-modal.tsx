"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { XMarkIcon, CameraIcon, LinkIcon, SparklesIcon, EyeIcon } from "@heroicons/react/24/outline";

export function WelcomeModal() {
  const [show, setShow] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("welcome-modal-seen");
    if (!seen) {
      setShow(true);
    }
  }, [session]);

  function dismiss() {
    setShow(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("welcome-modal-seen", "1");
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
        <button onClick={dismiss} className="absolute top-4 right-4 text-graphite-400 hover:text-graphite-700">
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-xl flex items-center justify-center mb-4">
          <CameraIcon className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-xl font-bold text-graphite-900 mb-1">Welcome to PhotoApp 👋</h2>
        <p className="text-sm text-graphite-500 mb-5">Here&apos;s how to get started in 4 steps:</p>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
            <div>
              <div className="text-sm font-semibold text-graphite-900 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4" />
                Create a New Job
              </div>
              <p className="text-xs text-graphite-500 mt-0.5">Click &ldquo;New Job&rdquo; — paste a Dropbox shared folder link with your bracketed photos.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
            <div>
              <div className="text-sm font-semibold text-graphite-900">Click &ldquo;Start Processing&rdquo;</div>
              <p className="text-xs text-graphite-500 mt-0.5">The app pulls your photos from Dropbox and groups them into bracket sets.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
            <div>
              <div className="text-sm font-semibold text-graphite-900 flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4" />
                Click &ldquo;Enhance All&rdquo;
              </div>
              <p className="text-xs text-graphite-500 mt-0.5">AI processes each photo with HDR merge + color correction. Takes ~30s per photo.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
            <div>
              <div className="text-sm font-semibold text-graphite-900 flex items-center gap-1.5">
                <EyeIcon className="w-4 h-4" />
                Review &amp; Approve
              </div>
              <p className="text-xs text-graphite-500 mt-0.5">Use keyboard shortcuts: A=approve, R=reject, ←→=navigate. Click Download when done.</p>
            </div>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="mt-6 w-full py-2.5 rounded-lg bg-gradient-to-br from-graphite-900 to-graphite-700 text-white text-sm font-semibold"
        >
          Got it, let&apos;s go!
        </button>
      </div>
    </div>
  );
}
