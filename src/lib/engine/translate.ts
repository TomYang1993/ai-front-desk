import "server-only";
import { z } from "zod";
import type { Lang } from "@/content";
import { generateJson, modelChain } from "../llm";

const NAMES: Record<Exclude<Lang, "en">, string> = { es: "Spanish", zh: "Simplified Chinese", hi: "Hindi, in Devanagari script" };

/** Matches the interface: formal Spanish, respectful Hindi with Maple speaking as herself. */
const REGISTER: Record<Exclude<Lang, "en">, string> = {
  es: ' Address the parent formally, with "usted".',
  zh: "",
  hi: ' Address the parent respectfully, with "आप". Maple is female: when she speaks about herself use feminine forms, for example "मैं नहीं कर सकती", not "मैं नहीं कर सकता".',
};

/** Every number in the English text, without commas or currency signs. */
export const numbersIn = (text: string) =>
  (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "")).filter((n) => Number(n) !== 0);

/**
 * Translates a reply written in English by code. Numbers, times and the
 * given names must survive translation; if they don't, the English text is
 * kept. Names stay in Latin letters, so "Hannah" in a reply matches the
 * Hannah a parent sees everywhere else, rather than a Devanagari spelling.
 */
export async function translate(text: string, lang: Lang, names: string[] = []) {
  if (lang === "en") return { text, tokens: 0, model: null as string | null, ok: true };
  const required = numbersIn(text);
  const keep = [...new Set(names.filter((n) => n && text.includes(n)))];
  const keepLine = keep.length
    ? ` These names must stay in Latin letters, copied exactly, never spelled in another script: ${keep.join(", ")}. For example, keep "${keep[0]}" as "${keep[0]}".`
    : "";
  // A cheap first try, then a second opinion from another provider, then the large models.
  // The small Groq model tends to respell names in Devanagari; Gemini keeps them.
  const chain = modelChain("small");
  const firstProvider = chain[0]?.split(":")[0];
  const secondOpinion = chain.find((m) => !m.startsWith(`${firstProvider}:`));
  const attempts: { tier: "small" | "large"; only?: string }[] = [{ tier: "small" }, ...(secondOpinion ? [{ tier: "small" as const, only: secondOpinion }] : []), { tier: "large" }];
  let tokens = 0;
  let model: string | null = null;
  for (const attempt of attempts) {
    try {
      const r = await generateJson(
        {
          tier: attempt.tier,
          system: `Translate this message from a child care center's front desk assistant into ${NAMES[lang]} for a parent. Keep every number, price, time, date, percentage, phone number, email address and person's name exactly as written, using the same digits. Keep the tone warm and plain. Don't add gendered pronouns for children; repeat the child's name instead.${keepLine}${REGISTER[lang]} Return JSON with one field, "text".`,
          prompt: text,
          schema: z.object({ text: z.string() }),
          temperature: 0,
        },
        attempt.only,
      );
      tokens += r.inputTokens + r.outputTokens;
      model = r.model;
      const found = numbersIn(r.data.text);
      if (required.every((n) => found.includes(n)) && keep.every((n) => r.data.text.includes(n))) return { text: r.data.text, tokens, model, ok: true };
    } catch {
      /* That model is unavailable; try the next one. */
    }
  }
  return { text, tokens, model, ok: false };
}

/**
 * Translates short pieces of center content, such as dish names, closure
 * names and announcements, in one call. Any piece that comes back missing
 * or with its numbers changed stays in English. Uses the large model: the
 * result is cached for a week, and the small one turned "the wet season is
 * here" into summer in Hindi.
 */
export async function translateList(texts: string[], lang: Lang): Promise<{ texts: string[]; translated: boolean[] }> {
  const original = { texts, translated: texts.map(() => false) };
  if (lang === "en" || !texts.length) return original;
  try {
    const r = await generateJson({
      tier: "large",
      system: `Translate each item, written by staff at a child care center, into ${NAMES[lang]} for a parent. Items are dish names, holiday or closure names, and notices. Keep every number, price, time, date and person's name exactly as written. Keep proper names of places and events recognizable.${REGISTER[lang]} Return JSON with one field, "items": the translations in the same order, one per input item.`,
      prompt: JSON.stringify(texts),
      schema: z.object({ items: z.array(z.string()) }),
      temperature: 0,
    });
    if (r.data.items.length !== texts.length) return original;
    const out = texts.map((text, i) => {
      const t = r.data.items[i]?.trim();
      const required = numbersIn(text);
      const found = t ? numbersIn(t) : [];
      return t && required.every((n) => found.includes(n)) ? t : null;
    });
    return { texts: out.map((t, i) => t ?? texts[i]), translated: out.map(Boolean) };
  } catch {
    return original;
  }
}
