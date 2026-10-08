import { z } from "zod";
import { getHandoffs, markFeedbackHandled, saveSavedAnswers } from "@/lib/data";
import { sendReply } from "@/lib/console-reply";
import { GENERAL_REASONS } from "@/lib/console-constants";
import { directorFor, SavedAnswerFields } from "@/lib/console-auth";

const Body = SavedAnswerFields.extend({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  fromHandoffId: z.string().optional(),
  /** An unhelpful answer this one replaces, from the overview. */
  fromLogId: z.string().optional(),
  /** Other families still waiting with the same question, who get this answer now. */
  alsoReplyTo: z.array(z.string()).max(25).optional(),
});

/** Saves an answer Maple can give any family. It takes effect on the next question. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a question and an answer" }, { status: 400 });
  const who = await directorFor(parsed.data);
  if ("error" in who) return who.error;
  const { center, staffName } = who;
  const { question, answer, keywords, fromHandoffId, fromLogId, alsoReplyTo } = parsed.data;
  const saved = {
    id: `${center.id === "pinon-grove" ? "pg" : "qr"}-sa-${Date.now().toString(36)}`,
    question,
    answer,
    keywords: [...new Set(keywords.filter(Boolean))],
    savedBy: staffName,
    savedAt: new Date().toISOString().slice(0, 10),
    ...(fromHandoffId ? { fromHandoffId } : {}),
    ...(fromLogId ? { fromLogId } : {}),
  };
  await saveSavedAnswers(center.id, [...center.savedAnswers, saved]);
  if (fromLogId) await markFeedbackHandled(center.id, fromLogId, { by: staffName, at: new Date().toISOString(), how: "answer" });

  // Answer once, for everyone waiting: each family gets the general answer in their own language.
  const waiting = alsoReplyTo?.length ? (await getHandoffs(center.id)).filter((h) => alsoReplyTo.includes(h.id) && h.status === "open" && GENERAL_REASONS.has(h.reason)) : [];
  for (const h of waiting) await sendReply(center, staffName, h, answer, saved.id);
  return Response.json({ saved, repliedTo: waiting.map((h) => h.id) });
}
