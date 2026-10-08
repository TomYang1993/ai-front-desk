import "server-only";
import { z } from "zod";
import type { Center, Family, HandbookSection, Lang } from "@/content";
import { generateJson } from "../llm";
import { renderFamily, renderHandbook, renderSaved, renderTables } from "./context";
import type { HistoryTurn } from "./types";

export const HandbookAnswer = z.object({
  answer: z.string(),
  sourceIds: z.array(z.string()),
  covered: z.enum(["fully", "partly", "no"]),
  confidence: z.enum(["high", "medium", "low"]),
});
export type HandbookAnswer = z.infer<typeof HandbookAnswer>;

const LANG_NAME: Record<Lang, string> = { en: "English", es: "Spanish", zh: "Simplified Chinese" };

const system = (center: Center, lang: Lang) => `You are Maple, the AI front desk assistant for ${center.name}, a child care center in ${center.city}, ${center.state}. You answer parents using only the center's sources provided.

Rules:
1. Use only the sources. Never use outside knowledge about holidays, laws, health or other centers. If the sources don't answer the question, say so plainly.
2. Lead with the direct answer in one to four short sentences. Be warm and plain. Use the child's first name when the question is about a child. Never guess a child's gender: say the child's name or "your child", never he, she, him or her. No exclamation marks on health, safety or money topics.
3. Write the answer in ${LANG_NAME[lang]}.
4. sourceIds lists every source id you used, exactly as written in brackets, such as handbook:illness or table:calendar.
5. covered is "fully" when the sources answer everything asked, "partly" when they answer only some of it (answer that part and say what isn't covered), and "no" when they don't answer it.
6. Never approve pickups or pickup list changes, never give medical advice beyond the policy, never promise eligibility for assistance programs, and never share information about other families.
7. Never stretch a policy to a situation it doesn't explicitly mention, such as twins, a different age, a special family situation or an exception. State only what the policy says, say that the specific case isn't covered, and set covered to "partly".
8. confidence is how sure you are that the answer is correct and complete given the sources.`;

export async function answerFromHandbook(args: {
  center: Center;
  family: Family | undefined;
  sections: HandbookSection[];
  message: string;
  history: HistoryTurn[];
  language: Lang;
  today: string;
  nowLocal: string;
}) {
  const { center, family, sections, message, history, language, today, nowLocal } = args;
  const convo = history.length
    ? history.slice(-4).map((t) => `${t.role === "parent" ? "Parent" : "Maple"}: ${t.text}`).join("\n")
    : "(none)";
  const prompt = `Local time now: ${nowLocal}

SOURCES

${renderHandbook(sections)}

${renderTables(center, today)}

Saved answers from staff:
${renderSaved(center.savedAnswers)}

FAMILY ASKING
${renderFamily(center, family, today)}

EARLIER CONVERSATION
${convo}

QUESTION
${message}`;
  return { ...(await generateJson({ tier: "large", system: system(center, language), prompt, schema: HandbookAnswer, temperature: 0.2 })), prompt };
}

export const ClaimCheck = z.object({
  supported: z.boolean(),
  unsupportedClaims: z.array(z.string()),
});

/**
 * A second, independent look at a handbook answer: is every claim stated
 * in the cited sources? Catches answers that stretch a policy to a case
 * the handbook never mentions.
 */
export async function checkClaims(args: { question: string; answer: string; sources: string }) {
  return generateJson({
    tier: "small",
    temperature: 0,
    schema: ClaimCheck,
    system: `You check an answer written by a child care center's assistant against the center's source text. The answer is supported only if every factual claim in it is stated in the sources. A claim that applies a policy to a situation the sources don't mention is not supported, for example saying twins qualify for a sibling discount when the sources only describe discounts for an older sibling. Ignore greetings, tone, and statements that something isn't covered. Return JSON with "supported" and the list of "unsupportedClaims".`,
    prompt: `SOURCES\n${args.sources}\n\nQUESTION\n${args.question}\n\nANSWER\n${args.answer}`,
  });
}
