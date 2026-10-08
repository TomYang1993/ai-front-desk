import { z } from "zod";
import { getFamily, getHandoffs, updateHandoff } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";
import { keepNames } from "@/lib/engine/context";
import { translate } from "@/lib/engine/translate";

const Body = z.object({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  text: z.string().trim().min(1).max(2000),
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
  const { center, staffName } = who;
  const handoff = (await getHandoffs(center.id)).find((h) => h.id === id);
  if (!handoff) return Response.json({ error: "Unknown handoff" }, { status: 404 });

  const family = handoff.familyId ? await getFamily(center.id, handoff.familyId) : undefined;
  let translated: { language: typeof handoff.language; text: string } | undefined;
  let kept = false;
  if (handoff.language !== "en") {
    const t = await translate(parsed.data.text, handoff.language, keepNames(center, family));
    if (t.ok) translated = { language: handoff.language, text: t.text };
    else kept = true;
  }
  const updated = await updateHandoff(center.id, id, (h) => ({
    ...h,
    status: "answered",
    reply: { text: parsed.data.text, by: staffName, at: new Date().toISOString(), ...(translated ? { translated } : {}) },
  }));
  return Response.json({ handoff: updated, keptEnglish: kept });
}
