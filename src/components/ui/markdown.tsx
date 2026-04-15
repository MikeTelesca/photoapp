"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-graphite
                    prose-p:my-1 prose-ul:my-1 prose-li:my-0
                    prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                    prose-a:text-cyan prose-a:no-underline hover:prose-a:underline
                    text-sm text-graphite-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
