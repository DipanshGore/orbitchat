import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const createChannelSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Channel name must be lowercase alphanumeric and dashes only"),
  description: z.string().max(200).optional(),
  isPrivate: z.boolean().optional().default(false),
});

// GET /api/channels - List channels with unread count and last message
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;

    // Get all public channels or channels the user is a member of
    const channels = await db.channel.findMany({
      where: {
        OR: [{ isPrivate: false }, { members: { some: { userId: currentUserId } } }],
      },
      include: {
        members: {
          select: { userId: true },
        },
        lastReads: {
          where: { userId: currentUserId },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute unread count for each channel
    const channelsWithDetails = await Promise.all(
      channels.map(async (c) => {
        const lastRead = c.lastReads[0]?.lastReadAt || new Date(0);
        const unreadCount = await db.message.count({
          where: {
            channelId: c.id,
            isDeleted: false,
            createdAt: { gt: lastRead },
            senderId: { not: currentUserId },
          },
        });

        const isMember = c.members.some((m) => m.userId === currentUserId);
        const lastMsg = c.messages[0] || null;

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          isPrivate: c.isPrivate,
          createdAt: c.createdAt.toISOString(),
          memberCount: c.members.length,
          isMember,
          unreadCount,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                type: lastMsg.type,
                senderId: lastMsg.senderId,
                senderName: lastMsg.sender.displayName,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    // Sort unread channels first, then by last message time or creation
    channelsWithDetails.sort((a, b) => {
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
        return a.unreadCount > 0 ? -1 : 1;
      }
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    res.json({ channels: channelsWithDetails });
  } catch (error) {
    console.error("Get channels error:", error);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// POST /api/channels - Create a new channel
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = createChannelSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || "Invalid channel payload" });
      return;
    }

    const { name, description, isPrivate } = parse.data;

    const existing = await db.channel.findUnique({
      where: { name: name.toLowerCase() },
    });

    if (existing) {
      res.status(409).json({ error: "Channel with this name already exists" });
      return;
    }

    const channel = await db.channel.create({
      data: {
        name: name.toLowerCase(),
        description: description || null,
        isPrivate: !!isPrivate,
        members: {
          create: {
            userId: req.user!.id,
            role: "owner",
          },
        },
      },
    });

    res.status(201).json({ channel });
  } catch (error) {
    console.error("Create channel error:", error);
    res.status(500).json({ error: "Failed to create channel" });
  }
});

// GET /api/channels/:id - Get channel details and members
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = String(req.params.id);
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
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
        },
      },
    });

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Check membership if private
    const isMember = channel.members.some((m) => m.userId === req.user!.id);
    if (channel.isPrivate && !isMember) {
      res.status(403).json({ error: "Access denied to private channel" });
      return;
    }

    res.json({ channel, isMember });
  } catch (error) {
    console.error("Get channel error:", error);
    res.status(500).json({ error: "Failed to fetch channel details" });
  }
});

// POST /api/channels/:id/join - Join a channel
router.post("/:id/join", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = String(req.params.id);
    const channel = await db.channel.findUnique({ where: { id: channelId } });

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    if (channel.isPrivate) {
      res.status(403).json({ error: "Cannot self-join private channel" });
      return;
    }

    const membership = await db.channelMember.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId: req.user!.id,
        },
      },
      update: {},
      create: {
        channelId,
        userId: req.user!.id,
        role: "member",
      },
    });

    res.json({ success: true, membership });
  } catch (error) {
    console.error("Join channel error:", error);
    res.status(500).json({ error: "Failed to join channel" });
  }
});

// POST /api/channels/:id/leave - Leave a channel
router.post("/:id/leave", async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = String(req.params.id);
    await db.channelMember.deleteMany({
      where: {
        channelId,
        userId: req.user!.id,
      },
    });
    res.json({ success: true, message: "Left channel" });
  } catch (error) {
    console.error("Leave channel error:", error);
    res.status(500).json({ error: "Failed to leave channel" });
  }
});

export default router;
