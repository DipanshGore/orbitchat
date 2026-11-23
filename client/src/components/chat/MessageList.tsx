"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { ArrowDown, Loader2, WifiOff, Sparkles, MessageCircle } from "lucide-react";
import { MessageSummary } from "../../types";
import { MessageItem } from "./MessageItem";
import { formatDayHeader } from "../../lib/utils";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { AvatarRing } from "../layout/AvatarRing";

export function MessageList({
  messages,
  onReply,
  chatId,
  chatType,
}: {
  messages: MessageSummary[];
  onReply: (msg: MessageSummary) => void;
  chatId: string;
  chatType: "channel" | "dm";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);

  const {
    hasMoreMessages,
    isLoadingMessages,
    fetchMessages,
    nextCursor,
    typingUsers,
    activeConversation,
    sendMessage,
  } = useChatStore();
  const { isReconnecting } = useAuthStore();

  const isNearBottomRef = useRef(true);

  // Check scroll position
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
    setShowScrollBottom(distanceFromBottom > 240);

    // Infinite scroll up
    if (scrollTop < 40 && hasMoreMessages && !isLoadingMessages && nextCursor) {
      setPrevScrollHeight(scrollHeight);
      fetchMessages(chatId, chatType, nextCursor);
    }
  };

  // Preserve scroll position when older messages load
  useLayoutEffect(() => {
    if (prevScrollHeight > 0 && containerRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeight;
      containerRef.current.scrollTop = diff;
      setPrevScrollHeight(0);
    }
  }, [messages, prevScrollHeight]);

  // Auto-scroll only near bottom when new messages arrive
  useEffect(() => {
    if (isNearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Typing users string
  const typingNames = Object.values(typingUsers).map((u) => u.displayName);

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      {/* Reconnecting Banner */}
      {isReconnecting && (
        <div className="bg-amber-500/90 text-white text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 font-semibold shadow-md z-20">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Orbital relay disconnected. Reconnecting...</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="max-w-[760px] mx-auto w-full flex flex-col min-h-full justify-end">
          {/* Loading older messages indicator */}
          {isLoadingMessages && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          )}

          {/* Direct DM Beginning Header */}
          {chatType === "dm" && !hasMoreMessages && activeConversation && (
            <div className="py-8 px-4 my-4 rounded-3xl bg-surface-2/70 border border-border/80 text-center flex flex-col items-center max-w-lg mx-auto w-full shadow-sm animate-in fade-in duration-200">
              <AvatarRing
                avatar={activeConversation.otherUser.avatar}
                status={activeConversation.otherUser.status}
                size={64}
              />
              <h3 className="font-heading font-bold text-lg text-text mt-3">
                {activeConversation.otherUser.displayName}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                @{activeConversation.otherUser.username}
                {activeConversation.otherUser.customStatus && (
                  <span className="block mt-1 italic text-text/80">
                    "{activeConversation.otherUser.customStatus}"
                  </span>
                )}
              </p>
              <p className="text-xs text-muted mt-2 max-w-xs leading-relaxed">
                This is the private encrypted orbit between you and{" "}
                <span className="font-semibold text-text">
                  {activeConversation.otherUser.displayName}
                </span>
                .
              </p>

              {/* Quick Icebreaker Greetings */}
              <div className="mt-4 pt-3 border-t border-border/60 w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
                  {activeConversation.otherUser.isBot
                    ? "Interactive AI Mission Prompts"
                    : "Quick Icebreaker Greetings"}
                </span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {activeConversation.otherUser.isBot ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage("✨ What are your orbital capabilities and features?")
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>✨ Capabilities Overview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage("🚀 Explain how quantum orbital telemetry works in space stations.")
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>🚀 Quantum Physics</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage("💻 Write an optimized TypeScript function for real-time WebSocket reconnects with jittered backoff.")
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>💻 Code Assistant</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage("🛰️ Report current orbital station status and velocity.")
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>🛰️ Station Telemetry</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage(
                            `👋 Hello ${activeConversation.otherUser.displayName}! Direct orbit established.`
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>👋 Wave Hello</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage(`☕ Sending zero-g coffee to your orbital workstation!`)
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>☕ Zero-G Coffee</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage(`🛰️ Telemetry ping! Are you in station orbit right now?`)
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-accent hover:text-accent-contrast text-text text-xs font-semibold border border-border transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>🛰️ Telemetry Ping</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty Chat Welcome for Channels */}
          {chatType === "channel" && messages.length === 0 && !isLoadingMessages && (
            <div className="py-20 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent mx-auto flex items-center justify-center font-bold text-xl">
                🛰️
              </div>
              <h3 className="font-heading font-bold text-base text-text">Orbit Open</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                No transmissions recorded on this frequency yet. Transmit the first message or query
                OrbitBot AI with /help.
              </p>
            </div>
          )}

          {/* Group and Render Messages with Day Separators */}
          {messages.map((msg, index) => {
            const prevMsg = messages[index - 1];

            // Day separator check
            const showDayHeader =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

            // Group check (same sender within 4 minutes)
            const isFirstInGroup =
              !prevMsg ||
              prevMsg.senderId !== msg.senderId ||
              showDayHeader ||
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
                4 * 60 * 1000;

            return (
              <React.Fragment key={msg.id || msg.tempId || index}>
                {showDayHeader && (
                  <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-2 border border-border text-muted shadow-sm">
                      {formatDayHeader(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}
                <MessageItem
                  message={msg}
                  isFirstInGroup={isFirstInGroup}
                  onReply={onReply}
                />
              </React.Fragment>
            );
          })}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Typing Indicator */}
      {typingNames.length > 0 && (
        <div className="max-w-[760px] mx-auto w-full px-4 py-1 text-xs text-muted flex items-center gap-2">
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
          </span>
          <span className="truncate">
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} transmitting telemetry...
          </span>
        </div>
      )}

      {/* "Jump to Latest" Pill */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="glass-panel absolute bottom-4 right-8 z-30 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold text-accent flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all min-h-[36px]"
        >
          <span>Jump to latest</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

