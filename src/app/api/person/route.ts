import { z } from "zod";
import { askForPerson } from "@/lib/engine/person";
import { resolveParent } from "@/lib/session";

const Body = z.object({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  familyId: z.string().optional(),
  text: z.string().trim().min(1).max(1000),
  /** What Maple last said, so the director has the context. */
  context: z.string().max(2000).optional(),
});

/** "Talk to a person": goes straight to the director, no AI involved. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Write a message" }, { status: 400 });
  const asker = await resolveParent(parsed.data);
  if (!asker?.familyId) return Response.json({ error: "Sign in as a parent" }, { status: 401 });
  const reply = await askForPerson({ centerId: asker.centerId, familyId: asker.familyId, text: parsed.data.text, context: parsed.data.context });
  return Response.json(reply);
}
