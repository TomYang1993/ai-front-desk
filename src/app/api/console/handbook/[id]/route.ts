import { z } from "zod";
import { updateHandbookSection } from "@/lib/data";
import { directorFor } from "@/lib/console-auth";

const Body = z.object({
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(20000),
});

/** Edits one handbook section. Maple reads the new text on the next question. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/console/handbook/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A section needs a title and some text" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const section = await updateHandbookSection(who.center.id, id, {
    title: parsed.data.title,
    body: parsed.data.body,
    updatedBy: who.staffName,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  if (!section) return Response.json({ error: "Unknown section" }, { status: 404 });
  return Response.json({ section });
}
