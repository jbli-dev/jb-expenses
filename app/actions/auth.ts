"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revokeSession, SESSION_COOKIE } from "@/lib/auth";

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  await revokeSession(token);
  cookieStore.delete(SESSION_COOKIE);

  redirect("/login");
}
