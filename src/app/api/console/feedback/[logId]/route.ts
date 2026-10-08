import { z } from "zod";
import { markFeedbackHandled } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";

const Body = z.object({
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  how: z.enum(["source", "answer", "reviewed"]),
});

/** Marks an unhelpful answer as dealt with, and how. */
export async function POST(request: Request, ctx: RouteContext<"/api/console/feedback/[logId]">) {
  const { logId } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  await markFeedbackHandled(who.center.id, logId, { by: who.staffName, at: new Date().toISOString(), how: parsed.data.how });
  return Response.json({ ok: true });
}
