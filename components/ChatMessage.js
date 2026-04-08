"use client";

import { useState } from "react";
import { Bot, User, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "flex-row-reverse" : ""
      } mb-5 group`}
    >
      <Avatar className="h-9 w-9 ring-1 ring-border/60 shadow-sm">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-secondary/80"}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </AvatarFallback>
      </Avatar>

      <div
        className={`flex-1 max-w-[80%] ${
          isUser ? "text-right" : ""
        }`}
      >
        <Card
          className={`p-4 relative border ${
            isUser
              ? "bg-primary text-primary-foreground ml-auto border-transparent shadow-none"
              : "bg-card border-border/70 shadow-sm"
          }`}
        >
          {message.imageUrl && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.imageUrl}
                alt="Uploaded"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}

          {message.content && (
            <div className="max-w-none leading-relaxed text-[15px]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mt-2 mb-3 text-foreground">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold mt-2 mb-2 text-foreground">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mt-2 mb-2 text-foreground">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 text-foreground/95 break-words">{children}</p>
                  ),
                  ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-foreground/95 break-words">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-primary">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-500 break-all"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-emerald-600 dark:text-emerald-400 text-[13px]">
                        {children}
                      </code>
                    ) : (
                      <code className="block p-3 rounded-lg bg-muted text-[13px] overflow-x-auto border">
                        {children}
                      </code>
                    ),
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-xl border border-border/70">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-muted/70">{children}</thead>,
                  tr: ({ children }) => <tr className="border-b border-border/70">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
                  ),
                  td: ({ children }) => <td className="px-3 py-2 align-top text-foreground/95">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-4 border-primary/50 pl-3 text-foreground/80 italic">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {isStreaming && !isUser && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}

          {message.content && !isStreaming && !isUser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute top-2 right-2 h-7 w-7 opacity-70 hover:opacity-100 transition-opacity z-10"
              title={copied ? "Copied!" : "Copy message"}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
