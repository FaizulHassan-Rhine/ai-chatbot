"use client";

import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Sidebar({ 
  chats, 
  currentChatId, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat,
  isOpen,
  onToggle 
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-80  bg-card border-r transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <Card className="rounded-none border-x-0 border-t-0 border-b">
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat History</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="lg:hidden"
              >
                <X size={20} />
              </Button>
            </div>
          </Card>

          <div className="p-4">
            <Button onClick={onNewChat} className="w-full gap-2">
              <Plus size={18} />
              New Chat
            </Button>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
            {chats.length === 0 ? (
              <div className="p-4 text-muted-foreground text-center text-sm">
                No chats yet. Start a new conversation!
              </div>
            ) : (
              <div className="space-y-1 p-2 overflow-visible">
                {chats.map((chat) => {
                  const isSelected = currentChatId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors min-w-0 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="flex-1 text-sm truncate min-w-0">
                        {chat.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 shrink-0 rounded-md flex-shrink-0 ${
                          isSelected
                            ? "text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                            : "text-red-500 hover:bg-red-500/10 hover:text-red-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onDeleteChat) {
                            onDeleteChat(chat.id);
                          }
                        }}
                        title="Delete chat"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
