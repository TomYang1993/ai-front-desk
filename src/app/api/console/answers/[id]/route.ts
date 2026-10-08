import { z } from "zod";
import { saveSavedAnswers } from "@/lib/data";
import { directorFor, SavedAnswerFields } from "@/lib/console-auth";

const Body = SavedAnswerFields.extend({ centerId: z.enum(["pinon-grove", "quail-ridge"]).optional() });

/** Edits a saved answer. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/console/answers/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a question and an answer" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const { center, staffName } = who;
  if (!center.savedAnswers.some((a) => a.id === id)) return Response.json({ error: "Unknown answer" }, { status: 404 });
  const { question, answer, keywords } = parsed.data;
  const list = center.savedAnswers.map((a) =>
    a.id === id ? { ...a, question, answer, keywords: [...new Set(keywords)], savedBy: staffName, savedAt: new Date().toISOString().slice(0, 10) } : a,
  );
  await saveSavedAnswers(center.id, list);
  return Response.json({ saved: list.find((a) => a.id === id) });
}

/** Removes a saved answer. Maple stops using it on the next question. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/console/answers/[id]">) {
  const { id } = await ctx.params;
  const centerId = new URL(request.url).searchParams.get("centerId");
  const who = await directorFor({ centerId: centerId === "pinon-grove" || centerId === "quail-ridge" ? centerId : undefined });
  if ("error" in who) return who.error;
  const { center } = who;
  if (!center.savedAnswers.some((a) => a.id === id)) return Response.json({ error: "Unknown answer" }, { status: 404 });
  await saveSavedAnswers(center.id, center.savedAnswers.filter((a) => a.id !== id));
  return Response.json({ ok: true });
}
