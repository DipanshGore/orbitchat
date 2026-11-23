export type UserStatus = "online" | "away" | "busy" | "offline";

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  status: UserStatus;
  customStatus?: string | null;
  isGuest: boolean;
  isBot: boolean;
  createdAt: string;
}

export interface ChannelSummary {
  id: string;
  name: string;
  description?: string | null;
  isPrivate: boolean;
  createdAt: string;
  memberCount?: number;
  unreadCount?: number;
  lastMessage?: MessageSummary | null;
}

export interface ChannelMemberSummary {
  id: string;
  channelId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  user: UserSummary;
}

export interface ConversationSummary {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  updatedAt: string;
  otherUser: UserSummary;
  unreadCount?: number;
  lastMessage?: MessageSummary | null;
}

export type MessageType = "text" | "code" | "image" | "file" | "voice";

export interface MessageSummary {
  id: string;
  content: string;
  type: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  channelId?: string | null;
  conversationId?: string | null;
  senderId: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    sender: {
      displayName: string;
      username: string;
    };
  } | null;
  sender: UserSummary;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Optimistic client fields
  tempId?: string;
  status?: "sending" | "sent" | "failed";
}

export interface UnreadSummary {
  totalUnread: number;
  chatsCount: number;
  channels: Record<string, number>;
  conversations: Record<string, number>;
}

export interface TypingEvent {
  chatId: string; // channelId or conversationId
  isChannel: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  isTyping: boolean;
}

export interface PresenceUpdateEvent {
  userId: string;
  status: UserStatus;
  customStatus?: string | null;
}

