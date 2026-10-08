import { z } from "zod";
import { saveSavedAnswers } from "@/lib/data";
import { directorFor, SavedAnswerFields } from "@/lib/console-auth";

const Body = SavedAnswerFields.extend({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  fromHandoffId: z.string().optional(),
});

/** Saves an answer Maple can give any family. It takes effect on the next question. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a question and an answer" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const { center, staffName } = who;
  const { question, answer, keywords, fromHandoffId } = parsed.data;
  const saved = {
    id: `${center.id === "pinon-grove" ? "pg" : "qr"}-sa-${Date.now().toString(36)}`,
    question,
    answer,
    keywords: [...new Set(keywords.filter(Boolean))],
    savedBy: staffName,
    savedAt: new Date().toISOString().slice(0, 10),
    ...(fromHandoffId ? { fromHandoffId } : {}),
  };
  await saveSavedAnswers(center.id, [...center.savedAnswers, saved]);
  return Response.json({ saved });
}
