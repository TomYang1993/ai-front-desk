import { z } from "zod";
import { getHandoffs } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";
import { draftSavedAnswer, toEnglish } from "@/lib/engine/drafts";

const Body = z.object({ centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(), handoffId: z.string() });

/** Turns a staff reply into a general saved answer for the director to edit and approve. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const handoff = (await getHandoffs(who.center.id)).find((h) => h.id === parsed.data.handoffId);
  if (!handoff?.reply) return Response.json({ error: "Reply to this message first" }, { status: 409 });
  const english = handoff.language === "en" ? new Map<string, string>() : await toEnglish([handoff.text]);
  try {
    const draft = await draftSavedAnswer({
      question: handoff.text,
      questionEnglish: english.get(handoff.text) ?? handoff.text,
      reply: handoff.reply.text,
      language: handoff.language,
      centerName: who.center.name,
    });
    return Response.json(draft);
  } catch {
    return Response.json({ error: "Maple couldn't draft it right now" }, { status: 503 });
  }
}
