import "server-only";
import type { Center, Handoff } from "@/content";
import { getFamily, updateHandoff } from "./data";
import { keepNames } from "./engine/context";
import { translate } from "./engine/translate";

/**
 * Sends a staff reply to one handoff: translated into the parent's language
 * (names kept exactly), with the English kept alongside, and the handoff
 * marked answered. `savedAnswerId` records when the reply is a saved answer.
 */
export async function sendReply(center: Center, staffName: string, handoff: Handoff, text: string, savedAnswerId?: string) {
  const family = handoff.familyId ? await getFamily(center.id, handoff.familyId) : undefined;
  let translated: { language: typeof handoff.language; text: string } | undefined;
  let keptEnglish = false;
  if (handoff.language !== "en") {
    const t = await translate(text, handoff.language, keepNames(center, family));
    if (t.ok) translated = { language: handoff.language, text: t.text };
    else keptEnglish = true;
  }
  const updated = await updateHandoff(center.id, handoff.id, (h) => ({
    ...h,
    status: "answered",
    reply: { text, by: staffName, at: new Date().toISOString(), ...(translated ? { translated } : {}), ...(savedAnswerId ? { savedAnswerId } : {}) },
  }));
  return { handoff: updated, keptEnglish };
}
