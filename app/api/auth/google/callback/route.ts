import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { googleRedirectUri } from "@/lib/google";

const OAUTH_STATE_COOKIE = "oauth_state";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}

function fail(origin: string, reason: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(`/login?error=${reason}`, origin),
  );
  response.cookies.set(OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

/** Completes the Google OAuth flow and signs the user in. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // `state` must round-trip to prevent login CSRF.
  if (error || !code || !state || !storedState || state !== storedState) {
    return fail(origin, "oauth");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail(origin, "config");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenData.access_token) {
    return fail(origin, "token");
  }

  const userRes = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );
  if (!userRes.ok) {
    return fail(origin, "userinfo");
  }

  const profile = (await userRes.json()) as GoogleUserInfo;
  if (!profile.sub || !profile.email) {
    return fail(origin, "email");
  }

  // Link by Google id, then by email, then create a brand-new account.
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: profile.sub,
        name: profile.name ?? user.name,
        image: profile.picture ?? user.image,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name ?? null,
        image: profile.picture ?? null,
      },
    });
  }

  const { token, expiresAt } = await createSession(user.id);

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  response.cookies.set(OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
