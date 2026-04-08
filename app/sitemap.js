import { getSiteUrl } from "@/lib/site";

/** https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap */
export default function sitemap() {
  const base = getSiteUrl().replace(/\/$/, "");
  const now = new Date();
  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/chat`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/knowledge`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
