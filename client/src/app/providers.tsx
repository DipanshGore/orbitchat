"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { getSocket } from "../lib/socket";
import { IdentityModal } from "../components/auth/IdentityModal";
import { CommandPalette } from "../components/layout/CommandPalette";
import { CreateChannelModal } from "../components/layout/CreateChannelModal";
import { NewDmModal } from "../components/layout/NewDmModal";
import { MessageSummary, UserStatus } from "../types";
import { Sparkles, X } from "lucide-react";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const { user, checkAuth, setIsReconnecting } = useAuthStore();
  const {
    fetchChannels,
    fetchConversations,
    fetchUnreadSummary,
    addIncomingMessage,
    updateMessageInStore,
    removeMessageFromStore,
    handleTypingUpdate,
    handlePresenceUpdate,
    unreadSummary,
  } = useChatStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    checkAuth().then((authenticatedUser) => {
      if (authenticatedUser) {
        if (typeof window !== "undefined") {
          (window as any).__CURRENT_USER__ = authenticatedUser;
        }
        fetchChannels();
        fetchConversations();
        fetchUnreadSummary().then(() => {
          // Toast after login ("5 unread from 3 chats")
          const store = useChatStore.getState();
          if (store.unreadSummary.totalUnread > 0) {
            setToastMessage(
              `🛰️ ${store.unreadSummary.totalUnread} unread transmissions from ${store.unreadSummary.chatsCount} chats`
            );
            setTimeout(() => setToastMessage(null), 5000);
          }
        });
      }
    });
  }, [checkAuth, fetchChannels, fetchConversations, fetchUnreadSummary]);

  // Sync window user
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      (window as any).__CURRENT_USER__ = user;
    }
  }, [user]);

  // Socket event binding
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    const onConnect = () => {
      setIsReconnecting(false);
      fetchChannels();
      fetchConversations();
      fetchUnreadSummary();
    };

    const onDisconnect = () => {
      setIsReconnecting(true);
    };

    const onConnectError = () => {
      setIsReconnecting(true);
    };

    const onMessageCreated = (msg: MessageSummary) => {
      addIncomingMessage(msg);
    };

    const onMessageUpdated = (msg: Partial<MessageSummary> & { id: string }) => {
      updateMessageInStore(msg);
    };

    const onMessageDeleted = (payload: { id: string }) => {
      removeMessageFromStore(payload.id);
    };

    const onTypingUpdate = (payload: {
      chatId: string;
      isChannel: boolean;
      user: { id: string; username: string; displayName: string };
      isTyping: boolean;
    }) => {
      handleTypingUpdate(payload.chatId, payload.user, payload.isTyping);
    };

    const onPresenceUpdate = (payload: {
      userId: string;
      status: UserStatus;
      customStatus?: string | null;
    }) => {
      handlePresenceUpdate(payload.userId, payload.status, payload.customStatus);
    };

    const onUnreadUpdate = () => {
      fetchUnreadSummary();
      fetchChannels();
      fetchConversations();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("message:created", onMessageCreated);
    socket.on("message:updated", onMessageUpdated);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("typing:update", onTypingUpdate);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("unread:update", onUnreadUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("message:created", onMessageCreated);
      socket.off("message:updated", onMessageUpdated);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("typing:update", onTypingUpdate);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("unread:update", onUnreadUpdate);
    };
  }, [
    user,
    setIsReconnecting,
    addIncomingMessage,
    updateMessageInStore,
    removeMessageFromStore,
    handleTypingUpdate,
    handlePresenceUpdate,
    fetchUnreadSummary,
    fetchChannels,
    fetchConversations,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Floating Unread Login Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 glass-panel px-4 py-3 shadow-2xl flex items-center gap-3 border border-accent/40 animate-in slide-in-from-top duration-300">
          <Sparkles className="w-5 h-5 text-accent shrink-0 animate-pulse" />
          <span className="text-xs font-semibold text-text">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-muted hover:text-text p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals & Command Palette */}
      <IdentityModal />
      <CommandPalette />
      <CreateChannelModal />
      <NewDmModal />
    </QueryClientProvider>
  );
}

