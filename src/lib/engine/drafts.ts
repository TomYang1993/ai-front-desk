import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Center, Family, HandbookSection, Lang } from "@/content";
import { getCached, setCached } from "../data";
import { generateJson } from "../llm";
import { renderFamily, renderHandbook, renderSaved, renderTables } from "./context";
import { checkClaims } from "./handbook";

/*
 * AI help for the control center. Each runs only when a director asks
 * for it, or once per new message, and is cached where repeats are likely.
 */

const LANG_NAME: Record<Lang, string> = { en: "English", es: "Spanish", zh: "Mandarin", hi: "Hindi" };

/**
 * Parents' messages in English for the director, cached by content. A
 * message the model hands back unchanged gets a second try with the large
 * model; one that still isn't translated is left out rather than shown
 * under an "In English" label.
 */
export async function toEnglish(texts: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(texts.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const key = `english:v2:${createHash("sha1").update(JSON.stringify(unique)).digest("hex")}`;
  const cached = await getCached<Record<string, string>>(key);
  if (cached) return new Map(Object.entries(cached));
  const run = async (items: string[], tier: "small" | "large") => {
    const r = await generateJson({
      tier,
      system: `Translate each message a parent sent to a child care center into plain English for the director. Every item is in another language and must come back in English. Keep names, numbers and times exactly as written. Return JSON with one field, "items": the English translations in the same order, one per input item.`,
      prompt: JSON.stringify(items),
      schema: z.object({ items: z.array(z.string()) }),
      temperature: 0,
    });
    if (r.data.items.length !== items.length) return;
    items.forEach((text, i) => {
      const english = r.data.items[i]?.trim();
      if (english && english !== text.trim()) map.set(text, english);
    });
  };
  try {
    await run(unique, "small");
    const missing = unique.filter((t) => !map.has(t));
    if (missing.length) await run(missing, "large");
    if (map.size === unique.length) await setCached(key, Object.fromEntries(map), 7 * 24 * 3600);
  } catch {
    /* The director still sees the parent's own words. */
  }
  return map;
}

/**
 * A suggested reply from the director, built only from the center's
 * sources. Where they say nothing, the draft leaves a bracketed blank for
 * the director to fill instead of inventing an answer.
 */
export async function draftReply(args: {
  center: Center;
  family: Family | undefined;
  sections: HandbookSection[];
  staffName: string;
  question: string;
  questionEnglish: string;
  today: string;
}) {
  const { center, family, sections, staffName, question, questionEnglish, today } = args;
  const sources = `${renderHandbook(sections)}\n\n${renderTables(center, today)}\n\nSaved answers from staff:\n${renderSaved(center.savedAnswers)}`;
  const r = await generateJson({
    tier: "large",
    system: `You draft replies for ${staffName} at ${center.name}, a child care center in ${center.city}, ${center.state}. Maple, the AI front desk, passed this parent's message to staff. Write the reply ${staffName} would send, in English, in 2 to 4 short, warm, plain sentences. Maple passed this on because the sources don't settle it, so don't decide it yourself: put the decision in square brackets as a choice for ${staffName}, such as [Yes, costumes are welcome / No costumes this year], and put any detail the sources lack in brackets too, such as [confirm the time]. Use only facts that are in the sources, and never add rules, conditions or promises that aren't there. Don't sign the message. Return JSON with fields "reply" and "usedSources" (the ids of sources you relied on, like "handbook:meals").`,
    prompt: `SOURCES

${sources}

FAMILY
${renderFamily(center, family, today)}

PARENT'S MESSAGE
${question}${questionEnglish !== question ? `\n(In English: ${questionEnglish})` : ""}`,
    schema: z.object({ reply: z.string(), usedSources: z.array(z.string()) }),
    temperature: 0.3,
  });
  // The draft still sometimes adds sensible-sounding rules. List anything the sources don't say,
  // so the director can check it; bracketed choices are already the director's to make.
  const check = await checkClaims({ question: questionEnglish, answer: r.data.reply, sources }).catch(() => null);
  const bracketed = (r.data.reply.match(/\[[^\]]*\]/g) ?? []).join(" ").toLowerCase();
  const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const isBracketed = (claim: string) => {
    const w = words(claim);
    return w.length > 0 && w.filter((x) => bracketed.includes(x)).length / w.length >= 0.6;
  };
  const notInSources = (check?.data.unsupportedClaims ?? []).filter((c) => !c.includes("[") && !isBracketed(c));
  return { ...r.data, notInSources };
}

/**
 * Turns one reply to one family into a general answer Maple can reuse:
 * no names or child details, plus keywords in English and in the asking
 * parent's language for matching future questions.
 */
export async function draftSavedAnswer(args: { question: string; questionEnglish: string; reply: string; language: Lang; centerName: string }) {
  const { question, questionEnglish, reply, language, centerName } = args;
  const r = await generateJson({
    tier: "large",
    system: `A director at ${centerName}, a child care center, answered a parent's question. Turn it into a saved answer that the center's AI front desk can give any family who asks the same thing. Write "question" as a general question in English, with no names. Write "answer" in English, with no family's or child's names or personal details, keeping every fact, date, time and price from the director's reply exactly. Don't add facts. Write "keywords": 3 to 6 short lowercase words or phrases a parent would likely use, in English${language === "en" ? "" : ` and in ${LANG_NAME[language]}`}. Return JSON with fields "question", "answer" and "keywords".`,
    prompt: `PARENT'S QUESTION
${question}${questionEnglish !== question ? `\n(In English: ${questionEnglish})` : ""}

DIRECTOR'S REPLY
${reply}`,
    schema: z.object({ question: z.string(), answer: z.string(), keywords: z.array(z.string()) }),
    temperature: 0.2,
  });
  return r.data;
}

/**
 * Groups parents' messages that ask essentially the same thing, so the inbox
 * can flag a repeated question. Takes English text (translated where needed)
 * and returns groups of two or more ids. Cached by content; if the AI is
 * unavailable, falls back to grouping identical wording.
 */
export async function groupSimilar(items: { id: string; text: string }[]): Promise<string[][]> {
  const normalize = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  const exact = () => {
    const byText = new Map<string, string[]>();
    for (const i of items) byText.set(normalize(i.text), [...(byText.get(normalize(i.text)) ?? []), i.id]);
    return [...byText.values()].filter((g) => g.length > 1);
  };
  if (items.length < 2) return [];
  const key = `similar:v1:${createHash("sha1").update(JSON.stringify(items)).digest("hex")}`;
  const cached = await getCached<string[][]>(key);
  if (cached) return cached;
  try {
    const r = await generateJson({
      tier: "small",
      system: `You group messages that parents sent to a child care center. Put two messages in the same group only if one written answer from the center would fully answer both, even if they're worded differently. Questions about different things stay apart, even on the same topic. Return JSON with one field, "groups": arrays of message ids, only for groups of two or more.`,
      prompt: JSON.stringify(items),
      schema: z.object({ groups: z.array(z.array(z.string())) }),
      temperature: 0,
    });
    // Keep only real ids, and put each message in at most one group.
    const known = new Set(items.map((i) => i.id));
    const seen = new Set<string>();
    const groups: string[][] = [];
    for (const g of r.data.groups) {
      const ids = [...new Set(g)].filter((id) => known.has(id) && !seen.has(id));
      if (ids.length < 2) continue;
      ids.forEach((id) => seen.add(id));
      groups.push(ids);
    }
    await setCached(key, groups, 7 * 24 * 3600);
    return groups;
  } catch {
    return exact();
  }
}
