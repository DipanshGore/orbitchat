import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { parseCookies, verifySessionToken } from "./lib/jwt.js";
import { db } from "./lib/db.js";

let io: Server | null = null;

// Track active sockets per user: userId -> Set of socket IDs
const userSockets = new Map<string, Set<string>>();

export function getIO(): Server | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer, clientUrl: string): Server {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      // Check auth handshake token or cookie
      const cookies = parseCookies(socket.handshake.headers.cookie);
      let token = cookies["orbit_session"] || (socket.handshake.auth?.token as string | undefined);

      if (!token && socket.handshake.headers.authorization?.startsWith("Bearer ")) {
        token = socket.handshake.headers.authorization.split(" ")[1];
      }

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = await verifySessionToken(token);
      if (!payload || !payload.userId) {
        return next(new Error("Invalid session token"));
      }

      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
          customStatus: true,
          isGuest: true,
          isBot: true,
        },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user to socket data
      socket.data.user = user;
      next();
    } catch (err) {
      console.error("Socket auth error:", err);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const user = socket.data.user;
    const userId = user.id;

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal channel for direct alerts/DMs
    socket.join(`user:${userId}`);

    // Update status to online in DB and broadcast presence
    await db.user.update({
      where: { id: userId },
      data: { status: "online" },
    });

    socket.broadcast.emit("presence:update", {
      userId,
      status: "online",
      customStatus: user.customStatus,
    });

    // Auto-join public channels & existing memberships
    const userChannels = await db.channelMember.findMany({
      where: { userId },
      select: { channelId: true },
    });
    for (const member of userChannels) {
      socket.join(`channel:${member.channelId}`);
    }

    // Auto-join conversations
    const userConvs = await db.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: { id: true },
    });
    for (const conv of userConvs) {
      socket.join(`conversation:${conv.id}`);
    }

    // Handle joining a specific channel room
    socket.on("channel:join", (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    // Handle leaving a channel room
    socket.on("channel:leave", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Handle joining a conversation room
    socket.on("conversation:join", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Typing start
    socket.on("typing:start", (payload: { chatId: string; isChannel: boolean }) => {
      const room = payload.isChannel ? `channel:${payload.chatId}` : `conversation:${payload.chatId}`;
      socket.to(room).emit("typing:update", {
        chatId: payload.chatId,
        isChannel: payload.isChannel,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
        isTyping: true,
      });
    });

    // Typing stop
    socket.on("typing:stop", (payload: { chatId: string; isChannel: boolean }) => {
      const room = payload.isChannel ? `channel:${payload.chatId}` : `conversation:${payload.chatId}`;
      socket.to(room).emit("typing:update", {
        chatId: payload.chatId,
        isChannel: payload.isChannel,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
        isTyping: false,
      });
    });

    // Presence update manually triggered by user (e.g. online, away, busy)
    socket.on("presence:change", async (payload: { status: string; customStatus?: string | null }) => {
      try {
        await db.user.update({
          where: { id: userId },
          data: {
            status: payload.status,
            customStatus: payload.customStatus,
          },
        });

        io?.emit("presence:update", {
          userId,
          status: payload.status,
          customStatus: payload.customStatus,
        });
      } catch (err) {
        console.error("Presence update error:", err);
      }
    });

    // Disconnect handling
    socket.on("disconnect", async () => {
      const userConns = userSockets.get(userId);
      if (userConns) {
        userConns.delete(socket.id);
        if (userConns.size === 0) {
          userSockets.delete(userId);

          // Mark user offline after small grace period or immediately
          setTimeout(async () => {
            if (!userSockets.has(userId)) {
              await db.user.update({
                where: { id: userId },
                data: { status: "offline" },
              }).catch(() => {});

              io?.emit("presence:update", {
                userId,
                status: "offline",
                customStatus: user.customStatus,
              });
            }
          }, 3000);
        }
      }
    });
  });

  return io;
}

