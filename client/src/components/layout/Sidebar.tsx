"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Hash,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  ChevronRight,
  LogOut,
  Users,
  Compass,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { BrandLogo } from "./BrandLogo";
import { AvatarRing } from "./AvatarRing";
import { ThemeToggle } from "./ThemeToggle";
import { formatTimeAgo } from "../../lib/utils";
import { apiFetch } from "../../lib/api";

export function Sidebar({ isMobileSheet = false }: { isMobileSheet?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, setIdentityModalOpen } = useAuthStore();
  const {
    channels,
    conversations,
    fetchConversations,
    setCommandPaletteOpen,
    setCreateChannelOpen,
    setNewDmOpen,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<"all" | "channels" | "dms">("all");

  const filteredChannels =
    activeTab === "dms" ? [] : channels;
  const filteredConversations =
    activeTab === "channels" ? [] : conversations;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleOpenOrbitBot = async () => {
    try {
      const res = await apiFetch<{ conversationId: string }>("/api/conversations/bot");
      await fetchConversations();
      router.push(`/dm/${res.conversationId}`);
    } catch (err) {
      console.error("Failed to open OrbitBot DM:", err);
    }
  };

  return (
    <aside
      className={`glass-panel flex flex-col h-full overflow-hidden w-full ${
        isMobileSheet ? "" : "md:w-[300px] md:shrink-0"
      }`}
    >
      {/* Top Header / Brand */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/70">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo size={32} />
          <div className="flex flex-col">
            <span className="font-heading font-black text-base tracking-wide text-text group-hover:text-accent transition-colors">
              OrbitChat
            </span>
            <span className="text-[10px] text-muted tracking-wider uppercase font-semibold">
              Deep Space Relay
            </span>
          </div>
        </Link>

        {/* Global Search Button */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 rounded-xl text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-border transition-all flex items-center gap-1.5 min-w-[40px] min-h-[40px] justify-center"
          title="Search (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] font-mono hidden md:inline text-muted bg-surface px-1 py-0.5 rounded border border-border">
            ⌘K
          </span>
        </button>
      </div>

      {/* Tabs Filter Bar: All / Planets / Orbits */}
      <div className="px-3 pt-3 pb-1">
        <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-2 border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`py-1.5 rounded-lg transition-colors text-center min-h-[32px] ${
              activeTab === "all"
                ? "bg-surface text-accent shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("channels")}
            className={`py-1.5 rounded-lg transition-colors text-center min-h-[32px] ${
              activeTab === "channels"
                ? "bg-surface text-accent shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Planets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dms")}
            className={`py-1.5 rounded-lg transition-colors text-center min-h-[32px] ${
              activeTab === "dms"
                ? "bg-surface text-accent shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Orbits
          </button>
        </div>
      </div>

      {/* OrbitBot AI 1-Click Copilot Launcher */}
      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={handleOpenOrbitBot}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-accent/20 via-surface-2 to-secondary/15 border border-accent/40 hover:border-accent text-left transition-all group min-h-[52px] shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent text-accent-contrast flex items-center justify-center shrink-0 shadow-md text-base">
              🤖
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-text group-hover:text-accent transition-colors">
                  OrbitBot AI
                </span>
                <span className="px-1.5 py-0.2 rounded bg-accent/20 text-accent font-bold text-[9px] uppercase tracking-wider">
                  Copilot
                </span>
              </div>
              <span className="text-[10px] text-muted truncate block">
                Instant AI chat & orbital assistance
              </span>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-accent shrink-0 animate-pulse group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Scrollable Channels & DMs List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Planet Channels Section */}
        {filteredChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-accent" />
                Planets ({filteredChannels.length})
              </span>
              <button
                type="button"
                onClick={() => setCreateChannelOpen(true)}
                className="p-1 rounded-lg text-muted hover:text-accent hover:bg-surface-2 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                title="Create Channel"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {filteredChannels.map((c) => {
                const isActive = pathname === `/c/${c.id}`;
                const unread = c.unreadCount || 0;
                const badge = unread > 99 ? "99+" : unread;

                return (
                  <Link
                    key={c.id}
                    href={`/c/${c.id}`}
                    className={`relative flex items-center justify-between p-2.5 rounded-xl transition-all group min-h-[56px] ${
                      isActive
                        ? "bg-surface-2 text-text font-bold"
                        : "text-text/90 hover:bg-surface-2/60"
                    }`}
                  >
                    {/* Selected accent indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-accent text-accent-contrast shadow-sm"
                            : "bg-surface-2 text-muted group-hover:text-accent"
                        }`}
                      >
                        <Hash className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold truncate text-text">
                            {c.name}
                          </span>
                          {c.lastMessage && (
                            <span className="text-[10px] text-muted shrink-0">
                              {formatTimeAgo(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">
                          {c.lastMessage
                            ? `${c.lastMessage.senderName}: ${c.lastMessage.content}`
                            : c.description || "No transmissions yet"}
                        </p>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent text-accent-contrast shrink-0 shadow-sm animate-pulse">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 1:1 Direct Orbits Section */}
        {(filteredConversations.length > 0 || activeTab === "dms") && (
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-secondary" />
                Direct Orbits ({filteredConversations.length})
              </span>
              <button
                type="button"
                onClick={() => setNewDmOpen(true)}
                className="p-1 rounded-lg text-muted hover:text-accent hover:bg-surface-2 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                title="Start Direct Orbit (New 1:1 Chat)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="p-3 rounded-xl bg-surface-2/60 border border-border/50 text-center text-xs text-muted">
                <p>No active 1:1 orbits yet.</p>
                <button
                  type="button"
                  onClick={() => setNewDmOpen(true)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-surface text-accent font-semibold hover:bg-surface-2 transition-colors inline-flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3 h-3" /> Start Direct Orbit
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((dm) => {
                  const isActive = pathname === `/dm/${dm.id}`;
                  const unread = dm.unreadCount || 0;
                  const badge = unread > 99 ? "99+" : unread;

                  return (
                    <Link
                      key={dm.id}
                      href={`/dm/${dm.id}`}
                      className={`relative flex items-center justify-between p-2.5 rounded-xl transition-all group min-h-[56px] ${
                        isActive
                          ? "bg-surface-2 text-text font-bold"
                          : "text-text/90 hover:bg-surface-2/60"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent" />
                      )}

                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                        <AvatarRing
                          avatar={dm.otherUser.avatar}
                          status={dm.otherUser.status}
                          size={36}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-semibold truncate text-text">
                              {dm.otherUser.displayName}
                            </span>
                            {dm.lastMessage && (
                              <span className="text-[10px] text-muted shrink-0">
                                {formatTimeAgo(dm.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted truncate">
                            {dm.lastMessage ? dm.lastMessage.content : dm.otherUser.customStatus || "Idle in orbit"}
                          </p>
                        </div>
                      </div>

                      {unread > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent text-accent-contrast shrink-0 shadow-sm animate-pulse">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / User Profile & Theme Toggle */}
      <div className="p-3 border-t border-border/70 bg-surface/50 space-y-2 pb-20 md:pb-3">
        {/* User Card with Identity Trigger */}
        {user && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface-2 border border-border">
            <button
              type="button"
              onClick={() => setIdentityModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity"
              title="Edit Orbital Identity"
            >
              <AvatarRing
                avatar={user.avatar}
                status={user.status}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-text block truncate">
                  {user.displayName}
                </span>
                <span className="text-[10px] text-muted block truncate">
                  {user.customStatus ? user.customStatus : `@${user.username}`}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-surface transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0"
              title="Disconnect / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Theme Toggle in Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider pl-1">
            Display Mode
          </span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

