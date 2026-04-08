import './globals.css'
import { ThemeProvider } from '../components/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getSiteUrl } from '@/lib/site'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
})

const siteUrl = getSiteUrl()

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hermes AI",
    template: "%s | Hermes AI",
  },
  description:
    "Hermes AI — AI assistant with streaming chat, live web search, RAG knowledge base, and multiple models. Free-tier friendly.",
  keywords: [
    "Hermes AI",
    "AI chat",
    "AI assistant",
    "chatbot",
    "RAG",
    "knowledge base",
    "OpenRouter",
    "Gemini",
    "streaming AI",
  ],
  authors: [{ name: "Hermes AI" }],
  creator: "Hermes AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Hermes AI",
    title: "Hermes AI",
    description:
      "AI assistant with streaming replies, live web grounding, and a personal knowledge base.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hermes AI",
    description:
      "AI assistant with streaming chat, live web search, and RAG knowledge base.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={plusJakartaSans.className}>
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

