"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  Plus,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Code,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { getSocket } from "../../lib/socket";
import { apiFetch } from "../../lib/api";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "./VoiceRecorder";
import { MessageSummary } from "../../types";

export function MessageComposer({
  replyingTo,
  onClearReply,
}: {
  replyingTo: MessageSummary | null;
  onClearReply: () => void;
}) {
  const [content, setContent] = useState("");
  const [showTray, setShowTray] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { activeChatId, activeChatType, activeConversation, sendMessage } = useChatStore();
  const { user } = useAuthStore();
  const isDirectBotChat = activeChatType === "dm" && activeConversation?.otherUser.isBot;

  // Auto-grow textarea up to 5 lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [content]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    const socket = getSocket();
    if (socket && socket.connected && activeChatId) {
      socket.emit("typing:start", {
        chatId: activeChatId,
        isChannel: activeChatType === "channel",
      });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit("typing:stop", {
          chatId: activeChatId,
          isChannel: activeChatType === "channel",
        });
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isUploading) return;

    const replyId = replyingTo?.id;
    setContent("");
    if (onClearReply) onClearReply();

    // Check if it's code block
    const isCode = trimmed.startsWith("```") && trimmed.endsWith("```");
    await sendMessage(trimmed, isCode ? "code" : "text", {
      replyToId: replyId,
    });

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const socket = getSocket();
    if (socket && socket.connected && activeChatId) {
      socket.emit("typing:stop", {
        chatId: activeChatId,
        isChannel: activeChatType === "channel",
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  // File / Image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowTray(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch<{
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }>("/api/upload", {
        method: "POST",
        body: formData,
      });

      const isImage = file.type.startsWith("image/");
      await sendMessage(
        content.trim() || (isImage ? "Transmitted an orbital image" : `Transmitted ${file.name}`),
        isImage ? "image" : "file",
        {
          fileUrl: res.url,
          fileName: res.fileName,
          fileSize: res.fileSize,
          mimeType: res.mimeType,
          replyToId: replyingTo?.id,
        }
      );

      setContent("");
      if (onClearReply) onClearReply();
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVoiceSend = async (fileUrl: string) => {
    await sendMessage("Transmitted voice telemetry", "voice", {
      fileUrl,
      replyToId: replyingTo?.id,
    });
    setIsRecordingVoice(false);
    if (onClearReply) onClearReply();
  };

  const insertBotCommand = (cmd: string) => {
    setContent(cmd + " ");
    setShowTray(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative p-3 border-t border-border/70 bg-surface/80 backdrop-blur-md">
      {/* Reply-to Preview Banner */}
      {replyingTo && (
        <div className="max-w-[760px] mx-auto mb-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-accent">Replying to {replyingTo.sender.displayName}:</span>
            <span className="text-muted truncate">{replyingTo.content}</span>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="p-1 text-muted hover:text-text rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Click outside to close Tray & Emoji */}
      {(showTray || showEmoji) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowTray(false);
            setShowEmoji(false);
          }}
        />
      )}

      {/* Floating Tray Menu */}
      {showTray && (
        <div className="absolute bottom-full mb-2 left-4 glass-panel p-2 shadow-2xl z-40 w-56 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 text-text hover:bg-surface-2 transition-colors min-h-[44px]"
          >
            <ImageIcon className="w-4 h-4 text-accent" /> Upload Image / Capture
          </button>

          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 text-text hover:bg-surface-2 transition-colors min-h-[44px]"
          >
            <FileText className="w-4 h-4 text-secondary" /> Attach File Log
          </button>

          <button
            type="button"
            onClick={() => {
              setContent("```typescript\n\n```");
              setShowTray(false);
              textareaRef.current?.focus();
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 text-text hover:bg-surface-2 transition-colors min-h-[44px]"
          >
            <Code className="w-4 h-4 text-amber-500" /> Insert Code Snippet
          </button>

          <div className="pt-1 border-t border-border/60">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              OrbitBot AI Commands
            </div>
            <button
              type="button"
              onClick={() => insertBotCommand("/help")}
              className="w-full px-3 py-1.5 rounded-xl text-left text-xs flex items-center gap-2 text-text hover:bg-surface-2 transition-colors min-h-[36px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> /help (Bot Manual)
            </button>
            <button
              type="button"
              onClick={() => insertBotCommand("/ask")}
              className="w-full px-3 py-1.5 rounded-xl text-left text-xs flex items-center gap-2 text-text hover:bg-surface-2 transition-colors min-h-[36px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" /> /ask &lt;query&gt;
            </button>
            <button
              type="button"
              onClick={() => insertBotCommand("/summarize")}
              className="w-full px-3 py-1.5 rounded-xl text-left text-xs flex items-center gap-2 text-text hover:bg-surface-2 transition-colors min-h-[36px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-secondary" /> /summarize
            </button>
          </div>
        </div>
      )}

      {/* Floating Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-full mb-2 left-12 z-40">
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="max-w-[760px] mx-auto w-full">
        {isRecordingVoice ? (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-end gap-2 bg-surface rounded-2xl border border-border p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-accent transition-all">
            {/* [+ Tray Button] */}
            <button
              type="button"
              onClick={() => {
                setShowTray(!showTray);
                setShowEmoji(false);
              }}
              className={`p-2 rounded-xl text-muted hover:text-text hover:bg-surface-2 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                showTray ? "text-accent bg-surface-2" : ""
              }`}
              title="Add attachments or bot commands"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Emoji Trigger */}
            <button
              type="button"
              onClick={() => {
                setShowEmoji(!showEmoji);
                setShowTray(false);
              }}
              className={`p-2 rounded-xl text-muted hover:text-text hover:bg-surface-2 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                showEmoji ? "text-accent bg-surface-2" : ""
              }`}
              title="Emoji picker"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Quick AI Trigger */}
            <button
              type="button"
              onClick={() => {
                if (isDirectBotChat) {
                  setContent((prev) => prev || "/help ");
                } else {
                  setContent((prev) => (prev.includes("@orbitbot") ? prev : `@orbitbot ${prev}`));
                }
                textareaRef.current?.focus();
              }}
              className="p-2 rounded-xl text-muted hover:text-accent hover:bg-surface-2 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={isDirectBotChat ? "OrbitBot AI Active" : "Ask OrbitBot AI (@orbitbot)"}
            >
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            </button>

            {/* Auto-growing Textarea (16px font to prevent mobile zoom) */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isDirectBotChat
                  ? "Chat with OrbitBot AI... (Ask questions, write code, get telemetry)"
                  : "Transmit message to orbit... (Type /help or @orbitbot for AI)"
              }
              rows={1}
              className="flex-1 max-h-32 py-2.5 px-1 bg-transparent border-none text-text text-base leading-relaxed placeholder:text-muted focus:outline-none resize-none min-h-[44px]"
            />

            {/* Right Action: [Mic when empty / Send when typing] */}
            {isUploading ? (
              <div className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              </div>
            ) : content.trim() ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="p-2.5 rounded-xl bg-accent text-accent-contrast hover:opacity-90 transition-all shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center shadow-md active:scale-95"
                title="Send transmission (Enter)"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="p-2 rounded-xl text-muted hover:text-accent hover:bg-surface-2 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Record orbital audio note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

