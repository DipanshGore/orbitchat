import { create } from "zustand";
import {
  ChannelSummary,
  ConversationSummary,
  ChannelMemberSummary,
  MessageSummary,
  UnreadSummary,
  MessageType,
  UserStatus,
} from "../types";
import { apiFetch } from "../lib/api";
import { getSocket } from "../lib/socket";
import { playOrbitChime } from "../lib/sound";

interface ChatState {
  channels: ChannelSummary[];
  conversations: ConversationSummary[];
  activeChatId: string | null;
  activeChatType: "channel" | "dm" | null;
  activeChannel: ChannelSummary | null;
  activeConversation: ConversationSummary | null;
  activeMembers: ChannelMemberSummary[];
  messages: MessageSummary[];
  nextCursor: string | null;
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;
  unreadSummary: UnreadSummary;
  typingUsers: Record<string, { username: string; displayName: string }>;
  isCommandPaletteOpen: boolean;
  isMembersPanelOpen: boolean;
  isCreateChannelOpen: boolean;
  isNewDmOpen: boolean;

  setChannels: (channels: ChannelSummary[]) => void;
  setConversations: (conversations: ConversationSummary[]) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMembersPanelOpen: (open: boolean) => void;
  setCreateChannelOpen: (open: boolean) => void;
  setNewDmOpen: (open: boolean) => void;

  fetchChannels: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchUnreadSummary: () => Promise<void>;
  setActiveChat: (id: string, type: "channel" | "dm") => Promise<void>;
  fetchMessages: (chatId: string, type: "channel" | "dm", cursor?: string) => Promise<void>;
  markChatRead: (chatId: string, type: "channel" | "dm") => Promise<void>;

  sendMessage: (
    content: string,
    type?: MessageType,
    meta?: {
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      replyToId?: string;
    }
  ) => Promise<void>;
  retryMessage: (tempId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Real-time socket handlers
  addIncomingMessage: (msg: MessageSummary) => void;
  updateMessageInStore: (msg: Partial<MessageSummary> & { id: string }) => void;
  removeMessageFromStore: (id: string) => void;
  handleTypingUpdate: (chatId: string, user: { id: string; username: string; displayName: string }, isTyping: boolean) => void;
  handlePresenceUpdate: (userId: string, status: UserStatus, customStatus?: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  conversations: [],
  activeChatId: null,
  activeChatType: null,
  activeChannel: null,
  activeConversation: null,
  activeMembers: [],
  messages: [],
  nextCursor: null,
  hasMoreMessages: false,
  isLoadingMessages: false,
  unreadSummary: { totalUnread: 0, chatsCount: 0, channels: {}, conversations: {} },
  typingUsers: {},
  isCommandPaletteOpen: false,
  isMembersPanelOpen: true,
  isCreateChannelOpen: false,
  isNewDmOpen: false,

  setChannels: (channels) => set({ channels }),
  setConversations: (conversations) => set({ conversations }),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  setMembersPanelOpen: (isMembersPanelOpen) => set({ isMembersPanelOpen }),
  setCreateChannelOpen: (isCreateChannelOpen) => set({ isCreateChannelOpen }),
  setNewDmOpen: (isNewDmOpen) => set({ isNewDmOpen }),

  fetchChannels: async () => {
    try {
      const res = await apiFetch<{ channels: ChannelSummary[] }>("/api/channels");
      set({ channels: res.channels });
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  },

  fetchConversations: async () => {
    try {
      const res = await apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations");
      set({ conversations: res.conversations });
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  },

  fetchUnreadSummary: async () => {
    try {
      const res = await apiFetch<UnreadSummary>("/api/messages/unread-summary");
      set({ unreadSummary: res });
      // Update document title with unread badge e.g. "(3) OrbitChat"
      if (typeof document !== "undefined") {
        if (res.totalUnread > 0) {
          const capCount = res.totalUnread > 99 ? "99+" : res.totalUnread;
          document.title = `(${capCount}) OrbitChat`;
        } else {
          document.title = "OrbitChat";
        }
      }
    } catch (err) {
      console.error("Failed to fetch unread summary:", err);
    }
  },

  setActiveChat: async (id: string, type: "channel" | "dm") => {
    set({
      activeChatId: id,
      activeChatType: type,
      messages: [],
      nextCursor: null,
      hasMoreMessages: false,
      typingUsers: {},
    });

    const socket = getSocket();
    if (socket && socket.connected) {
      if (type === "channel") {
        socket.emit("channel:join", id);
      } else {
        socket.emit("conversation:join", id);
      }
    }

    if (type === "channel") {
      try {
        const res = await apiFetch<{ channel: any; isMember: boolean }>(`/api/channels/${id}`);
        set({
          activeChannel: res.channel,
          activeConversation: null,
          activeMembers: res.channel.members || [],
        });
      } catch (err) {
        console.error("Failed to fetch active channel:", err);
      }
    } else {
      try {
        const res = await apiFetch<{ conversation: ConversationSummary }>(`/api/conversations/${id}`);
        set({
          activeConversation: res.conversation,
          activeChannel: null,
          activeMembers: [
            {
              id: "dm-partner",
              channelId: "",
              userId: res.conversation.otherUser.id,
              role: "member",
              joinedAt: res.conversation.createdAt,
              user: res.conversation.otherUser,
            },
          ],
        });
      } catch (err) {
        console.error("Failed to fetch active conversation:", err);
      }
    }

    // Load initial messages and mark read
    await get().fetchMessages(id, type);
    await get().markChatRead(id, type);
  },

  fetchMessages: async (chatId: string, type: "channel" | "dm", cursor?: string) => {
    try {
      set({ isLoadingMessages: true });
      const queryParam = type === "channel" ? `channelId=${chatId}` : `conversationId=${chatId}`;
      const cursorParam = cursor ? `&cursor=${cursor}` : "";
      const res = await apiFetch<{ messages: MessageSummary[]; nextCursor: string | null }>(
        `/api/messages?${queryParam}&limit=35${cursorParam}`
      );

      set((state) => {
        if (cursor) {
          // Prepend older history
          return {
            messages: [...res.messages, ...state.messages],
            nextCursor: res.nextCursor,
            hasMoreMessages: !!res.nextCursor,
            isLoadingMessages: false,
          };
        } else {
          return {
            messages: res.messages,
            nextCursor: res.nextCursor,
            hasMoreMessages: !!res.nextCursor,
            isLoadingMessages: false,
          };
        }
      });
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      set({ isLoadingMessages: false });
    }
  },

  markChatRead: async (chatId: string, type: "channel" | "dm") => {
    try {
      const payload = type === "channel" ? { channelId: chatId } : { conversationId: chatId };
      const res = await apiFetch<{ success: boolean; unread: UnreadSummary }>("/api/messages/mark-read", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.unread) {
        set({ unreadSummary: res.unread });
        if (typeof document !== "undefined") {
          if (res.unread.totalUnread > 0) {
            const capCount = res.unread.totalUnread > 99 ? "99+" : res.unread.totalUnread;
            document.title = `(${capCount}) OrbitChat`;
          } else {
            document.title = "OrbitChat";
          }
        }
      }

      // Also reset unreadCount in channel or conversation locally
      if (type === "channel") {
        set((state) => ({
          channels: state.channels.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
        }));
      } else {
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
        }));
      }
    } catch (err) {
      console.error("Failed to mark chat read:", err);
    }
  },

  sendMessage: async (content: string, type = "text", meta = {}) => {
    const { activeChatId, activeChatType } = get();
    if (!activeChatId || !activeChatType) return;

    // Generate optimistic tempId
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Get current user from authStore
    let currentUser: any = {
      id: "pending",
      displayName: "You",
      username: "you",
      avatar: "mars",
      status: "online",
      isGuest: false,
      isBot: false,
    };
    if (typeof window !== "undefined") {
      try {
        const stored = (window as any).__CURRENT_USER__;
        if (stored) currentUser = stored;
      } catch {}
    }

    const optimisticMsg: MessageSummary = {
      id: tempId,
      tempId,
      content,
      type,
      fileUrl: meta.fileUrl || null,
      fileName: meta.fileName || null,
      fileSize: meta.fileSize || null,
      mimeType: meta.mimeType || null,
      channelId: activeChatType === "channel" ? activeChatId : null,
      conversationId: activeChatType === "dm" ? activeChatId : null,
      senderId: currentUser.id,
      sender: currentUser,
      replyToId: meta.replyToId || null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending",
    };

    // Optimistically insert message
    set((state) => ({
      messages: [...state.messages, optimisticMsg],
    }));

    try {
      const payload: any = {
        content,
        type,
        tempId,
        ...meta,
      };
      if (activeChatType === "channel") {
        payload.channelId = activeChatId;
      } else {
        payload.conversationId = activeChatId;
      }

      const res = await apiFetch<{ message: MessageSummary }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Replace optimistic message with confirmed message
      set((state) => ({
        messages: state.messages.map((m) =>
          m.tempId === tempId || m.id === tempId ? { ...res.message, status: "sent" } : m
        ),
      }));
    } catch (err) {
      console.error("Message send failed:", err);
      // Mark as failed with retry state
      set((state) => ({
        messages: state.messages.map((m) =>
          m.tempId === tempId || m.id === tempId ? { ...m, status: "failed" } : m
        ),
      }));
    }
  },

  retryMessage: async (tempId: string) => {
    const msg = get().messages.find((m) => m.tempId === tempId || m.id === tempId);
    if (!msg) return;

    // Set back to sending
    set((state) => ({
      messages: state.messages.map((m) =>
        m.tempId === tempId || m.id === tempId ? { ...m, status: "sending" } : m
      ),
    }));

    try {
      const payload: any = {
        content: msg.content,
        type: msg.type,
        tempId,
        fileUrl: msg.fileUrl || undefined,
        fileName: msg.fileName || undefined,
        fileSize: msg.fileSize || undefined,
        mimeType: msg.mimeType || undefined,
        replyToId: msg.replyToId || undefined,
      };
      if (msg.channelId) {
        payload.channelId = msg.channelId;
      } else if (msg.conversationId) {
        payload.conversationId = msg.conversationId;
      }

      const res = await apiFetch<{ message: MessageSummary }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      set((state) => ({
        messages: state.messages.map((m) =>
          m.tempId === tempId || m.id === tempId ? { ...res.message, status: "sent" } : m
        ),
      }));
    } catch {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.tempId === tempId || m.id === tempId ? { ...m, status: "failed" } : m
        ),
      }));
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      const res = await apiFetch<{ message: any }>(`/api/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });

      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, content: res.message.content, isEdited: true } : m
        ),
      }));
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await apiFetch(`/api/messages/${messageId}`, { method: "DELETE" });
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: "This transmission was deleted." } : m
        ),
      }));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  },

  addIncomingMessage: (msg: MessageSummary) => {
    const { activeChatId, activeChatType } = get();
    const isTargetingCurrent =
      (activeChatType === "channel" && msg.channelId === activeChatId) ||
      (activeChatType === "dm" && msg.conversationId === activeChatId);

    // If belongs to current active chat, append (deduplicating if tempId matches)
    if (isTargetingCurrent) {
      set((state) => {
        // Check if already in list
        const exists = state.messages.some(
          (m) => m.id === msg.id || (msg.tempId && m.tempId === msg.tempId)
        );
        if (exists) {
          return {
            messages: state.messages.map((m) =>
              m.id === msg.id || (msg.tempId && m.tempId === msg.tempId) ? msg : m
            ),
          };
        }
        return { messages: [...state.messages, msg] };
      });

      // Clear read status since chat is open
      if (activeChatId && activeChatType) {
        get().markChatRead(activeChatId, activeChatType);
      }
    } else {
      // Play chime chime only for chats that AREN'T open!
      playOrbitChime();

      // Refresh unread summary and chat previews
      get().fetchUnreadSummary();
      get().fetchChannels();
      get().fetchConversations();
    }
  },

  updateMessageInStore: (msg) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
    }));
  },

  removeMessageFromStore: (id) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isDeleted: true, content: "This transmission was deleted." } : m
      ),
    }));
  },

  handleTypingUpdate: (chatId, user, isTyping) => {
    set((state) => {
      const next = { ...state.typingUsers };
      if (isTyping) {
        next[user.id] = { username: user.username, displayName: user.displayName };
      } else {
        delete next[user.id];
      }
      return { typingUsers: next };
    });
  },

  handlePresenceUpdate: (userId, status, customStatus) => {
    set((state) => ({
      activeMembers: state.activeMembers.map((m) =>
        m.userId === userId
          ? { ...m, user: { ...m.user, status, customStatus: customStatus ?? m.user.customStatus } }
          : m
      ),
      conversations: state.conversations.map((c) =>
        c.otherUser.id === userId
          ? {
              ...c,
              otherUser: {
                ...c.otherUser,
                status,
                customStatus: customStatus ?? c.otherUser.customStatus,
              },
            }
          : c
      ),
    }));
  },
}));

