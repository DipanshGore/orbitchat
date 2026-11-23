import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const startDmSchema = z.object({
  targetUserId: z.string().min(1),
});

// Helper to order two user IDs
function getSortedPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// GET /api/conversations/bot - Instant 1-click access to OrbitBot AI conversation
router.get("/bot", async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    let botUser = await db.user.findFirst({ where: { isBot: true } });

    if (!botUser) {
      const passwordHash = await bcrypt.hash("password123", 10);
      botUser = await db.user.create({
        data: {
          email: "bot@orbit.chat",
          username: "orbitbot",
          displayName: "OrbitBot AI",
          passwordHash,
          avatar: "sun",
          status: "online",
          customStatus: "Orbital Intelligence Assistant 🤖",
          isBot: true,
          isGuest: false,
        },
      });
    }

    const [u1, u2] = getSortedPair(currentUserId, botUser.id);
    let conv = await db.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });

    if (!conv) {
      conv = await db.conversation.create({
        data: { user1Id: u1, user2Id: u2 },
      });
      await db.message.create({
        data: {
          conversationId: conv.id,
          senderId: botUser.id,
          content: `Greetings, ${req.user!.displayName}! I am OrbitBot AI, your interactive assistant aboard OrbitChat Station. Feel free to ask me anything or chat anytime! 🛰️`,
          type: "text",
        },
      });
    }

    res.json({ conversationId: conv.id });
  } catch (error) {
    console.error("Bot conversation error:", error);
    res.status(500).json({ error: "Failed to open OrbitBot conversation" });
  }
});

// GET /api/conversations - List all DMs with otherUser and unread count
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;

    // Ensure this user has a direct conversation with OrbitBot
    try {
      const botUser = await db.user.findFirst({ where: { isBot: true } });
      if (botUser && botUser.id !== currentUserId) {
        const [u1, u2] = getSortedPair(currentUserId, botUser.id);
        const existingBotConv = await db.conversation.findUnique({
          where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        });
        if (!existingBotConv) {
          const newBotConv = await db.conversation.create({
            data: {
              user1Id: u1,
              user2Id: u2,
            },
          });
          await db.message.create({
            data: {
              conversationId: newBotConv.id,
              senderId: botUser.id,
              content: `Greetings, ${req.user!.displayName}! I am OrbitBot AI, your interactive assistant aboard OrbitChat Station. Feel free to ask me anything or chat anytime! 🛰️`,
              type: "text",
            },
          });
        }
      }
    } catch (botConvErr) {
      console.warn("Could not ensure bot conversation:", botConvErr);
    }

    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
      },
      include: {
        user1: {
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
        user2: {
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
        lastReads: {
          where: { userId: currentUserId },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.user1Id === currentUserId ? conv.user2 : conv.user1;
        const lastRead = conv.lastReads[0]?.lastReadAt || new Date(0);

        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            createdAt: { gt: lastRead },
            senderId: { not: currentUserId },
          },
        });

        const lastMsg = conv.messages[0] || null;

        return {
          id: conv.id,
          user1Id: conv.user1Id,
          user2Id: conv.user2Id,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
          otherUser,
          unreadCount,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                type: lastMsg.type,
                senderId: lastMsg.senderId,
                senderName: lastMsg.senderId === currentUserId ? "You" : otherUser.displayName,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    // Sort unread conversations first
    formatted.sort((a, b) => {
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
        return a.unreadCount > 0 ? -1 : 1;
      }
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    res.json({ conversations: formatted });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// POST /api/conversations - Get or create a 1:1 conversation
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = startDmSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid target user" });
      return;
    }

    const { targetUserId } = parse.data;
    const currentUserId = req.user!.id;

    if (targetUserId === currentUserId) {
      res.status(400).json({ error: "Cannot create DM with yourself" });
      return;
    }

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
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
    });

    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    const [u1, u2] = getSortedPair(currentUserId, targetUserId);

    let conversation = await db.conversation.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id: u1,
          user2Id: u2,
        },
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          user1Id: u1,
          user2Id: u2,
        },
        include: {
          user1: true,
          user2: true,
        },
      });
    }

    const otherUser = conversation.user1Id === currentUserId ? conversation.user2 : conversation.user1;

    res.json({
      conversation: {
        id: conversation.id,
        user1Id: conversation.user1Id,
        user2Id: conversation.user2Id,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        otherUser: {
          id: otherUser.id,
          email: otherUser.email,
          username: otherUser.username,
          displayName: otherUser.displayName,
          avatar: otherUser.avatar,
          status: otherUser.status,
          customStatus: otherUser.customStatus,
          isGuest: otherUser.isGuest,
          isBot: otherUser.isBot,
          createdAt: otherUser.createdAt.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// GET /api/conversations/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const convId = String(req.params.id);
    const currentUserId = req.user!.id;

    const conv = await db.conversation.findUnique({
      where: { id: convId },
      include: {
        user1: {
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
        user2: {
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

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (conv.user1Id !== currentUserId && conv.user2Id !== currentUserId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const otherUser = conv.user1Id === currentUserId ? conv.user2 : conv.user1;

    res.json({
      conversation: {
        id: conv.id,
        user1Id: conv.user1Id,
        user2Id: conv.user2Id,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        otherUser,
      },
    });
  } catch (error) {
    console.error("Get conversation details error:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

export default router;
