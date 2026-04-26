import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/canvas", "/verify-email"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
