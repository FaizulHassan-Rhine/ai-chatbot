import { getSiteUrl } from "@/lib/site";

/** https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots */
export default function robots() {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
