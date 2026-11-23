"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Users, X, Shield, Bot, MessageSquare } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { AvatarRing } from "./AvatarRing";
import { ChannelMemberSummary } from "../../types";
import { apiFetch } from "../../lib/api";

export function MembersPanel({ isMobileDrawer = false }: { isMobileDrawer?: boolean }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    activeMembers,
    activeChannel,
    activeConversation,
    isMembersPanelOpen,
    setMembersPanelOpen,
  } = useChatStore();

  if (!isMembersPanelOpen && !isMobileDrawer) return null;

  // Deduplicate members by user ID
  const uniqueMembersMap = new Map<string, ChannelMemberSummary>();
  activeMembers.forEach((m) => {
    if (!uniqueMembersMap.has(m.userId)) {
      uniqueMembersMap.set(m.userId, m);
    }
  });
  const members = Array.from(uniqueMembersMap.values());

  const onlineMembers = members.filter((m) => m.user.status === "online");
  const offlineMembers = members.filter((m) => m.user.status !== "online");

  const handleStartDm = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === user?.id) return;
    try {
      const res = await apiFetch<{ conversation: { id: string } }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      if (isMobileDrawer) setMembersPanelOpen(false);
      router.push(`/dm/${res.conversation.id}`);
    } catch (err) {
      console.error("Failed to start direct orbit:", err);
    }
  };

  return (
    <aside
      className={`glass-panel flex flex-col h-full overflow-hidden ${
        isMobileDrawer ? "w-full" : "w-[280px] shrink-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <h3 className="font-heading font-bold text-sm text-text">
            {activeChannel ? "Channel Crew" : "Orbital Partner"}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-muted font-medium">
            {members.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMembersPanelOpen(false)}
          className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Close Crew Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Online Crew */}
        <div>
          <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Online — {onlineMembers.length}
          </div>
          <div className="space-y-1">
            {onlineMembers.map((m) => {
              const isSelf = m.userId === user?.id;
              return (
                <button
                  type="button"
                  key={m.userId}
                  onClick={() => !isSelf && handleStartDm(m.userId)}
                  disabled={isSelf}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all group min-h-[44px] text-left ${
                    isSelf
                      ? "opacity-80 cursor-default bg-transparent"
                      : "hover:bg-surface-2 cursor-pointer"
                  }`}
                  title={isSelf ? "You" : `Direct Orbit with ${m.user.displayName}`}
                >
                  <AvatarRing avatar={m.user.avatar} status={m.user.status} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-text truncate">
                        {m.user.displayName}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-muted font-normal">(You)</span>
                      )}
                      {m.user.isBot && (
                        <span className="px-1.5 py-0.2 bg-accent/15 text-accent text-[9px] font-bold rounded-md flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                      {m.role === "owner" && (
                        <span title="Station Commander" className="text-accent">
                          <Shield className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {m.user.customStatus ? (
                      <p className="text-[11px] text-muted truncate">{m.user.customStatus}</p>
                    ) : (
                      <p className="text-[11px] text-muted truncate">@{m.user.username}</p>
                    )}
                  </div>
                  {!isSelf && (
                    <MessageSquare className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Offline Crew */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted inline-block" />
              Offline — {offlineMembers.length}
            </div>
            <div className="space-y-1">
              {offlineMembers.map((m) => {
                const isSelf = m.userId === user?.id;
                return (
                  <button
                    type="button"
                    key={m.userId}
                    onClick={() => !isSelf && handleStartDm(m.userId)}
                    disabled={isSelf}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all group min-h-[44px] text-left opacity-75 hover:opacity-100 ${
                      isSelf
                        ? "cursor-default bg-transparent"
                        : "hover:bg-surface-2 cursor-pointer"
                    }`}
                    title={isSelf ? "You" : `Direct Orbit with ${m.user.displayName}`}
                  >
                    <AvatarRing avatar={m.user.avatar} status={m.user.status} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-text truncate">
                          {m.user.displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-muted font-normal">(You)</span>
                        )}
                        {m.user.isBot && (
                          <span className="px-1.5 py-0.2 bg-surface text-muted text-[9px] font-bold rounded-md">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate">@{m.user.username}</p>
                    </div>
                    {!isSelf && (
                      <MessageSquare className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-opacity shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

