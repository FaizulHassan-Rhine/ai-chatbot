/** App name and SEO copy — single source for branding. */
export const SITE_NAME = "Hermes AI";
export const SITE_TAGLINE =
  "AI assistant with streaming replies, live web grounding, knowledge base (RAG), and multiple free models.";
export const SITE_DESCRIPTION = `${SITE_NAME} — ${SITE_TAGLINE}`;

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
