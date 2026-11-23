"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, MessageSquare, Sparkles, Plus, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { Sidebar } from "../components/layout/Sidebar";
import { MobileBottomNav } from "../components/layout/MobileBottomNav";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const { channels, conversations, setCreateChannelOpen, setCommandPaletteOpen } = useChatStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // On larger screens, auto-navigate to the first channel for convenience if available
  useEffect(() => {
    if (user && channels.length > 0 && typeof window !== "undefined") {
      if (window.innerWidth >= 1024) {
        router.push(`/c/${channels[0]!.id}`);
      }
    }
  }, [user, channels, router]);

  if (isLoading || !user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-dvh w-full max-w-[1800px] mx-auto p-2 md:p-3 flex justify-center gap-3 overflow-hidden">
      {/* Sidebar: 300px on desktop, full bleed list on mobile */}
      <Sidebar isMobileSheet={false} />

      {/* Main Content Area (Hidden on mobile when viewing list) */}
      <main className="hidden md:flex flex-1 glass-panel flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-accent/15 text-accent flex items-center justify-center text-3xl shadow-xl animate-pulse">
          🪐
        </div>

        <h2 className="font-heading font-black text-2xl text-text">
          OrbitChat Deep Space Relay
        </h2>

        <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
          Select a planet channel or direct orbit from the sidebar to establish communications, or
          query the orbital AI intelligence with <span className="font-mono text-accent">/help</span>.
        </p>

        <div className="pt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateChannelOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-accent text-accent-contrast font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Create Planet Channel
          </button>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text font-bold text-xs flex items-center gap-2 hover:bg-surface transition-all min-h-[44px]"
          >
            <Compass className="w-4 h-4 text-secondary" /> Explore Orbit (Ctrl+K)
          </button>
        </div>
      </main>

      {/* Mobile bottom nav on home */}
      <MobileBottomNav />
    </div>
  );
}

