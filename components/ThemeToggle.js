"use client";

import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const pathname = usePathname();
  const hideFloatingOnChat = pathname === "/chat";

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    if (hideFloatingOnChat) return null;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full"
        disabled
      >
        <Moon className="h-5 w-5" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  if (hideFloatingOnChat) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-[100] h-10 w-10 rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

