import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/forgot", "/reset", "/status", "/whats-new", "/help"],
        disallow: ["/api/", "/admin/", "/dashboard", "/jobs/", "/clients/", "/review/", "/settings/", "/templates", "/presets", "/playground", "/billing", "/analytics", "/activity", "/search"],
      },
    ],
    sitemap: `${process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app"}/sitemap.xml`,
  };
}
