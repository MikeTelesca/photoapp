import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Release {
  version: string;
  date: string;
  highlights: { icon: string; title: string; desc: string }[];
}

const RELEASES: Release[] = [
  {
    version: "v2.0",
    date: "2026-04",
    highlights: [
      { icon: "⌨️", title: "Cmd+K Command Palette", desc: "Jump to any job, client, or page instantly" },
      { icon: "🔔", title: "In-App Notifications", desc: "Bell icon shows job completions and client comments" },
      { icon: "📄", title: "Marketing PDF Export", desc: "Generate professional gallery PDFs for client delivery" },
      { icon: "🎨", title: "Theme Accent Colors", desc: "Customize the app's accent color to match your brand" },
      { icon: "📱", title: "Mobile Bottom Nav", desc: "Faster mobile navigation with dedicated bottom bar" },
      { icon: "🔐", title: "Two-Factor Auth", desc: "Add TOTP 2FA for extra account security" },
      { icon: "📊", title: "Spend Forecast", desc: "30-day projection based on your usage trend" },
    ],
  },
  {
    version: "v1.9",
    date: "2026-04",
    highlights: [
      { icon: "✂", title: "AI Crop Suggestions", desc: "Let AI suggest the optimal crop for each photo" },
      { icon: "🏷️", title: "AI Auto-Tagging", desc: "Photos are automatically tagged as kitchen, bathroom, exterior, etc." },
      { icon: "✨", title: "AI Preset Suggestions", desc: "Get a recommended preset based on the property style" },
      { icon: "📝", title: "MLS Description Generator", desc: "AI writes listing copy from your approved photos" },
      { icon: "🔖", title: "Per-Photo Notes", desc: "Leave notes on individual photos separate from job notes" },
    ],
  },
  {
    version: "v1.8",
    date: "2026-03",
    highlights: [
      { icon: "🔗", title: "Public Share Links", desc: "Share a read-only gallery with your clients — optional password protection" },
      { icon: "💬", title: "Client Comments", desc: "Clients can leave comments on photos via the share link" },
      { icon: "✉️", title: "Email Share to Client", desc: "Send the share link directly from the app with a personal message" },
      { icon: "📸", title: "Slideshow Mode", desc: "Fullscreen presentation mode with auto-advance" },
      { icon: "⭐", title: "Favorite Photos", desc: "Star your best shots with the F key" },
    ],
  },
  {
    version: "v1.7",
    date: "2026-03",
    highlights: [
      { icon: "👥", title: "Client Management", desc: "Dedicated client database with contact info and job history" },
      { icon: "📋", title: "Job Templates", desc: "Save a job's config and reuse on new jobs" },
      { icon: "💰", title: "Invoice PDF Generator", desc: "Professional invoices per job with your business info" },
      { icon: "📊", title: "Billing Page", desc: "Monthly spend breakdown with YTD and projections" },
      { icon: "🎯", title: "Preset Fork", desc: "Duplicate any preset to create a variation" },
    ],
  },
  {
    version: "v1.6",
    date: "2026-02",
    highlights: [
      { icon: "🖼️", title: "Grid View Mode", desc: "2/3/4-up gallery view for rapid overview" },
      { icon: "🔀", title: "Drag-Drop Reorder", desc: "Reorder photos with drag and drop" },
      { icon: "🔍", title: "Advanced Search", desc: "Multi-filter search: date, cost, photos, client, tags" },
      { icon: "📏", title: "MLS Export Sizes", desc: "Download resized for MLS, Instagram, TikTok, Realtor.ca" },
      { icon: "🎹", title: "Keyboard Shortcuts", desc: "Customizable keyboard shortcuts with F, E, S, Z, ? bindings" },
    ],
  },
  {
    version: "v1.5",
    date: "2026-02",
    highlights: [
      { icon: "🪄", title: "Prompt Playground", desc: "Test custom prompts on sample photos before running a full job" },
      { icon: "🔄", title: "A/B Preset Compare", desc: "Run a photo through two presets and compare side-by-side" },
      { icon: "♻️", title: "Batch Re-Enhance", desc: "Re-enhance all rejected photos with a different preset" },
      { icon: "📝", title: "Markdown Notes", desc: "Job notes support markdown formatting" },
    ],
  },
  {
    version: "v1.4",
    date: "2026-02",
    highlights: [
      { icon: "🏆", title: "Quality Flags", desc: "AI flags blurry, over-exposed, or low-contrast photos" },
      { icon: "🚫", title: "Rejection Reasons", desc: "Track why photos are rejected for prompt tuning feedback" },
      { icon: "🎛️", title: "Watermark Editor", desc: "Position, size, opacity controls + upload custom logo" },
      { icon: "🎨", title: "Dark Mode", desc: "Complete dark mode support across all pages" },
    ],
  },
  {
    version: "v1.0",
    date: "2026-01",
    highlights: [
      { icon: "🚀", title: "HDR Merge", desc: "Auto-merge bracketed exposures via Google Gemini" },
      { icon: "🎨", title: "5 Presets", desc: "Standard, Bright & Airy, Luxury, MLS Standard, Flambient" },
      { icon: "📤", title: "Dropbox Integration", desc: "Direct ingestion from Dropbox shared folders" },
      { icon: "✅", title: "Review Gallery", desc: "Approve/reject flow with before/after comparison" },
      { icon: "📥", title: "ZIP Download", desc: "Download all approved photos as a ZIP" },
    ],
  },
];

export default function WhatsNewPage() {
  return (
    <>
      <Topbar title="What's new" />
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Feature releases</h1>
          <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1">
            Here's everything we've shipped. Click the links in settings & tooltips to try them out.
          </p>
        </div>
        <div className="space-y-4">
          {RELEASES.map(rel => (
            <Card key={rel.version}>
              <div className="p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-lg font-bold text-cyan">{rel.version}</h2>
                  <span className="text-xs text-graphite-400">{rel.date}</span>
                </div>
                <ul className="space-y-3">
                  {rel.highlights.map((h, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-xl flex-shrink-0">{h.icon}</span>
                      <div>
                        <div className="text-sm font-semibold dark:text-white">{h.title}</div>
                        <div className="text-xs text-graphite-500 dark:text-graphite-400">{h.desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
