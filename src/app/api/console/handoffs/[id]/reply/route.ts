import { z } from "zod";
import { getHandoffs } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";
import { sendReply } from "@/lib/console-reply";

const Body = z.object({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  text: z.string().trim().min(1).max(2000),
  /** Set when the director sends an answer already saved for this question. */
  savedAnswerId: z.string().optional(),
});

/**
 * A staff reply to a handoff. The parent sees it in their chat, translated
 * into their language when it isn't English; the original stays alongside.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/console/handoffs/[id]/reply">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Write a reply first" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const handoff = (await getHandoffs(who.center.id)).find((h) => h.id === id);
  if (!handoff) return Response.json({ error: "Unknown handoff" }, { status: 404 });
  const savedAnswerId = parsed.data.savedAnswerId && who.center.savedAnswers.some((a) => a.id === parsed.data.savedAnswerId) ? parsed.data.savedAnswerId : undefined;
  return Response.json(await sendReply(who.center, who.staffName, handoff, parsed.data.text, savedAnswerId));
}
