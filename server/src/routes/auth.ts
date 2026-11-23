import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.js";
import { signSessionToken, serializeCookie, clearCookieString } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, "Alphanumeric, dash and underscore only"),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50),
  avatar: z.string().optional().default("mars"),
});

const loginSchema = z.object({
  identifier: z.string().min(1), // email or username
  password: z.string().min(1),
});

const guestSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
});

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatar: z.string().optional(),
  status: z.enum(["online", "away", "busy", "offline"]).optional(),
  customStatus: z.string().max(100).nullable().optional(),
});

// Helper to set session cookie
async function issueSession(res: Response, user: { id: string; username: string; email: string; isGuest: boolean }) {
  const token = await signSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    isGuest: user.isGuest,
  });

  const cookieStr = serializeCookie("orbit_session", token);
  res.setHeader("Set-Cookie", cookieStr);
  return token;
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || "Validation failed" });
      return;
    }

    const { username, email, password, displayName, avatar } = parse.data;

    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      },
    });

    if (existing) {
      res.status(409).json({ error: "Username or email is already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName,
        avatar: avatar || "mars",
        passwordHash,
        status: "online",
        isGuest: false,
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
    });

    // Auto-join public channels
    const publicChannels = await db.channel.findMany({ where: { isPrivate: false } });
    for (const channel of publicChannels) {
      await db.channelMember.create({
        data: {
          channelId: channel.id,
          userId: user.id,
          role: "member",
        },
      });
    }

    const token = await issueSession(res, user);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid credentials format" });
      return;
    }

    const { identifier, password } = parse.data;
    const lowerIdent = identifier.toLowerCase();

    const user = await db.user.findFirst({
      where: {
        OR: [{ email: lowerIdent }, { username: lowerIdent }],
      },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid username/email or password" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid username/email or password" });
      return;
    }

    // Update status to online
    await db.user.update({
      where: { id: user.id },
      data: { status: "online" },
    });

    const token = await issueSession(res, user);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        status: "online",
        customStatus: user.customStatus,
        isGuest: user.isGuest,
        isBot: user.isBot,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/guest - Quick Join
router.post("/guest", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = guestSchema.safeParse(req.body);
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    const username = `guest_${guestNum}`;
    const displayName = parse.success && parse.data.displayName ? parse.data.displayName : `Cosmic Traveler ${guestNum}`;
    const email = `guest_${guestNum}@orbit.guest`;
    const passwordHash = await bcrypt.hash("guest_pass_" + Math.random(), 6);

    const planetAvatars = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
    const randomAvatar = planetAvatars[Math.floor(Math.random() * planetAvatars.length)] || "earth";

    const user = await db.user.create({
      data: {
        username,
        email,
        displayName,
        passwordHash,
        avatar: randomAvatar,
        status: "online",
        customStatus: "Visiting OrbitChat 🚀",
        isGuest: true,
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
    });

    // Auto-join public channels
    const publicChannels = await db.channel.findMany({ where: { isPrivate: false } });
    for (const channel of publicChannels) {
      await db.channelMember.create({
        data: {
          channelId: channel.id,
          userId: user.id,
          role: "member",
        },
      });
    }

    const token = await issueSession(res, user);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Guest quick-join error:", error);
    res.status(500).json({ error: "Failed to initialize guest session" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    try {
      await db.user.update({
        where: { id: req.user.id },
        data: { status: "offline" },
      });
    } catch {}
  }
  res.setHeader("Set-Cookie", clearCookieString("orbit_session"));
  res.json({ success: true, message: "Logged out" });
});

// PATCH /api/auth/profile - Update Orbital Identity
router.patch("/profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = profileUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || "Invalid profile data" });
      return;
    }

    const updated = await db.user.update({
      where: { id: req.user!.id },
      data: parse.data,
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

    res.json({ user: updated });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;

