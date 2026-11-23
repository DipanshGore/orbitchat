"use client";

import React from "react";
import Link from "next/link";
import {
  Hash,
  ArrowLeft,
  Users,
  Search,
  Sparkles,
  Shield,
  Bot,
  Radio,
} from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { AvatarRing } from "./AvatarRing";

export function Navbar({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) {
  const {
    activeChatType,
    activeChannel,
    activeConversation,
    isMembersPanelOpen,
    setMembersPanelOpen,
    setCommandPaletteOpen,
    sendMessage,
  } = useChatStore();
  const { setIdentityModalOpen } = useAuthStore();

  const title =
    activeChatType === "channel"
      ? activeChannel?.name || "Loading Planet..."
      : activeConversation?.otherUser.displayName || "Direct Orbit";

  const subtitle =
    activeChatType === "channel"
      ? activeChannel?.description || "Orbital Channel"
      : activeConversation?.otherUser.customStatus ||
        `Status: ${activeConversation?.otherUser.status || "offline"}`;

  return (
    <header className="glass-panel flex items-center justify-between px-4 py-2.5 h-14 shrink-0 border-b border-border/70 z-20">
      {/* Left: Back / Sidebar toggle */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/"
          className="md:hidden p-1.5 rounded-xl text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Back to Station Hub"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {activeChatType === "channel" ? (
          <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4" />
          </div>
        ) : activeConversation ? (
          <AvatarRing
            avatar={activeConversation.otherUser.avatar}
            status={activeConversation.otherUser.status}
            size={32}
          />
        ) : (
          <div className="w-8 h-8 rounded-xl bg-surface-2 text-muted flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-heading font-bold text-sm text-text truncate max-w-[200px] sm:max-w-md">
              {title}
            </h1>
            {activeConversation?.otherUser.isBot && (
              <span className="px-1.5 py-0.2 bg-accent/15 text-accent text-[9px] font-bold rounded-md flex items-center gap-0.5">
                <Bot className="w-2.5 h-2.5" /> AI
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted truncate max-w-[180px] sm:max-w-md">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeChatType === "dm" && activeConversation && (
          <button
            type="button"
            onClick={() =>
              sendMessage(
                `👋 Waved hello to ${activeConversation.otherUser.displayName}!`
              )
            }
            className="px-2.5 py-1.5 rounded-xl bg-accent/10 hover:bg-accent hover:text-accent-contrast text-accent font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[36px]"
            title={`Send a wave to ${activeConversation.otherUser.displayName}`}
          >
            <span>👋</span>
            <span className="hidden sm:inline">Wave</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 rounded-xl text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          title="Search Orbit (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setMembersPanelOpen(!isMembersPanelOpen)}
          className={`p-2 rounded-xl transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
            isMembersPanelOpen
              ? "bg-accent/15 text-accent"
              : "text-muted hover:text-text hover:bg-surface-2"
          }`}
          title="Toggle Crew Members Panel"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

