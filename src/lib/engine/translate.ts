import "server-only";
import { z } from "zod";
import type { Lang } from "@/content";
import { generateJson } from "../llm";

const NAMES: Record<Exclude<Lang, "en">, string> = { es: "Spanish", zh: "Simplified Chinese" };

/** Every number in the English text, without commas or currency signs. */
export const numbersIn = (text: string) =>
  (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "")).filter((n) => Number(n) !== 0);

/**
 * Translates a reply written in English by code. Numbers, times and names
 * must survive translation; if they don't, the English text is kept.
 */
export async function translate(text: string, lang: Lang) {
  if (lang === "en") return { text, tokens: 0, model: null as string | null, ok: true };
  const required = numbersIn(text);
  let tokens = 0;
  let model: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await generateJson({
      tier: "small",
      system: `Translate this message from a child care center's front desk assistant into ${NAMES[lang]} for a parent. Keep every number, price, time, date, percentage, phone number, email address and person's name exactly as written, using the same digits. Keep the tone warm and plain. Don't add gendered pronouns for children; repeat the child's name instead. Return JSON with one field, "text".`,
      prompt: text,
      schema: z.object({ text: z.string() }),
      temperature: 0,
    });
    tokens += r.inputTokens + r.outputTokens;
    model = r.model;
    const found = numbersIn(r.data.text);
    if (required.every((n) => found.includes(n))) return { text: r.data.text, tokens, model, ok: true };
  }
  return { text, tokens, model, ok: false };
}
