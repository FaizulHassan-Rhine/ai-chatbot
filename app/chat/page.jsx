"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Send, Paperclip, Settings, Bot, Menu, X } from "lucide-react";
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

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [useRAG, setUseRAG] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      loadChat(currentChatId);
    } else {
      setMessages([
        { role: "assistant", content: "Hi! I'm your AI assistant. How can I help you today?" }
      ]);
    }
  }, [currentChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      const data = await res.json();
      // Ensure data is an array, handle errors gracefully
      if (Array.isArray(data)) {
        setChats(data);
      } else if (data.error) {
        console.error("API error:", data.error);
        setChats([]); // Set empty array on error
      } else {
        setChats([]); // Fallback to empty array
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]); // Set empty array on error
    }
  };

  const loadChat = async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      const data = await res.json();
      // Ensure data has messages array
      if (data && Array.isArray(data.messages)) {
        setMessages(
          data.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            imageUrl: msg.imageUrl,
          }))
        );
      } else {
        console.error("Invalid chat data:", data);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      setMessages([]);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const newChat = await res.json();
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      setChats(chats.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !uploadedImage) return;

    const userMessage = {
      role: "user",
      content: input,
      imageUrl: uploadedImage,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setUploadedImage(null);
    setLoading(true);
    setStreamingText("");

    let chatId = currentChatId;
    if (!chatId) {
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.slice(0, 50) || "New Chat" }),
        });
        const newChat = await res.json();
        chatId = newChat.id;
        setCurrentChatId(chatId);
        setChats([newChat, ...chats]);
      } catch (error) {
        console.error("Error creating chat:", error);
      }
    }

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          chatId: chatId,
          modelId: selectedModel,
          useRAG: useRAG,
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
      } else {
        throw new Error("No response received from AI");
      }
      setStreamingText("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Sorry, I encountered an error: ${error.message}. Please check your API keys in the .env file.` },
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

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createNewChat}
        onSelectChat={setCurrentChatId}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col">
        <Card className="rounded-none border-x-0 border-t-0 border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">AI Chatbot</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 pr-16">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings size={16} />
                    <span className="hidden sm:inline">{AI_MODELS[selectedModel]?.name || "Select Model"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>AI Models</DropdownMenuLabel>
                  <Separator />
                  {Object.values(AI_MODELS).map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={selectedModel === model.id ? "bg-accent" : ""}
                    >
                      {model.name}
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
            </div>
          </div>
        </Card>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {uploadedImage && (
          <Card className="mx-4 mb-2 p-3">
            <div className="flex items-center gap-2">
              {uploadedImage.startsWith("data:") ? (
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <Image
                  src={uploadedImage}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadedImage(null)}
                className="text-destructive"
              >
                Remove
              </Button>
            </div>
          </Card>
        )}

        <Card className="rounded-none border-x-0 border-b-0 border-t m-4">
          <div
            {...getRootProps()}
            className={`p-4 ${isDragActive ? "border-2 border-primary rounded-lg" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
              >
                <Paperclip size={20} />
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
                placeholder="Type your message... (Shift+Enter for new line)"
                className="min-h-[60px] max-h-[200px] resize-none"
                rows={1}
              />

              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sendMessage();
                }}
                disabled={loading || (!input.trim() && !uploadedImage)}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                <Send size={20} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
