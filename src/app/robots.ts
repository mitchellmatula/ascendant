import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ascendant.app";
  
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/settings/",
          "/onboarding/",
          "/sign-in/",
          "/sign-up/",
          "/my-submissions/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
