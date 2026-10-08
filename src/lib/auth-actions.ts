"use server";

import { redirect } from "next/navigation";
import { DEMO_PASSWORD, findAccount } from "@/content/accounts";
import { endSession, startSession } from "./session";
import { homeFor } from "./session-token";

export interface SignInState {
  error?: string;
  email?: string;
}

/**
 * Simulated sign-in. The form checks a demo email and the shared demo
 * password; the "Demo accounts" buttons send only the email.
 */
export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const demo = form.get("demo");
  const email = String(demo ?? form.get("email") ?? "");
  const account = findAccount(email);
  if (!demo) {
    if (!account || form.get("password") !== DEMO_PASSWORD) {
      return { error: "That email and password don't match a demo account.", email };
    }
  }
  if (!account) return { error: "That demo account doesn't exist." };
  const session = await startSession(account);
  redirect(homeFor(session));
}

export async function signOut() {
  await endSession();
  redirect("/signin");
}
