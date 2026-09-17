import * as jose from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const COOKIE_NAME = "crm_token";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "ganti-di-vps-minimal-32-karakter"
);

export type SessionUser = { id: number; role: string; email: string };

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function signToken(payload: SessionUser) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser> {
  const { payload } = await jose.jwtVerify(token, SECRET);
  return payload as unknown as SessionUser;
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

/** Dukung Bearer (curl/JS lama) + cookie httpOnly (browser). */
export async function getSession(req: Request): Promise<SessionUser | null> {
  const bearer = getBearerToken(req);
  if (bearer) {
    try {
      return await verifyToken(bearer);
    } catch {
      // lanjut cek cookie
    }
  }
  try {
    const jar = await cookies();
    const c = jar.get(COOKIE_NAME)?.value;
    if (!c) return null;
    return await verifyToken(c);
  } catch {
    return null;
  }
}

/** Helper standar untuk API: return user atau NextResponse 401. */
export async function requireApiUser(
  req: Request,
  roles?: string[]
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSession(req);
  if (!user) return { response: NextResponse.json({ message: "Belum login" }, { status: 401 }) };
  if (roles && !roles.includes(user.role))
    return { response: NextResponse.json({ message: "Tidak punya izin" }, { status: 403 }) };
  return { user };
}

export async function setAuthCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 3600,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
