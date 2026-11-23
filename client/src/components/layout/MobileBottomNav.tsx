"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, User, Sparkles } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { apiFetch } from "../../lib/api";

export function MobileBottomNav({
  activeTab = "chats",
  onTabChange,
}: {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const router = useRouter();
  const { setCommandPaletteOpen, unreadSummary, fetchConversations } = useChatStore();
  const { setIdentityModalOpen } = useAuthStore();

  const totalUnread = unreadSummary.totalUnread || 0;
  const badge = totalUnread > 99 ? "99+" : totalUnread;

  const handleOpenBot = async () => {
    try {
      const res = await apiFetch<{ conversationId: string }>("/api/conversations/bot");
      await fetchConversations();
      router.push(`/dm/${res.conversationId}`);
    } catch (err) {
      console.error("Failed to open OrbitBot DM from mobile nav:", err);
    }
  };

  return (
    <nav className="glass-panel fixed bottom-3 left-3 right-3 z-30 flex items-center justify-around py-2 px-3 border border-border shadow-xl md:hidden max-h-[56px] [@media(max-height:500px)]:hidden">
      <Link
        href="/"
        className="flex flex-col items-center gap-1 text-muted hover:text-accent transition-colors relative min-w-[50px] min-h-[44px] justify-center"
      >
        <MessageSquare className="w-5 h-5 text-accent" />
        <span className="text-[10px] font-semibold text-text">Chats</span>
        {totalUnread > 0 && (
          <span className="absolute top-1 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-accent text-accent-contrast">
            {badge}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={handleOpenBot}
        className="flex flex-col items-center gap-1 text-accent hover:text-accent transition-colors min-w-[50px] min-h-[44px] justify-center group"
      >
        <span className="text-base group-hover:scale-110 transition-transform">🤖</span>
        <span className="text-[10px] font-bold text-accent">OrbitBot</span>
      </button>

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-1 text-muted hover:text-accent transition-colors min-w-[50px] min-h-[44px] justify-center"
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] font-semibold">Search</span>
      </button>

      <button
        type="button"
        onClick={() => setIdentityModalOpen(true)}
        className="flex flex-col items-center gap-1 text-muted hover:text-accent transition-colors min-w-[50px] min-h-[44px] justify-center"
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-semibold">Profile</span>
      </button>
    </nav>
  );
}

