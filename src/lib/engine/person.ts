import "server-only";
import type { CenterId, QuestionLog } from "@/content";
import { addHandoff, appendLog, getCenter, getFamily } from "../data";
import { zonedParts } from "../time";
import { director } from "./compose";
import { etaPhrase, fixedReply, newHandoff } from "./handoff";
import type { AskReply } from "./types";

/**
 * The "Talk to a person" button. Always available, no AI and no questions
 * asked: the message goes straight to the director's inbox with what Maple
 * last said, and Maple confirms who will reply and when.
 */
export async function askForPerson(args: { centerId: CenterId; familyId: string; text: string; context?: string }): Promise<AskReply> {
  const started = Date.now();
  const now = new Date();
  const [center, family] = await Promise.all([getCenter(args.centerId), getFamily(args.centerId, args.familyId)]);
  if (!family) throw new Error("Unknown family");
  const language = family.preferredLanguage;
  const child = family.children.length === 1 ? family.children[0] : undefined;
  const h = newHandoff({ kind: "person", center, family, child, text: args.text, language, now, topic: "other" });
  await addHandoff({ ...h, ...(args.context ? { context: args.context.slice(0, 2000) } : {}) });

  const logId = `${center.id === "pinon-grove" ? "pg" : "qr"}-q-live-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const local = zonedParts(now, center.timeZone);
  const minute = local.hour * 60 + local.minute;
  const [oh, om] = center.hours.open.split(":").map(Number);
  const [ch, cm] = center.hours.close.split(":").map(Number);
  const log: QuestionLog = {
    id: logId,
    centerId: center.id,
    familyId: family.id,
    askedAt: now.toISOString(),
    language,
    text: args.text,
    topic: "other",
    lanes: ["person"],
    outcome: "handoff",
    handoffTo: "director",
    sources: [],
    tokens: 0,
    afterHours: local.weekday > 5 || minute < oh * 60 + om || minute >= ch * 60 + cm,
  };
  const text = fixedReply("person", center, now, language);
  await appendLog({ ...log, answer: text });

  return {
    mode: "handoff",
    text,
    language,
    sources: [],
    actions: [],
    calm: false,
    topic: "other",
    lanes: ["person"],
    tokens: 0,
    models: [],
    ms: Date.now() - started,
    logId,
    handoff: { id: h.id, to: "director", staffName: director(center).name, eta: etaPhrase(center, now, "director", "en") },
  };
}
