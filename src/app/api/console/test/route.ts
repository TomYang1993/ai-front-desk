import { z } from "zod";
import { ask } from "@/lib/engine";
import { getFamily } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";

const Body = z.object({
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  familyId: z.string().nullable(),
  message: z.string().trim().min(1).max(1000),
});

/**
 * The director's test box: ask as any family and see what Maple would say,
 * with its sources and steps. Nothing is logged, cached or handed off.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Type a question" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const { familyId, message } = parsed.data;
  if (familyId && !(await getFamily(who.center.id, familyId))) return Response.json({ error: "Unknown family" }, { status: 400 });
  const reply = await ask({ centerId: who.center.id, familyId, message, dryRun: true });
  return Response.json(reply);
}
