"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Search,
  MessageCircle,
  Loader2,
  Users,
  Sparkles,
  Radio,
  ArrowRight,
} from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { AvatarRing } from "./AvatarRing";
import { apiFetch } from "../../lib/api";
import { UserSummary } from "../../types";

export function NewDmModal() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isNewDmOpen, setNewDmOpen, fetchConversations } = useChatStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingId, setIsStartingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewDmOpen) {
      setSearch("");
      setFilter("all");
      setIsLoading(true);
      setTimeout(() => inputRef.current?.focus(), 80);

      apiFetch<{ users: UserSummary[] }>("/api/users")
        .then((res) => {
          setUsers(res.users);
        })
        .catch((err) => {
          console.error("Failed to load users for DM:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isNewDmOpen]);

  if (!isNewDmOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (u.id === user?.id) return false;
    if (filter === "online" && u.status !== "online") return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.customStatus && u.customStatus.toLowerCase().includes(q))
    );
  });

  const handleStartDm = async (targetUserId: string) => {
    setIsStartingId(targetUserId);
    try {
      const res = await apiFetch<{ conversation: { id: string } }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      await fetchConversations();
      setNewDmOpen(false);
      router.push(`/dm/${res.conversation.id}`);
    } catch (err) {
      console.error("Failed to start DM:", err);
    } finally {
      setIsStartingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-text">
                Start Direct Orbit (1:1 Chat)
              </h2>
              <p className="text-[11px] text-muted">
                Connect directly with any crew member across the station
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNewDmOpen(false)}
            className="p-1 rounded-full text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filter Pills */}
        <div className="p-4 border-b border-border/60 space-y-3 bg-surface/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter crew by name, handle, or mission..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[28px] ${
                filter === "all"
                  ? "bg-accent text-accent-contrast shadow-sm"
                  : "bg-surface-2 text-muted hover:text-text"
              }`}
            >
              All Crew ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("online")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[28px] ${
                filter === "online"
                  ? "bg-accent text-accent-contrast shadow-sm"
                  : "bg-surface-2 text-muted hover:text-text"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              Online Now ({users.filter((u) => u.status === "online").length})
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted text-xs">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
              <span>Scanning orbital crew frequencies...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs space-y-1">
              <Users className="w-8 h-8 text-muted/50 mx-auto" />
              <p>No crew members matching "{search}".</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isStarting = isStartingId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleStartDm(u.id)}
                  disabled={isStarting}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-surface-2 border border-transparent hover:border-border transition-all text-left group min-h-[56px]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <AvatarRing avatar={u.avatar} status={u.status} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text truncate group-hover:text-accent transition-colors">
                          {u.displayName}
                        </span>
                        <span className="text-xs text-muted">@{u.username}</span>
                        {u.isBot && (
                          <span className="px-1.5 py-0.2 bg-accent/15 text-accent text-[9px] font-bold rounded-md">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate mt-0.5">
                        {u.customStatus ? u.customStatus : `Status: ${u.status}`}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isStarting ? (
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-surface-2 group-hover:bg-accent group-hover:text-accent-contrast text-muted text-xs font-bold transition-all flex items-center gap-1.5">
                        <span>Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-border/70 bg-surface/50 flex items-center justify-between text-xs text-muted">
          <span>Tip: You can also press <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-[10px]">Ctrl+K</kbd> anywhere</span>
          <button
            type="button"
            onClick={() => setNewDmOpen(false)}
            className="hover:text-text font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
