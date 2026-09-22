/**
 * Shared Google OAuth helpers. Kept out of the route handlers so `route.ts`
 * files only export HTTP method handlers.
 */

/** Resolves the OAuth redirect URI, allowing an env override for deployments. */
export function googleRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/auth/google/callback`
  );
}
