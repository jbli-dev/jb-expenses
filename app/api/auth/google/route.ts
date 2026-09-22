import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleRedirectUri } from "@/lib/google";

const OAUTH_STATE_COOKIE = "oauth_state";
const STATE_TTL_SECONDS = 60 * 10;

/**
 * Starts the Google OAuth flow: builds the consent URL and stores a CSRF
 * `state` value in a short-lived cookie for verification in the callback.
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured." },
      { status: 500 },
    );
  }

  const origin = new URL(request.url).origin;
  const state = randomBytes(16).toString("base64url");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri(origin));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });

  return response;
}
