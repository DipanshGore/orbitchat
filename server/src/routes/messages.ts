import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { processOrbitBotCommand } from "../lib/bot.js";
import { getIO } from "../socket.js";

const router = Router();
router.use(requireAuth);

const sendMessageSchema = z.object({
  channelId: z.string().optional(),
  conversationId: z.string().optional(),
  content: z.string().min(1).max(5000),
  type: z.enum(["text", "code", "image", "file", "voice"]).optional().default("text"),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  replyToId: z.string().optional(),
  tempId: z.string().optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// GET /api/messages - Cursor-based pagination
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = req.query.channelId as string | undefined;
    const conversationId = req.query.conversationId as string | undefined;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);

    if (!channelId && !conversationId) {
      res.status(400).json({ error: "Either channelId or conversationId is required" });
      return;
    }

    const currentUserId = req.user!.id;

    // Validate access
    if (channelId) {
      const channel = await db.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        res.status(404).json({ error: "Channel not found" });
        return;
      }
      if (channel.isPrivate) {
        const isMember = await db.channelMember.findUnique({
          where: { channelId_userId: { channelId, userId: currentUserId } },
        });
        if (!isMember) {
          res.status(403).json({ error: "Access denied to private channel" });
          return;
        }
      }
    } else if (conversationId) {
      const conv = await db.conversation.findUnique({ where: { id: conversationId } });
      if (!conv || (conv.user1Id !== currentUserId && conv.user2Id !== currentUserId)) {
        res.status(403).json({ error: "Access denied to conversation" });
        return;
      }
    }

    const messages = await db.message.findMany({
      where: channelId
        ? { channelId, isDeleted: false }
        : { conversationId, isDeleted: false },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
            customStatus: true,
            isGuest: true,
            isBot: true,
            createdAt: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                displayName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id || null;
    }

    // Return in chronological order (oldest to newest)
    const items = messages.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type as any,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      channelId: m.channelId,
      conversationId: m.conversationId,
      senderId: m.senderId,
      replyToId: m.replyToId,
      replyTo: m.replyTo,
      sender: {
        id: m.sender.id,
        email: m.sender.email,
        username: m.sender.username,
        displayName: m.sender.displayName,
        avatar: m.sender.avatar,
        status: m.sender.status as any,
        customStatus: m.sender.customStatus,
        isGuest: m.sender.isGuest,
        isBot: m.sender.isBot,
        createdAt: m.sender.createdAt.toISOString(),
      },
      isEdited: m.isEdited,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      status: "sent" as const,
    }));

    res.json({
      messages: items,
      nextCursor,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages - Send a message
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = sendMessageSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || "Invalid message format" });
      return;
    }

    const {
      channelId,
      conversationId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyToId,
      tempId,
    } = parse.data;

    if (!channelId && !conversationId) {
      res.status(400).json({ error: "Target channelId or conversationId required" });
      return;
    }

    const currentUserId = req.user!.id;

    // Verify channel or conversation membership
    if (channelId) {
      const channel = await db.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        res.status(404).json({ error: "Channel not found" });
        return;
      }
      if (channel.isPrivate) {
        const isMember = await db.channelMember.findUnique({
          where: { channelId_userId: { channelId, userId: currentUserId } },
        });
        if (!isMember) {
          res.status(403).json({ error: "Access denied" });
          return;
        }
      }
    } else if (conversationId) {
      const conv = await db.conversation.findUnique({ where: { id: conversationId } });
      if (!conv || (conv.user1Id !== currentUserId && conv.user2Id !== currentUserId)) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    const message = await db.message.create({
      data: {
        channelId: channelId || null,
        conversationId: conversationId || null,
        senderId: currentUserId,
        content,
        type,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
            customStatus: true,
            isGuest: true,
            isBot: true,
            createdAt: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                displayName: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Update sender's LastRead to now
    if (channelId) {
      await db.lastRead.upsert({
        where: { userId_channelId: { userId: currentUserId, channelId } },
        update: { lastReadAt: new Date(), lastMessageId: message.id },
        create: { channelId, userId: currentUserId, lastReadAt: new Date(), lastMessageId: message.id },
      });
    } else if (conversationId) {
      await db.lastRead.upsert({
        where: { userId_conversationId: { userId: currentUserId, conversationId } },
        update: { lastReadAt: new Date(), lastMessageId: message.id },
        create: { conversationId, userId: currentUserId, lastReadAt: new Date(), lastMessageId: message.id },
      });
      await db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    const formattedMessage = {
      id: message.id,
      content: message.content,
      type: message.type as any,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      mimeType: message.mimeType,
      channelId: message.channelId,
      conversationId: message.conversationId,
      senderId: message.senderId,
      replyToId: message.replyToId,
      replyTo: message.replyTo,
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        username: message.sender.username,
        displayName: message.sender.displayName,
        avatar: message.sender.avatar,
        status: message.sender.status as any,
        customStatus: message.sender.customStatus,
        isGuest: message.sender.isGuest,
        isBot: message.sender.isBot,
        createdAt: message.sender.createdAt.toISOString(),
      },
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      tempId,
      status: "sent" as const,
    };

    // Broadcast via socket.io
    const io = getIO();
    if (io) {
      const room = channelId ? `channel:${channelId}` : `conversation:${conversationId}`;
      io.to(room).emit("message:created", formattedMessage);

      // Also notify unread count update for conversation participants or channel members
      if (conversationId) {
        const conv = await db.conversation.findUnique({ where: { id: conversationId } });
        if (conv) {
          const recipientId = conv.user1Id === currentUserId ? conv.user2Id : conv.user1Id;
          io.to(`user:${recipientId}`).emit("unread:update", {
            conversationId,
            increment: 1,
            lastMessage: formattedMessage,
          });
        }
      } else if (channelId) {
        io.to(`channel:${channelId}`).emit("unread:update", {
          channelId,
          increment: 1,
          lastMessage: formattedMessage,
          senderId: currentUserId,
        });
      }
    }

    res.status(201).json({ message: formattedMessage });

    // Asynchronously handle AI OrbitBot interactions and commands
    (async () => {
      try {
        const botUser = await db.user.findFirst({ where: { isBot: true } });
        if (!botUser) return;

        // Check if message is in a DM with OrbitBot
        let isDirectWithBot = false;
        if (conversationId) {
          const conv = await db.conversation.findUnique({ where: { id: conversationId } });
          if (conv && (conv.user1Id === botUser.id || conv.user2Id === botUser.id)) {
            isDirectWithBot = true;
          }
        }

        // Check if message is replying to OrbitBot
        let isReplyToBot = false;
        let replyToContent = "";
        if (replyToId) {
          const repliedMsg = await db.message.findUnique({ where: { id: replyToId } });
          if (repliedMsg && repliedMsg.senderId === botUser.id) {
            isReplyToBot = true;
            replyToContent = repliedMsg.content;
          }
        }

        const trimmedLower = content.trim().toLowerCase();
        const isMention =
          trimmedLower.includes("@orbitbot") ||
          trimmedLower.includes("@bot") ||
          trimmedLower.startsWith("orbitbot") ||
          trimmedLower.startsWith("hey orbitbot") ||
          trimmedLower.startsWith("hi orbitbot");

        const isCommand =
          trimmedLower.startsWith("/help") ||
          trimmedLower.startsWith("/ask") ||
          trimmedLower.startsWith("/ai") ||
          trimmedLower.startsWith("/bot") ||
          trimmedLower.startsWith("/summarize");

        if (isDirectWithBot || isReplyToBot || isMention || isCommand) {
          const room = channelId ? `channel:${channelId}` : `conversation:${conversationId}`;

          // Emit real-time typing indicator for OrbitBot
          if (io) {
            io.to(room).emit("typing:update", {
              chatId: channelId || conversationId,
              isChannel: !!channelId,
              user: {
                id: botUser.id,
                username: botUser.username,
                displayName: botUser.displayName,
              },
              isTyping: true,
            });
          }

          const botResult = await processOrbitBotCommand(content, {
            channelId: channelId || undefined,
            conversationId: conversationId || undefined,
            userName: req.user!.displayName,
            isDirectWithBot,
            isMention,
            isReplyToBot,
            replyToContent,
          });

          // Stop typing indicator
          if (io) {
            io.to(room).emit("typing:update", {
              chatId: channelId || conversationId,
              isChannel: !!channelId,
              user: {
                id: botUser.id,
                username: botUser.username,
                displayName: botUser.displayName,
              },
              isTyping: false,
            });
          }

          if (botResult.isBotCommand && botResult.replyContent) {
            const botMsg = await db.message.create({
              data: {
                channelId: channelId || null,
                conversationId: conversationId || null,
                senderId: botUser.id,
                content: botResult.replyContent,
                type: "text",
                replyToId: message.id,
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    displayName: true,
                    avatar: true,
                    status: true,
                    customStatus: true,
                    isGuest: true,
                    isBot: true,
                    createdAt: true,
                  },
                },
              },
            });

            // Update conversation updatedAt
            if (conversationId) {
              await db.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
              });
            }

            const formattedBotMsg = {
              id: botMsg.id,
              content: botMsg.content,
              type: botMsg.type as any,
              fileUrl: null,
              fileName: null,
              fileSize: null,
              mimeType: null,
              channelId: botMsg.channelId,
              conversationId: botMsg.conversationId,
              senderId: botMsg.senderId,
              replyToId: message.id,
              replyTo: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                sender: {
                  displayName: req.user!.displayName,
                  username: req.user!.username,
                },
              },
              sender: {
                id: botMsg.sender.id,
                email: botMsg.sender.email,
                username: botMsg.sender.username,
                displayName: botMsg.sender.displayName,
                avatar: botMsg.sender.avatar,
                status: botMsg.sender.status as any,
                customStatus: botMsg.sender.customStatus,
                isGuest: botMsg.sender.isGuest,
                isBot: botMsg.sender.isBot,
                createdAt: botMsg.sender.createdAt.toISOString(),
              },
              isEdited: false,
              isDeleted: false,
              createdAt: botMsg.createdAt.toISOString(),
              updatedAt: botMsg.updatedAt.toISOString(),
              status: "sent" as const,
            };

            if (io) {
              io.to(room).emit("message:created", formattedBotMsg);

              if (conversationId) {
                io.to(`user:${currentUserId}`).emit("unread:update", {
                  conversationId,
                  increment: 1,
                  lastMessage: formattedBotMsg,
                });
              } else if (channelId) {
                io.to(`channel:${channelId}`).emit("unread:update", {
                  channelId,
                  increment: 1,
                  lastMessage: formattedBotMsg,
                  senderId: botUser.id,
                });
              }
            }
          }
        }
      } catch (botErr) {
        console.error("Bot processing error:", botErr);
      }
    })();
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to transmit message" });
  }
});

// PATCH /api/messages/:id - Edit message
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = editMessageSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || "Invalid edit payload" });
      return;
    }

    const messageId = String(req.params.id);
    const currentUserId = req.user!.id;

    const existing = await db.message.findUnique({ where: { id: messageId } });
    if (!existing) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (existing.senderId !== currentUserId) {
      res.status(403).json({ error: "Can only edit your own messages" });
      return;
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: {
        content: parse.data.content,
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
            customStatus: true,
            isGuest: true,
            isBot: true,
            createdAt: true,
          },
        },
      },
    });

    const formatted = {
      id: updated.id,
      content: updated.content,
      type: updated.type as any,
      channelId: updated.channelId,
      conversationId: updated.conversationId,
      senderId: updated.senderId,
      isEdited: true,
      isDeleted: false,
      updatedAt: updated.updatedAt.toISOString(),
    };

    const io = getIO();
    if (io) {
      const room = updated.channelId ? `channel:${updated.channelId}` : `conversation:${updated.conversationId}`;
      io.to(room).emit("message:updated", formatted);
    }

    res.json({ message: formatted });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const messageId = String(req.params.id);
    const currentUserId = req.user!.id;

    const existing = await db.message.findUnique({ where: { id: messageId } });
    if (!existing) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (existing.senderId !== currentUserId) {
      res.status(403).json({ error: "Can only delete your own messages" });
      return;
    }

    await db.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: "This transmission was deleted.",
      },
    });

    const io = getIO();
    if (io) {
      const room = existing.channelId ? `channel:${existing.channelId}` : `conversation:${existing.conversationId}`;
      io.to(room).emit("message:deleted", {
        id: messageId,
        channelId: existing.channelId,
        conversationId: existing.conversationId,
      });
    }

    res.json({ success: true, messageId });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// POST /api/messages/mark-read - Mark conversation or channel read
router.post("/mark-read", async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId, conversationId } = req.body;
    const currentUserId = req.user!.id;

    if (!channelId && !conversationId) {
      res.status(400).json({ error: "channelId or conversationId required" });
      return;
    }

    if (channelId) {
      await db.lastRead.upsert({
        where: { userId_channelId: { userId: currentUserId, channelId } },
        update: { lastReadAt: new Date() },
        create: { channelId, userId: currentUserId, lastReadAt: new Date() },
      });
    } else if (conversationId) {
      await db.lastRead.upsert({
        where: { userId_conversationId: { userId: currentUserId, conversationId } },
        update: { lastReadAt: new Date() },
        create: { conversationId, userId: currentUserId, lastReadAt: new Date() },
      });
    }

    // Fetch new unread summary
    const unread = await computeUserUnread(currentUserId);

    res.json({ success: true, unread });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: "Failed to update read status" });
  }
});

// GET /api/messages/unread-summary - User total unread
router.get("/unread-summary", async (req: Request, res: Response): Promise<void> => {
  try {
    const unread = await computeUserUnread(req.user!.id);
    res.json(unread);
  } catch (error) {
    console.error("Unread summary error:", error);
    res.status(500).json({ error: "Failed to get unread summary" });
  }
});

export async function computeUserUnread(userId: string) {
  // Channels
  const channelMemberships = await db.channelMember.findMany({
    where: { userId },
    select: { channelId: true },
  });

  const channelsMap: Record<string, number> = {};
  let totalChannelsUnread = 0;

  for (const m of channelMemberships) {
    const lastReadRecord = await db.lastRead.findUnique({
      where: { userId_channelId: { userId, channelId: m.channelId } },
    });
    const lastReadAt = lastReadRecord?.lastReadAt || new Date(0);

    const count = await db.message.count({
      where: {
        channelId: m.channelId,
        isDeleted: false,
        createdAt: { gt: lastReadAt },
        senderId: { not: userId },
      },
    });

    if (count > 0) {
      channelsMap[m.channelId] = count;
      totalChannelsUnread += count;
    }
  }

  // Conversations
  const convs = await db.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    select: { id: true },
  });

  const convsMap: Record<string, number> = {};
  let totalConvsUnread = 0;

  for (const c of convs) {
    const lastReadRecord = await db.lastRead.findUnique({
      where: { userId_conversationId: { userId, conversationId: c.id } },
    });
    const lastReadAt = lastReadRecord?.lastReadAt || new Date(0);

    const count = await db.message.count({
      where: {
        conversationId: c.id,
        isDeleted: false,
        createdAt: { gt: lastReadAt },
        senderId: { not: userId },
      },
    });

    if (count > 0) {
      convsMap[c.id] = count;
      totalConvsUnread += count;
    }
  }

  const activeChatCount = Object.keys(channelsMap).length + Object.keys(convsMap).length;

  return {
    totalUnread: totalChannelsUnread + totalConvsUnread,
    chatsCount: activeChatCount,
    channels: channelsMap,
    conversations: convsMap,
  };
}

export default router;
