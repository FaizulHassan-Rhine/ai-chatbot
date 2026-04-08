"use client";

import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[min(100%,18rem)] lg:w-72 bg-muted/30 border-r border-border transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 pt-5 pb-3 border-b border-border/80 bg-card/50">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Workspace
                </p>
                <h2 className="text-sm font-semibold text-foreground mt-0.5">Conversations</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="lg:hidden h-8 w-8 shrink-0"
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          <div className="p-3">
            <Button
              onClick={onNewChat}
              className="w-full h-10 gap-2 rounded-lg text-sm font-medium shadow-none"
              size="default"
            >
              <Plus size={16} strokeWidth={2.5} />
              New chat
            </Button>
          </div>

          <Separator className="opacity-60" />

          <ScrollArea className="flex-1">
            {chats.length === 0 ? (
              <div className="px-4 py-8 text-muted-foreground text-center text-xs leading-relaxed max-w-[13rem] mx-auto">
                No conversations yet. Create one to keep history organized.
              </div>
            ) : (
              <div className="space-y-0.5 p-2 overflow-visible">
                {chats.map((chat) => {
                  const isSelected = currentChatId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      className={`group flex items-center gap-2 pr-1 py-2 rounded-lg cursor-pointer transition-colors min-w-0 ${
                        isSelected
                          ? "bg-background pl-2 border-l-[3px] border-l-primary text-foreground shadow-sm ring-1 ring-border/50"
                          : "pl-2.5 hover:bg-background/90 text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <MessageSquare size={15} className="shrink-0 opacity-80" />
                      <span className="flex-1 text-[13px] font-medium truncate min-w-0 text-left">
                        {chat.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 shrink-0 rounded-md ${
                          isSelected
                            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
