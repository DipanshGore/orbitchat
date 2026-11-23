import { Request, Response, NextFunction } from "express";
import { parseCookies, verifySessionToken, TokenPayload } from "../lib/jwt.js";
import { db } from "../lib/db.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  status: string;
  customStatus?: string | null;
  isGuest: boolean;
  isBot: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tokenPayload?: TokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    let token = cookies["orbit_session"];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
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
      },
    });

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

