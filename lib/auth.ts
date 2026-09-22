import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  expires: Date;
  path: string;
}

export function sessionCookieOptions(expiresAt: Date): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  };
}

/**
 * Creates a session row and returns the raw token. Callers decide how to store
 * the cookie (route handlers set it on the returned `NextResponse`, server
 * actions use `cookies()`).
 */
export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  return { token, expiresAt };
}

/** Deletes the session row matching the raw token, if any. */
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session
    .deleteMany({ where: { tokenHash: hashToken(token) } })
    .catch(() => undefined);
}

/** Returns the signed-in user for the current request, or `null`. */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  return session.user;
});

/** Redirects unauthenticated visitors to the login page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
