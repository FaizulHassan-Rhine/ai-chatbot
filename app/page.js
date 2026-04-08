import { MessageCircle, Bot, ArrowRight, Sparkles, Database, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 pr-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="w-12 h-12 text-primary" />
              <h1 className="text-5xl font-bold">{SITE_NAME}</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {SITE_TAGLINE}
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/chat">
                  Start Chatting
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/knowledge">
                  Knowledge Base
                </Link>
              </Button>
            </div>
          </div>

          <Card className="mb-12">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6" />
                <CardTitle>Chat Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 h-96 overflow-y-auto">
                <div className="flex items-start gap-3">
                  <div className="bg-secondary p-2 rounded-full">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="bg-muted rounded-lg p-3">
                      Hello! How can I help you today?
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="bg-primary p-2 rounded-full">
                    <MessageCircle className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="bg-primary text-primary-foreground rounded-lg p-3 text-right">
                      This is a sample message from the user!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Real-time Streaming</CardTitle>
                <CardDescription>
                  Watch responses stream in real-time like ChatGPT
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>
                  RAG-powered responses using your custom knowledge
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Multiple AI Models</CardTitle>
                <CardDescription>
                  Choose Gemini, OpenRouter free models, and more
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
