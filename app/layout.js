import './globals.css'
import { ThemeProvider } from '../components/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
})

export const metadata = {
  title: 'Chatbot App',
  description: 'Next.js app with Tailwind CSS and Lucide React icons',
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

