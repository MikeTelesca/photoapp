import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RestartTourButton } from "@/components/help/restart-tour-button";

export default function HelpPage() {
  const faqs = [
    {
      q: "How does HDR merge work?",
      a: "When you upload bracketed photos (3 or 5 exposures per angle), our app sends ALL brackets to Google Gemini Pro Image. The AI merges them into a single HDR image — recovering bright detail from underexposed brackets and shadow detail from overexposed brackets — then applies your editing preset in the same pass. No separate enfuse step needed.",
    },
    {
      q: "What photo formats are supported?",
      a: "JPEG and PNG only. RAW formats (DNG, CR2, ARW, NEF, etc.) are not supported because the AI can't process them directly. Export to JPEG from your camera/Lightroom first.",
    },
    {
      q: "How long does enhancement take?",
      a: "Typically 15-30 seconds per photo when Gemini's API is responsive. The app cascades through 4 models (Nano Banana Pro 4K → Flash 4K → Flash 2K → 2.5 Flash) so you always get a result. A 50-photo job takes 15-25 minutes total.",
    },
    {
      q: "What does each preset do?",
      a: "Standard: balanced exposure correction + window pull. Bright & Airy: lighter, warmer tones. Luxury: rich contrast, magazine feel. MLS Standard: conservative MLS-compliant editing. Flambient: HDR + simulated flash fill (clean colors, low noise). You can edit any preset's prompt on the Presets page or directly in the review gallery.",
    },
    {
      q: "Can I customize the AI's instructions per photo?",
      a: "Yes — type custom instructions in the input box at the bottom of the review gallery (e.g. 'remove the car from the driveway'). Click Send & Regenerate. Custom instructions are saved per-photo and re-applied on subsequent regenerates.",
    },
    {
      q: "Why does the AI sometimes add fake content (fake clouds, fake grass)?",
      a: "Gemini is creative and tries to 'improve' photos. We've added strict 'preserve reality' rules to prompts, but if you see hallucinations, click Edit Prompt and add: 'DO NOT add or replace anything in the photo. Only adjust color/exposure.'",
    },
    {
      q: "What's the cost per photo?",
      a: "About $0.07 per merged HDR photo. A 50-photo property costs roughly $3.50. Compare to $0.40/photo with traditional editors. Set monthly limits on the Photographers page.",
    },
    {
      q: "How do I add a photographer?",
      a: "Go to Photographers → Invite New Photographer. Generate an invite link and send it to them. They click the link, set up their account, and can immediately start uploading jobs.",
    },
    {
      q: "What's the difference between approve, reject, and regenerate?",
      a: "Approve: final, photo will be in the download. Reject: skipped from download. Regenerate: re-runs AI (costs $0.07 each time). Use keyboard shortcuts: A=approve, R=reject, ←→=navigate.",
    },
    {
      q: "How does the twilight feature work?",
      a: "On exterior shots, click Twilight to convert daytime to dusk. Choose: Warm Dusk (golden hour), Blue Hour (cobalt sky + warm interior), or Deep Night (all lights on). Specify per-photo. Costs same as a regular enhancement.",
    },
    {
      q: "Can I re-edit photos after approving?",
      a: "Yes — change the preset or edit the prompt in the review gallery, then click Re-Enhance All. This resets all edited photos back to pending so they can be reprocessed.",
    },
    {
      q: "Where are the edited photos saved?",
      a: "All edited photos are uploaded to your Dropbox at /PhotoApp/edited/{address}_{jobId}/. Click 'Open Dropbox Folder' in the review gallery to access them. You can also download as a ZIP.",
    },
    {
      q: "What if a photo fails to enhance?",
      a: "After 5 failures the photo is automatically rejected. Click 'Retry Failed' in the gallery to retry all failed photos. Most failures are temporary Gemini API issues.",
    },
    {
      q: "How do I add my logo as a watermark?",
      a: "On the New Job page, fill in the Watermark field with text like '© 2026 Your Photography'. It's applied automatically when downloading photos.",
    },
    {
      q: "Why does the dashboard show jobs I didn't create?",
      a: "If you're an admin you see all jobs. Photographers only see their own. If you're seeing jobs that aren't yours and you're a photographer, contact your admin.",
    },
  ];

  return (
    <>
      <Topbar title="Help & FAQ" subtitle="Common questions and how things work" />
      <div className="p-6 max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <div className="p-5 space-y-3 text-sm">
            <div>
              <strong className="text-graphite-900 dark:text-white">1. Create a job</strong> — Click "New Job" and paste your Dropbox shared folder link (or upload files directly). Pick a preset.
            </div>
            <div>
              <strong className="text-graphite-900 dark:text-white">2. Click "Start Processing"</strong> — App pulls photos from Dropbox and groups them into bracket sets.
            </div>
            <div>
              <strong className="text-graphite-900 dark:text-white">3. Click "Enhance All"</strong> — AI processes each photo (HDR merge + color correction).
            </div>
            <div>
              <strong className="text-graphite-900 dark:text-white">4. Review & approve</strong> — Use A/R keys, navigate with arrows. Click Download when done.
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <div className="divide-y divide-graphite-100 dark:divide-graphite-800">
            {faqs.map((faq, i) => (
              <details key={i} className="px-5 py-4 group hover:bg-graphite-50 dark:hover:bg-graphite-800/30 transition-colors">
                <summary className="font-semibold text-graphite-900 dark:text-white text-sm cursor-pointer hover:text-cyan flex items-center justify-between list-none">
                  <span>{faq.q}</span>
                  <span className="text-graphite-400 dark:text-graphite-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="text-sm text-graphite-600 dark:text-graphite-300 mt-3 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between"><span>Approve current photo</span><kbd className="px-2 py-0.5 bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white rounded text-xs">A</kbd></div>
              <div className="flex justify-between"><span>Reject current photo</span><kbd className="px-2 py-0.5 bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white rounded text-xs">R</kbd></div>
              <div className="flex justify-between"><span>Next photo</span><kbd className="px-2 py-0.5 bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white rounded text-xs">→</kbd></div>
              <div className="flex justify-between"><span>Previous photo</span><kbd className="px-2 py-0.5 bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white rounded text-xs">←</kbd></div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need more help?</CardTitle>
          </CardHeader>
          <div className="p-5 text-sm text-graphite-600 dark:text-graphite-300">
            <p>Email <a href="mailto:support@athmedia.ca" className="text-cyan font-semibold">support@athmedia.ca</a> with screenshots of any issues.</p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
          </CardHeader>
          <div className="p-5">
            <p className="text-sm text-graphite-600 dark:text-graphite-300 mb-4">Restart the first-time user tour to see the workflow explained step-by-step.</p>
            <RestartTourButton />
          </div>
        </Card>
      </div>
    </>
  );
}
