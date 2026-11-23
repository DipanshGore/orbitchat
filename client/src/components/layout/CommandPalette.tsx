"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Hash, User, MessageSquare, X, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { apiFetch } from "../../lib/api";
import { AvatarRing } from "./AvatarRing";

interface SearchResults {
  channels: { id: string; name: string; description: string | null; isPrivate: boolean }[];
  people: { id: string; username: string; displayName: string; avatar: string; status: any; customStatus: string | null; isBot: boolean }[];
  messages: { id: string; content: string; channelId: string | null; conversationId: string | null; channelName: string | null; senderName: string; createdAt: string }[];
}

export function CommandPalette() {
  const router = useRouter();
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useChatStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ channels: [], people: [], messages: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === "Escape" && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Focus input when open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setResults({ channels: [], people: [], messages: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults({ channels: [], people: [], messages: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<SearchResults>(`/api/users/search?q=${encodeURIComponent(query)}`);
        setResults(res);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isCommandPaletteOpen) return null;

  const handleSelectChannel = (channelId: string) => {
    setCommandPaletteOpen(false);
    router.push(`/c/${channelId}`);
  };

  const handleSelectPerson = async (targetUserId: string) => {
    try {
      const res = await apiFetch<{ conversation: { id: string } }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      setCommandPaletteOpen(false);
      router.push(`/dm/${res.conversation.id}`);
    } catch (err) {
      console.error("Failed to open DM:", err);
    }
  };

  const handleSelectMessage = (msg: SearchResults["messages"][0]) => {
    setCommandPaletteOpen(false);
    if (msg.channelId) {
      router.push(`/c/${msg.channelId}`);
    } else if (msg.conversationId) {
      router.push(`/dm/${msg.conversationId}`);
    }
  };

  const hasResults =
    results.channels.length > 0 || results.people.length > 0 || results.messages.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="glass-panel w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3 sm:px-4 py-3 border-b border-border/70 gap-2 sm:gap-3">
          {/* Mobile Back Button (always visible on mobile devices to easily exit) */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1.5 -ml-1 text-muted hover:text-text hover:bg-surface-2 rounded-xl transition-colors md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
            title="Back / Close search"
            aria-label="Back / Close search"
          >
            <ArrowLeft className="w-5 h-5 text-accent" />
          </button>

          <Search className="w-5 h-5 text-muted shrink-0 hidden md:block" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search planets, crew members, transmissions... (Ctrl+K)"
            className="flex-1 bg-transparent border-none text-text text-sm placeholder:text-muted focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted hover:text-text p-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-2"
              title="Clear search text"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Desktop ESC Badge */}
              <kbd className="hidden md:inline-block px-2 py-0.5 text-[10px] font-mono bg-surface-2 border border-border rounded text-muted">
                ESC
              </kbd>
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="md:hidden text-muted hover:text-text p-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-surface-2"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!query.trim() && (
            <div className="py-12 text-center text-muted text-xs">
              Type to instantly query the orbital database across all channels and crew logs.
            </div>
          )}

          {query.trim() && !hasResults && !isSearching && (
            <div className="py-12 text-center text-muted text-xs">
              No matching transmissions, planets, or crew members found for "{query}".
            </div>
          )}

          {/* Channels */}
          {results.channels.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                Planets & Channels
              </div>
              <div className="space-y-1">
                {results.channels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectChannel(c.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left group min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-text block truncate">
                          {c.name}
                        </span>
                        {c.description && (
                          <span className="text-xs text-muted block truncate">
                            {c.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* People */}
          {results.people.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                Crew Members & Orbits
              </div>
              <div className="space-y-1">
                {results.people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPerson(p.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left group min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarRing avatar={p.avatar} status={p.status} size={32} />
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-text block truncate">
                          {p.displayName}
                        </span>
                        <span className="text-xs text-muted block truncate">
                          @{p.username} {p.customStatus ? `• ${p.customStatus}` : ""}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {results.messages.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                Transmissions
              </div>
              <div className="space-y-1">
                {results.messages.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMessage(m)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left group min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-muted shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-text">{m.senderName}</span>
                          {m.channelName && (
                            <span className="text-[10px] text-accent font-medium">#{m.channelName}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted block truncate">{m.content}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border/70 bg-surface/60 flex items-center justify-between text-xs text-muted">
          <span className="text-[11px]">Navigate with arrow keys or tap</span>
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-text font-semibold text-xs transition-colors min-h-[32px] flex items-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

