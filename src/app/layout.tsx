import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "BatchBase — AI Photo Workflow",
    template: "%s · BatchBase",
  },
  description: "Drop bracketed photos. Get MLS-ready edits in minutes. AI-powered batch photo editing for real estate photographers.",
  applicationName: "BatchBase",
  keywords: ["real estate photography", "HDR", "AI photo editing", "MLS photos", "batch editing", "BatchBase"],
  authors: [{ name: "BatchBase" }],
  creator: "BatchBase",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BatchBase",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || "https://batchbase.io",
    title: "BatchBase — AI Photo Workflow",
    description: "Drop bracketed photos. Get MLS-ready edits in minutes.",
    siteName: "BatchBase",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "BatchBase — AI Photo Workflow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BatchBase — AI Photo Workflow",
    description: "Drop bracketed photos. Get MLS-ready edits in minutes.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0891B2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
