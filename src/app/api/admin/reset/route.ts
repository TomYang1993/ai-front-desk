import { resetDemo } from "@/lib/data";
import { getSession } from "@/lib/session";

/**
 * Restores all demo content and regenerates history relative to now. In
 * production only a signed-in director can do this; locally anyone can.
 */
export async function POST() {
  if (process.env.VERCEL_ENV === "production" && (await getSession())?.role !== "director") {
    return Response.json({ error: "Sign in as a director to reset the demo" }, { status: 403 });
  }
  const started = Date.now();
  await resetDemo();
  return Response.json({ ok: true, ms: Date.now() - started });
}
