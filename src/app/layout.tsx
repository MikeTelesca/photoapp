import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { UpdateBanner } from "@/components/pwa/update-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ATH AI Photo Editor",
    template: "%s · ATH AI Editor",
  },
  description: "AI-powered batch photo editing for real estate photographers. HDR merging, professional editing, instant delivery.",
  applicationName: "ATH AI Editor",
  keywords: ["real estate photography", "HDR", "AI photo editing", "MLS photos", "Gemini AI"],
  authors: [{ name: "ATH Media" }],
  creator: "ATH Media",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATH AI Editor",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app",
    title: "ATH AI Photo Editor",
    description: "AI-powered batch photo editing for real estate photographers.",
    siteName: "ATH AI Editor",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ATH AI Photo Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATH AI Photo Editor",
    description: "AI-powered batch photo editing for real estate.",
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
                  var theme = localStorage.getItem('theme') || 'system';
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
        <SpeedInsights />
        <Analytics />
        <InstallPrompt />
        <ServiceWorkerRegister />
        <UpdateBanner />
      </body>
    </html>
  );
}
