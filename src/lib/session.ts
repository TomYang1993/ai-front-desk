import "server-only";
import { cookies } from "next/headers";
import type { CenterId } from "@/content";
import type { DemoAccount } from "@/content/accounts";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession, type Session } from "./session-token";

export type { Session };

export async function getSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function startSession(account: DemoAccount) {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const session: Session =
    account.role === "parent"
      ? { role: "parent", centerId: account.centerId, familyId: account.familyId!, exp }
      : { role: "director", centerId: account.centerId, staffId: account.staffId!, exp };
  (await cookies()).set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
  return session;
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Who a parent API request is for. A signed-in parent always gets their own
 * family, whatever the body says. Outside production, a request with no
 * session may name the center and family itself, so the scorecard and
 * other test scripts keep working.
 */
export async function resolveParent(body: { centerId?: CenterId; familyId?: string | null }): Promise<{ centerId: CenterId; familyId: string | null } | null> {
  const session = await getSession();
  if (session?.role === "parent") return { centerId: session.centerId, familyId: session.familyId };
  if (session || process.env.VERCEL_ENV === "production" || !body.centerId) return null;
  return { centerId: body.centerId, familyId: body.familyId ?? null };
}

/**
 * Which center a control center request is for. A signed-in director always gets
 * their own center. Outside production, a request with no session may name
 * a center, acting as its director, so the scorecard can walk the
 * "answer once" loop.
 */
export async function resolveDirector(body: { centerId?: CenterId | null }): Promise<{ centerId: CenterId; staffId: string | null } | null> {
  const session = await getSession();
  if (session?.role === "director") return { centerId: session.centerId, staffId: session.staffId };
  if (session || process.env.VERCEL_ENV === "production" || !body.centerId) return null;
  return { centerId: body.centerId, staffId: null };
}
