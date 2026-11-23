import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "orbitchat_super_secret_jwt_key_2026_xyz";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  isGuest: boolean;
}

export async function signSessionToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const key = parts[0]?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.slice(1).join("=").trim());
    }
  });

  return list;
}

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
}

export function serializeCookie(name: string, val: string, options = getCookieOptions()): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(val)}; Path=${options.path}; HttpOnly`;
  if (options.maxAge) {
    cookie += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
  }
  if (options.secure) {
    cookie += "; Secure";
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
  }
  return cookie;
}

export function clearCookieString(name: string): string {
  const isProd = process.env.NODE_ENV === "production";
  let cookie = `${encodeURIComponent(name)}=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (isProd) {
    cookie += "; Secure; SameSite=None";
  } else {
    cookie += "; SameSite=Lax";
  }
  return cookie;
}

