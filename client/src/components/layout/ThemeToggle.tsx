"use client";

import React, { useEffect } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAuthStore();

  useEffect(() => {
    const saved = localStorage.getItem("orbit_theme") as "system" | "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
    } else {
      setTheme("dark");
    }
  }, [setTheme]);

  return (
    <div className={`flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border ${compact ? "justify-center" : ""}`}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        title="Light theme"
        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center min-w-[32px] min-h-[32px] ${
          theme === "light"
            ? "bg-surface text-accent shadow-sm"
            : "text-muted hover:text-text"
        }`}
      >
        <Sun className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        title="Dark theme"
        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center min-w-[32px] min-h-[32px] ${
          theme === "dark"
            ? "bg-surface text-accent shadow-sm"
            : "text-muted hover:text-text"
        }`}
      >
        <Moon className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        title="System theme"
        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center min-w-[32px] min-h-[32px] ${
          theme === "system"
            ? "bg-surface text-accent shadow-sm"
            : "text-muted hover:text-text"
        }`}
      >
        <Laptop className="w-4 h-4" />
      </button>
    </div>
  );
}

