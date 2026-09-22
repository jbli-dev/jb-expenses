import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GoogleIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sign in",
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth: "The sign-in request could not be verified. Please try again.",
  config: "Google sign-in is not configured on the server.",
  token: "Google could not authorize your account. Please try again.",
  userinfo: "Could not fetch your Google profile. Please try again.",
  email: "Your Google account does not have a verified email address.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (user) {
    redirect("/");
  }

  const message = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center py-16">
      <div className="card p-8">
        <div className="mb-8 text-center">
          <span className="brand-mark mx-auto mb-4">$</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your Google account to continue.
          </p>
        </div>

        <a href="/api/auth/google" className="btn-primary w-full">
          <GoogleIcon className="h-5 w-5" />
          Sign in with Google
        </a>

        {message ? (
          <p className="mt-4 text-center text-sm text-rose-600">{message}</p>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-400">
          New here? Signing in creates your account automatically.
        </p>
      </div>
    </div>
  );
}
