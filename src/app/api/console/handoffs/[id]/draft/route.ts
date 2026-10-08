import { z } from "zod";
import { getFamily, getHandbook, getHandoffs } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";
import { draftReply, toEnglish } from "@/lib/engine/drafts";
import { zonedParts } from "@/lib/time";

const Body = z.object({ centerId: z.enum(["pinon-grove", "quail-ridge"]).optional() });

/** A suggested reply from the handbook, only when the director asks for one. */
export async function POST(request: Request, ctx: RouteContext<"/api/console/handoffs/[id]/draft">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  const who = await directorFor(parsed.success ? parsed.data : {});
  if ("error" in who) return who.error;
  const { center, staffName } = who;
  const handoff = (await getHandoffs(center.id)).find((h) => h.id === id);
  if (!handoff) return Response.json({ error: "Unknown handoff" }, { status: 404 });
  const [family, sections, english] = await Promise.all([
    handoff.familyId ? getFamily(center.id, handoff.familyId) : Promise.resolve(undefined),
    getHandbook(center.id),
    handoff.language === "en" ? Promise.resolve(new Map<string, string>()) : toEnglish([handoff.text]),
  ]);
  try {
    const draft = await draftReply({
      center,
      family,
      sections,
      staffName,
      question: handoff.text,
      questionEnglish: english.get(handoff.text) ?? handoff.text,
      today: zonedParts(new Date(), center.timeZone).date,
    });
    return Response.json(draft);
  } catch {
    return Response.json({ error: "Maple couldn't draft a reply right now" }, { status: 503 });
  }
}
