"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Send, Plus, Settings, Bot, Menu, X, Download, Globe, Moon, Sun, Mic, Sparkles } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import { AI_MODELS } from "@/lib/ai-models";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getAllChats,
  getChatById,
  createChat,
  updateChat,
  deleteChat,
  getMessagesByChatId,
  createMessage,
  searchKnowledge,
} from "@/lib/indexeddb";
import { useTheme } from "@/components/ThemeProvider";
import { SITE_NAME } from "@/lib/site";
import { Eye } from "lucide-react";

const DEFAULT_GREETING = `Hi! I'm ${SITE_NAME}. How can I help you today?`;

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [selectedModel, setSelectedModel] = useState("openrouter-gpt-oss-120b");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [useRAG, setUseRAG] = useState(false);
  const [useWeb, setUseWeb] = useState(true);
  const messagesEndRef = useRef(null);
  const { theme, toggleTheme, mounted: themeMounted } = useTheme();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      loadChat(currentChatId);
    } else {
      setMessages([
        { role: "assistant", content: DEFAULT_GREETING }
      ]);
    }
  }, [currentChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const fetchChats = async () => {
    try {
      const data = await getAllChats();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]);
    }
  };

  const loadChat = async (chatId) => {
    try {
      const messages = await getMessagesByChatId(chatId);
      setMessages(
        messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          imageUrl: msg.imageUrl,
        }))
      );
    } catch (error) {
      console.error("Error loading chat:", error);
      setMessages([]);
    }
  };

  // Helper function to extract first 4-5 words from text
  const getChatTitleFromMessage = (text) => {
    if (!text || !text.trim()) return "New Chat";
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = Math.min(words.length, 5); // Get first 5 words or less
    const title = words.slice(0, wordCount).join(" ");
    return title || "New Chat";
  };

  const createNewChat = async () => {
    try {
      const newChat = await createChat("New Chat");
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const deleteChatHandler = async (chatId) => {
    if (!chatId) {
      console.error("No chat ID provided for deletion");
      return;
    }
    
    try {
      console.log("Deleting chat:", chatId);
      await deleteChat(chatId);
      console.log("Chat deleted successfully");
      
      // Update UI optimistically
      const updatedChats = chats.filter((c) => c.id !== chatId);
      setChats(updatedChats);
      
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([
          { role: "assistant", content: DEFAULT_GREETING }
        ]);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert(`Failed to delete chat: ${error.message || "Unknown error"}`);
    }
  };

  const downloadChat = () => {
    if (!currentChatId || messages.length === 0) {
      alert("No chat to download. Please select a chat with messages.");
      return;
    }

    try {
      // Get chat title
      const currentChat = chats.find((c) => c.id === currentChatId);
      const chatTitle = currentChat?.title || "Chat Conversation";
      
      // Format messages for export
      const formattedMessages = messages
        .map((msg, index) => {
          const role = msg.role === "user" ? "User" : "Assistant";
          const content = msg.content || "";
          return `${role}:\n${content}\n`;
        })
        .join("\n---\n\n");

      // Create file content
      const fileContent = `Chat: ${chatTitle}\nDate: ${new Date().toLocaleString()}\n\n${"=".repeat(50)}\n\n${formattedMessages}`;

      // Create and download file
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chatTitle.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading chat:", error);
      alert("Failed to download chat. Please try again.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !uploadedImage) return;

    const userMessage = {
      role: "user",
      content: input,
      imageUrl: uploadedImage,
    };

    const baseMessages =
      !currentChatId &&
      messages.length === 1 &&
      messages[0]?.role === "assistant" &&
      messages[0]?.content === DEFAULT_GREETING
        ? []
        : messages;

    const newMessages = [...baseMessages, userMessage];
    setMessages(newMessages);
    setInput("");
    setUploadedImage(null);
    setLoading(true);
    setStreamingText("");

    let chatId = currentChatId;
    if (!chatId) {
      try {
        // Use first 4-5 words from the message as title
        const chatTitle = getChatTitleFromMessage(input);
        const newChat = await createChat(chatTitle);
        chatId = newChat.id;
        setCurrentChatId(chatId);
        setChats([newChat, ...chats]);
      } catch (error) {
        console.error("Error creating chat:", error);
      }
    } else {
      // Update chat title if it's still "New Chat" and this is the first user message
      try {
        const currentChat = chats.find((c) => c.id === chatId);
        if (currentChat && (currentChat.title === "New Chat" || !currentChat.title.trim())) {
          const chatTitle = getChatTitleFromMessage(input);
          if (chatTitle !== "New Chat") {
            await updateChat(chatId, { title: chatTitle });
            // Update the chat in the local state
            setChats(chats.map((c) => 
              c.id === chatId ? { ...c, title: chatTitle } : c
            ));
          }
        }
      } catch (error) {
        console.error("Error updating chat title:", error);
      }
    }

    // Save user message to IndexedDB
    if (chatId) {
      try {
        await createMessage({
          role: "user",
          content: input,
          imageUrl: uploadedImage,
          chatId: chatId,
        });
      } catch (error) {
        console.error("Error saving user message:", error);
      }
    }

    // Get RAG context if enabled
    let ragContext = "";
    if (useRAG && chatId) {
      try {
        const results = await searchKnowledge(input);
        if (results && results.length > 0) {
          const context = results
            .map((r) => `Title: ${r.title}\nContent: ${r.content}`)
            .join("\n\n");
          ragContext = `\n\nRelevant knowledge base context:\n${context}\n\nUse this context to provide accurate information.`;
        }
      } catch (error) {
        console.error("Error getting RAG context:", error);
      }
    }

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          modelId: selectedModel,
          ragContext: ragContext, // Pass RAG context directly
          useWeb: useWeb,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body received");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() && line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.text) {
                  assistantMessage += data.text;
                  setStreamingText(assistantMessage);
                }
              }
            } catch (e) {
              if (e.message && e.message.includes("error")) {
                throw e;
              }
            }
          }
        }
      }

      if (assistantMessage) {
        setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
        // Save assistant message to IndexedDB
        if (chatId) {
          try {
            await createMessage({
              role: "assistant",
              content: assistantMessage,
              chatId: chatId,
            });
          } catch (error) {
            console.error("Error saving assistant message:", error);
          }
        }
      } else {
        throw new Error("No response received from AI");
      }
      setStreamingText("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Sorry, I encountered an error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  };

  const handleFileUpload = async (files) => {
    const file = files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setUploadedImage(data.url);

        // Auto-switch to a vision-capable model if the current one doesn't support images.
        setSelectedModel((prev) => {
          if (AI_MODELS[prev]?.supportsVision) return prev;
          return "openrouter-free-vision";
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    } else {
      alert("File upload for analysis coming soon!");
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
      "text/*": [".txt"],
    },
    multiple: false,
    noClick: true,
  });

  const DEFAULT_TEXT_MODEL_ID = "openrouter-gpt-oss-120b";
  const modelList = Object.values(AI_MODELS);
  const visionModels = modelList.filter((m) => m.supportsVision);
  const recommendedTextModelIds = [
    DEFAULT_TEXT_MODEL_ID,
    "openrouter-gpt-oss-20b",
    "openrouter-qwen-coder",
  ];
  const recommendedTextModels = recommendedTextModelIds
    .map((id) => AI_MODELS[id])
    .filter(Boolean);
  const otherTextModels = modelList.filter(
    (m) => !m.supportsVision && !recommendedTextModelIds.includes(m.id)
  );
  const hasUserMessage = messages.some((m) => m.role === "user");
  const showMainPromptUi = !currentChatId && !hasUserMessage;
  const hour = new Date().getHours();
  const greetingText =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createNewChat}
        onSelectChat={setCurrentChatId}
        onDeleteChat={deleteChatHandler}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 border-b border-border/80 bg-card/95 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden h-9 w-9 shrink-0"
              >
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </Button>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">
                    {SITE_NAME}
                  </h1>
                  <p className="text-[11px] text-muted-foreground mt-1 hidden sm:block truncate">
                    Streaming chat and knowledge
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {currentChatId && messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadChat}
                  className="gap-1.5 shrink-0 h-9 px-2.5 sm:px-3 text-xs font-medium"
                  title="Download chat"
                >
                  <Download size={15} className="shrink-0" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
              <Button
                type="button"
                variant={useWeb ? "default" : "outline"}
                size="sm"
                className="gap-1.5 h-9 px-2.5 sm:px-3 shrink-0 text-xs font-medium"
                onClick={() => setUseWeb(!useWeb)}
                title="Use live web search for fresher answers"
              >
                <Globe size={15} className="shrink-0 opacity-90" />
                <span className="hidden sm:inline">Web</span>
                <span
                  className={`hidden sm:inline text-[10px] font-semibold tabular-nums ${useWeb ? "text-primary-foreground/90" : "text-muted-foreground"}`}
                >
                  {useWeb ? "On" : "Off"}
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 max-w-[min(100%,14rem)] sm:max-w-[16rem] px-2.5 sm:px-3 text-xs font-medium">
                    <Settings size={15} className="shrink-0 opacity-80" />
                    <span className="truncate">{AI_MODELS[selectedModel]?.name || "Model"}</span>
                    {AI_MODELS[selectedModel]?.supportsVision && (
                      <Eye size={12} className="shrink-0 text-primary/70" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(100vw-2rem,20rem)]">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Recommended text models
                  </DropdownMenuLabel>
                  <Separator />
                  {recommendedTextModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`flex items-center justify-between gap-2 ${selectedModel === model.id ? "bg-accent" : ""}`}
                    >
                      <span className="truncate">{model.name}</span>
                      {model.id === DEFAULT_TEXT_MODEL_ID && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                          Default
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Vision models
                  </DropdownMenuLabel>
                  <Separator />
                  {visionModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`flex items-center justify-between gap-2 ${selectedModel === model.id ? "bg-accent" : ""}`}
                    >
                      <span className="truncate">{model.name}</span>
                      <span className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-primary/80 bg-primary/10 rounded px-1.5 py-0.5">
                        <Eye size={10} />Vision
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground mt-1">
                    Other text models
                  </DropdownMenuLabel>
                  <Separator />
                  {otherTextModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={selectedModel === model.id ? "bg-accent" : ""}
                    >
                      <span className="truncate">{model.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <Separator />
                  <DropdownMenuItem
                    onClick={() => setUseRAG(!useRAG)}
                    className="flex items-center justify-between"
                  >
                    <span>Enable RAG</span>
                    <Badge variant={useRAG ? "default" : "outline"}>
                      {useRAG ? "ON" : "OFF"}
                    </Badge>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {themeMounted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={toggleTheme}
                  title={theme === "dark" ? "Light mode" : "Dark mode"}
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </Button>
              )}
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 bg-muted/15">
          {showMainPromptUi ? (
            <div className="h-[calc(100vh-3.5rem)] w-full flex items-center justify-center px-4">
              <div className="w-full max-w-2xl -mt-8">
                <h2 className="text-center text-4xl md:text-5xl tracking-tight font-medium text-foreground mb-6">
                  <Sparkles className="inline h-5 w-5 mr-2 text-primary/80" />
                  {greetingText}
                </h2>
                <div
                  {...getRootProps()}
                  className={`rounded-3xl border border-border/80 bg-background shadow-sm transition-colors ${
                    isDragActive ? "ring-2 ring-primary/30 border-primary/40 bg-primary/[0.03]" : ""
                  }`}
                >
                  <input {...getInputProps()} />
                  {uploadedImage && (
                    <div className="px-3 pt-3">
                      <div className="relative h-[110px] w-[110px] overflow-hidden rounded-2xl border border-border/70">
                        {uploadedImage.startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={uploadedImage}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image
                            src={uploadedImage}
                            alt="Preview"
                            width={110}
                            height={110}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedImage(null);
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-end gap-1.5 p-2.5 md:p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }}
                    >
                      <Plus size={20} />
                    </Button>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type / for skills"
                      className="min-h-[44px] max-h-[200px] resize-none border-0 focus-visible:ring-0 bg-transparent shadow-none text-sm placeholder:text-muted-foreground/70 py-2.5"
                      rows={1}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                      title="Voice input coming soon"
                    >
                      <Mic size={17} />
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendMessage();
                      }}
                      disabled={loading || (!input.trim() && !uploadedImage)}
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                    >
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {["Code", "Learn", "Write", "Life stuff"].map((label) => (
                    <span key={label} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 py-6 md:px-8 md:py-8 space-y-1">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}

              {streamingText && (
                <ChatMessage
                  message={{ role: "assistant", content: streamingText }}
                  isStreaming={true}
                />
              )}

              {loading && !streamingText && (
                <div className="flex items-center gap-2 text-muted-foreground pl-12">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {!showMainPromptUi && (
          <div className="shrink-0 border-t border-border/80 bg-card/80 backdrop-blur-sm px-3 py-3 md:px-5 md:py-4">
            <div
              {...getRootProps()}
              className={`rounded-3xl border border-border/80 bg-background shadow-sm transition-colors ${
                isDragActive ? "ring-2 ring-primary/30 border-primary/40 bg-primary/[0.03]" : ""
              }`}
            >
              <input {...getInputProps()} />
              {uploadedImage && (
                <div className="px-3 pt-3">
                  <div className="relative h-[110px] w-[110px] overflow-hidden rounded-2xl border border-border/70">
                    {uploadedImage.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uploadedImage}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={uploadedImage}
                        alt="Preview"
                        width={110}
                        height={110}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage(null);
                      }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-1.5 p-2.5 md:p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                >
                  <Plus size={20} />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message…"
                  className="min-h-[44px] max-h-[200px] resize-none border-0 focus-visible:ring-0 bg-transparent shadow-none text-sm placeholder:text-muted-foreground/70 py-2.5"
                  rows={1}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  title="Voice input coming soon"
                >
                  <Mic size={17} />
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage();
                  }}
                  disabled={loading || (!input.trim() && !uploadedImage)}
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
