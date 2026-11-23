import { Router, Request, Response } from "express";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/users - List users
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const users = await db.user.findMany({
      where: {
        id: { not: currentUserId },
      },
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
      orderBy: { displayName: "asc" },
    });

    res.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/search - Global search for Cmd+K palette (channels, people, messages)
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || "").trim().toLowerCase();
    if (!q) {
      res.json({ channels: [], people: [], messages: [] });
      return;
    }

    const currentUserId = req.user!.id;

    // Search channels
    const channels = await db.channel.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        isPrivate: true,
      },
    });

    // Search people
    const people = await db.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: q } },
              { displayName: { contains: q } },
            ],
          },
        ],
      },
      take: 10,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        status: true,
        customStatus: true,
        isBot: true,
      },
    });

    // Search messages accessible to user
    const messages = await db.message.findMany({
      where: {
        isDeleted: false,
        content: { contains: q },
        OR: [
          { channelId: { not: null } },
          { conversation: { OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }] } },
        ],
      },
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            displayName: true,
            username: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      channels,
      people,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        channelId: m.channelId,
        conversationId: m.conversationId,
        channelName: m.channel?.name || null,
        senderName: m.sender.displayName,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to perform search" });
  }
});

export default router;

