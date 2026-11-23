"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Reply,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Loader2,
  Play,
  Pause,
  FileText,
  Download,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { MessageSummary } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { AvatarRing } from "../layout/AvatarRing";
import { CodeSnippet } from "./CodeSnippet";
import { formatMessageTime } from "../../lib/utils";
import { API_BASE_URL, apiFetch } from "../../lib/api";

export function MessageItem({
  message,
  isFirstInGroup = true,
  onReply,
}: {
  message: MessageSummary;
  isFirstInGroup?: boolean;
  onReply: (msg: MessageSummary) => void;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { editMessage, deleteMessage, retryMessage } = useChatStore();

  const isSentByMe = message.senderId === user?.id || message.status === "sending";
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleDirectMessage = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === user?.id) return;
    try {
      const res = await apiFetch<{ conversation: { id: string } }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      router.push(`/dm/${res.conversation.id}`);
    } catch (err) {
      console.error("Failed to start direct message:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await editMessage(message.id, editContent);
    setIsEditing(false);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    await deleteMessage(message.id);
    setMenuOpen(false);
  };

  const toggleVoice = () => {
    if (!audioRef.current) return;
    if (isPlayingVoice) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioRef.current.play();
      setIsPlayingVoice(true);
    }
  };

  // Full file URL helper
  const getFullFileUrl = (url?: string | null) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  };

  return (
    <div
      className={`relative flex flex-col group ${
        isSentByMe ? "items-end" : "items-start"
      } ${isFirstInGroup ? "mt-4" : "mt-1"}`}
    >
      {/* Always-visible Meta Header (Name + Time; Sent shows time only) */}
      {isFirstInGroup && (
        <div
          className={`flex items-center gap-2 mb-1 px-1 text-[11px] ${
            isSentByMe ? "justify-end text-muted" : "justify-start text-muted"
          }`}
        >
          {!isSentByMe && (
            <button
              type="button"
              onClick={() => handleDirectMessage(message.senderId)}
              className="flex items-center gap-1.5 hover:text-accent transition-colors group/sender"
              title={`Send Direct Message to ${message.sender.displayName}`}
            >
              <AvatarRing
                avatar={message.sender.avatar}
                status={message.sender.status}
                size={20}
                showStatusDot={false}
              />
              <span className="font-bold text-text group-hover/sender:text-accent truncate max-w-[160px]">
                {message.sender.displayName}
              </span>
            </button>
          )}
          <span className="text-muted font-mono">{formatMessageTime(message.createdAt)}</span>
        </div>
      )}

      {/* Message Row with Bubble & One Action Menu */}
      <div
        className={`flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%] ${
          isSentByMe ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* The Asymmetric Message Bubble */}
        <div
          className={`relative p-3.5 shadow-sm break-words overflow-hidden ${
            isSentByMe ? "bubble-sent" : "bubble-received"
          }`}
        >
          {/* Reply-to Preview Banner */}
          {message.replyTo && (
            <div
              className={`mb-2 p-2 rounded-xl text-xs border-l-2 flex flex-col gap-0.5 ${
                isSentByMe
                  ? "bg-black/15 border-white/60 text-white/90"
                  : "bg-surface border-accent text-text"
              }`}
            >
              <span className="font-bold text-[10px] text-accent">
                {message.replyTo.sender.displayName}
              </span>
              <span className="text-[11px] line-clamp-1 opacity-80">
                {message.replyTo.content}
              </span>
            </div>
          )}

          {/* Edit Mode */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 text-xs rounded-lg bg-surface text-text border border-border resize-none focus:outline-none"
                rows={2}
              />
              <div className="flex items-center justify-end gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 rounded hover:bg-surface-2 text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 rounded bg-accent text-accent-contrast font-bold text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Voice Note Compact Player */}
              {message.type === "voice" && message.fileUrl ? (
                <div className="flex items-center gap-3 py-1 min-w-[200px]">
                  <audio
                    ref={audioRef}
                    src={getFullFileUrl(message.fileUrl)}
                    onEnded={() => setIsPlayingVoice(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                      isSentByMe
                        ? "bg-surface text-accent hover:scale-105"
                        : "bg-accent text-accent-contrast hover:scale-105"
                    }`}
                  >
                    {isPlayingVoice ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <span className="text-xs font-semibold block">Orbital Audio Note</span>
                    <span className="text-[10px] opacity-75">Recorded Telemetry</span>
                  </div>
                </div>
              ) : message.type === "image" && message.fileUrl ? (
                /* Image Preview */
                <div className="space-y-2">
                  <a
                    href={getFullFileUrl(message.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg overflow-hidden border border-black/10"
                  >
                    <img
                      src={getFullFileUrl(message.fileUrl)}
                      alt={message.fileName || "Uploaded image"}
                      className="max-h-72 w-auto object-cover rounded-lg hover:opacity-95 transition-opacity"
                    />
                  </a>
                  {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                </div>
              ) : message.type === "file" && message.fileUrl ? (
                /* File Attachment */
                <div className="space-y-1.5">
                  <a
                    href={getFullFileUrl(message.fileUrl)}
                    download={message.fileName || "attachment"}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border ${
                      isSentByMe
                        ? "bg-black/10 border-white/20 text-white"
                        : "bg-surface border-border text-text"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <span className="truncate flex-1">{message.fileName || "Document"}</span>
                    <Download className="w-4 h-4 shrink-0 opacity-70" />
                  </a>
                  {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                </div>
              ) : message.type === "code" || message.content.startsWith("```") ? (
                /* Code Snippet */
                <CodeSnippet code={message.content} />
              ) : (
                /* Standard Text */
                <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {message.content}
                </p>
              )}
            </>
          )}

          {/* Edited indicator */}
          {message.isEdited && !message.isDeleted && (
            <span className="text-[9px] opacity-65 italic block text-right mt-1">edited</span>
          )}
        </div>

        {/* Action Menu Trigger (Visible on click / tap; NO hover-only reactivity) */}
        {!message.isDeleted && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center opacity-60 hover:opacity-100"
              title="Message options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu / Long-press touch action */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className={`glass-panel absolute z-30 py-1.5 w-36 shadow-xl text-xs space-y-0.5 ${
                    isSentByMe ? "right-0 bottom-full mb-1" : "left-0 bottom-full mb-1"
                  }`}
                >
                <button
                  type="button"
                  onClick={() => {
                    onReply(message);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-text hover:bg-surface-2 transition-colors min-h-[32px] text-left"
                >
                  <Reply className="w-3.5 h-3.5 text-accent" /> Reply
                </button>

                {!isSentByMe && message.channelId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDirectMessage(message.senderId);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-text hover:bg-surface-2 transition-colors min-h-[32px] text-left"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-secondary" /> Direct Orbit
                  </button>
                )}

                {isSentByMe && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-text hover:bg-surface-2 transition-colors min-h-[32px] text-left"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-danger hover:bg-danger/10 transition-colors min-h-[32px] text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          </div>
        )}
      </div>

      {/* Optimistic Status Indicator: sending -> sent tick -> failed with Retry */}
      {isSentByMe && (
        <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted">
          {message.status === "sending" ? (
            <span className="flex items-center gap-1 text-muted">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> transmitting...
            </span>
          ) : message.status === "failed" ? (
            <button
              type="button"
              onClick={() => message.tempId && retryMessage(message.tempId)}
              className="flex items-center gap-1 text-danger font-bold hover:underline"
            >
              <AlertCircle className="w-3 h-3" /> Failed. Retry <RotateCcw className="w-2.5 h-2.5" />
            </button>
          ) : (
            <span className="flex items-center gap-0.5 text-success" title="Transmission Confirmed">
              <Check className="w-3 h-3 text-success" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

