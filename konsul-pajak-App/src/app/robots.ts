import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/chat/", "/kalkulator/"],
      },
    ],
    sitemap: "https://tanyapajakai.com/sitemap.xml",
  };
}
