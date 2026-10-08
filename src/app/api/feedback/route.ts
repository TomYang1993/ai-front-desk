import { z } from "zod";
import { setFeedback } from "@/lib/data";
import { resolveParent } from "@/lib/session";

const Body = z.object({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  logId: z.string().max(100),
  value: z.enum(["up", "down"]),
});

/** Thumbs up or down on one of Maple's replies. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const asker = await resolveParent(parsed.data);
  if (!asker) return Response.json({ error: "Sign in as a parent" }, { status: 401 });
  await setFeedback(asker.centerId, parsed.data.logId, parsed.data.value);
  return Response.json({ ok: true });
}
