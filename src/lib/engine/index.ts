import "server-only";
import type { Center, Child, Family, Lane, Lang, Outcome, QuestionLog, Topic } from "@/content";
import { addHandoff, appendLog, getCached, getCenter, getFamily, getHandbook, getTourBookings, setCached } from "../data";
import { hasGemini } from "../env";
import { LlmUnavailableError } from "../llm";
import { weekdayName } from "../facts/calendar";
import { zonedParts } from "../time";
import { screen } from "./safety";
import { understand, type Understanding } from "./understand";
import {
  childById,
  composeAbsence,
  composeBilling,
  composeClosure,
  composeEvents,
  composeForgotLunch,
  composeGreeting,
  composeHours,
  composeIllness,
  composeMenu,
  composeOffTopic,
  composeOtherFamily,
  composePrivateInfo,
  composeThanks,
  composeTour,
  composeTuition,
  composeWaitlist,
  localMinute,
  type ComposeContext,
  type Composed,
} from "./compose";
import { familyLedgerText, handbookSource, savedSource, tableBlocks, tableSource } from "./context";
import { fixedReply, handoffSpec, handoffText, newHandoff, etaPhrase, type HandoffKind } from "./handoff";
import { answerFromHandbook, checkClaims } from "./handbook";
import { verifyAnswer } from "./verify";
import { translate } from "./translate";
import type { AskReply, AskRequest, ChipId, Source } from "./types";

export type { AskReply, AskRequest } from "./types";

const SECTION_TOPIC: Record<string, Topic> = {
  illness: "illness", medication: "medication", meals: "meals", allergies: "allergies", weather: "weather",
  clothing: "clothing", schedule: "schedule", toileting: "toileting", celebrations: "celebrations",
  behavior: "behavior", pickup: "pickup", "late-pickup": "pickup", tuition: "tuition", enrollment: "enrollment",
  attendance: "absence", custody: "custody", hours: "hours", classrooms: "enrollment", safety: "incident",
};

const WEATHER_WORDS = /\b(snow|ice|icy|storm|blizzard|freez|weather|smoke|air quality|aqi|wind|power outage|heat wave)|nieve|hielo|tormenta|clima|humo|雪|冰|暴风|天气|烟|空气/i;

/** Cached answers are tied to the deployed code, so a new deploy never serves stale replies. */
const BUILD = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? `dev${Date.now().toString(36)}`;

const CHIP_LABEL: Record<ChipId, string> = {
  today_lunch: "Today's lunch",
  hours: "Hours",
  next_closure: "Next closure",
  tuition: "Tuition",
  tours: "Book a tour",
};

/** Cheap language guess for paths that must not wait for the AI. */
export function detectLanguage(text: string): Lang {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/[¿¡ñ]|\b(est[aá]|puede|hoy|mañana|niñ[oa]|hij[oa]|por favor|gracias|cu[aá]ndo|qu[eé]|tiene|está|llame|ayuda)\b/i.test(text)) return "es";
  return "en";
}

interface Draft extends Composed {
  language: Lang;
  calm: boolean;
  handoff?: AskReply["handoff"];
  checks?: string[];
}

export async function ask(req: AskRequest): Promise<AskReply & { checks?: string[] }> {
  const started = Date.now();
  const realNow = new Date();
  const now = req.now ?? realNow;
  const [center, family, sections, bookings] = await Promise.all([
    getCenter(req.centerId),
    req.familyId ? getFamily(req.centerId, req.familyId) : Promise.resolve(undefined),
    getHandbook(req.centerId),
    getTourBookings(req.centerId),
  ]);
  const local = zonedParts(now, center.timeZone);
  const today = local.date;
  const nowLocal = `${today} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")} (${weekdayName(today)})`;
  const ctx: ComposeContext = {
    center,
    family,
    sections,
    now,
    today,
    minute: localMinute(now, center),
    bookedTours: bookings.map((b) => b.slotId),
  };
  const history = req.history ?? [];
  const lanes: Lane[] = [];
  const models = new Set<string>();
  let tokens = 0;
  const timings: string[] = [];
  const spend = (r: { inputTokens: number; outputTokens: number; model: string; ms?: number }, step: string) => {
    tokens += r.inputTokens + r.outputTokens;
    models.add(r.model);
    timings.push(`${step} ${r.ms ?? 0}ms ${r.model}`);
  };

  const finish = async (draft: Draft, messageText: string, cacheKey?: string): Promise<AskReply & { checks?: string[] }> => {
    const logId = `${center.id === "pinon-grove" ? "pg" : "qr"}-q-live-${realNow.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const reply: AskReply & { checks?: string[] } = {
      mode: draft.mode,
      text: draft.text,
      language: draft.language,
      sources: draft.sources,
      actions: draft.actions,
      options: draft.options,
      handoff: draft.handoff,
      calm: draft.calm,
      topic: draft.topic,
      lanes: [...new Set(lanes)],
      tokens,
      models: [...models],
      ms: Date.now() - started,
      logId,
      ...(draft.checks?.length || timings.length ? { checks: [...(draft.checks ?? []), ...timings] } : {}),
    };
    const outcome: Outcome =
      draft.mode === "emergency" ? "emergency" : draft.mode === "declined" ? "declined" : draft.mode === "handoff" || draft.mode === "urgent" ? "handoff" : "answered";
    const realLocal = zonedParts(realNow, center.timeZone);
    const minute = realLocal.hour * 60 + realLocal.minute;
    const [oh, om] = center.hours.open.split(":").map(Number);
    const [ch, cm] = center.hours.close.split(":").map(Number);
    const log: QuestionLog = {
      id: logId,
      centerId: center.id,
      familyId: family?.id ?? null,
      askedBy: family ? undefined : "Visitor",
      askedAt: realNow.toISOString(),
      language: draft.language,
      text: messageText,
      topic: draft.topic,
      lanes: reply.lanes,
      outcome,
      handoffTo: draft.handoff?.to,
      sources: draft.sources.map((s) => s.id),
      tokens,
      afterHours: realLocal.weekday > 5 || minute < oh * 60 + om || minute >= ch * 60 + cm,
    };
    await appendLog(log);
    if (cacheKey && (draft.mode === "answer" || draft.mode === "declined" || draft.mode === "clarify")) {
      await setCached(cacheKey, reply);
    }
    return reply;
  };

  const localize = async (text: string, language: Lang) => {
    if (language === "en") return text;
    const started = Date.now();
    const t = await translate(text, language);
    tokens += t.tokens;
    if (t.model) models.add(t.model);
    timings.push(`translate ${Date.now() - started}ms ${t.model}${t.ok ? "" : " (kept English)"}`);
    return t.text;
  };

  const handoffDraft = async (args: {
    kind: HandoffKind;
    language: Lang;
    child?: Child;
    messageText: string;
    englishText?: string;
    fixedText?: string;
    partialLocalized?: string;
    sources?: Source[];
    topic?: Topic;
  }): Promise<Draft> => {
    const spec = handoffSpec(args.kind);
    const h = newHandoff({ kind: args.kind, center, family, child: args.child, text: args.messageText, language: args.language, now: realNow, topic: args.topic });
    await addHandoff(h);
    lanes.push("person");
    const body = args.fixedText ?? (await localize(args.englishText ?? "", args.language));
    const text = args.partialLocalized ? `${args.partialLocalized.trim()} ${body}` : body;
    const staffName =
      h.to === "teacher"
        ? center.staff.find((s) => s.roomId === family?.children.find((c) => c.id === h.childId)?.roomId)?.name ?? ""
        : center.staff.find((s) => s.role === "director")!.name;
    return {
      mode: spec.mode,
      text,
      language: args.language,
      topic: args.topic ?? spec.topic,
      sources: args.sources ?? [],
      actions: spec.mode === "emergency" || spec.mode === "urgent" ? [{ type: "call_center", phone: center.phone }] : [],
      calm: spec.mode === "urgent" || spec.mode === "emergency" || spec.priority === "urgent",
      handoff: { id: h.id, to: h.to, staffName, eta: etaPhrase(center, now, h.to, "en") },
    };
  };

  /* 1. Buttons: code only. */
  if (req.chip) {
    lanes.push("quick_facts");
    const composed = chipCompose(ctx, req.chip);
    const language = family?.preferredLanguage ?? "en";
    const cacheKey = req.noCache ? undefined : `${BUILD}:${center.id}:${family?.id ?? "visitor"}:${today}:chip:${req.chip}`;
    const cached = cacheKey ? await getCached<AskReply>(cacheKey) : null;
    if (cached) return { ...cached, cached: true, ms: Date.now() - started };
    const text = await localize(composed.text, language);
    return finish({ ...composed, text, language, calm: false }, CHIP_LABEL[req.chip], cacheKey);
  }

  const message = (req.message ?? "").trim().slice(0, 1000);
  if (!message) throw new Error("Empty message");

  /* 2. Safety screen: code only, before any AI. */
  lanes.push("safety");
  const hit = screen(message);
  if (hit) {
    const language = detectLanguage(message);
    const sources = hit === "custody" ? sectionSources(sections, ["custody"]) : hit === "abuse" ? sectionSources(sections, ["safety"]) : [];
    const child = family?.children.find((c) => message.toLowerCase().includes(c.firstName.toLowerCase())) ?? (family?.children.length === 1 ? family.children[0] : undefined);
    return finish(
      await handoffDraft({ kind: hit, language, child, messageText: message, fixedText: fixedReply(hit, center, now, language), sources, topic: hit === "custody" ? "custody" : "incident" }),
      message,
    );
  }

  /* 3. Same question today: reuse the answer. */
  const cacheKey = history.length || req.noCache ? undefined : `${BUILD}:${center.id}:${family?.id ?? "visitor"}:${today}:${hashText(message.toLowerCase().replace(/\s+/g, " "))}`;
  if (cacheKey) {
    const cached = await getCached<AskReply>(cacheKey);
    if (cached) {
      const reply = { ...cached, cached: true, ms: Date.now() - started };
      await appendLog({
        id: `${cached.logId}-c${Date.now().toString(36)}`, centerId: center.id, familyId: family?.id ?? null, askedBy: family ? undefined : "Visitor",
        askedAt: realNow.toISOString(), language: cached.language, text: message, topic: cached.topic, lanes: ["safety"], outcome: "answered",
        sources: cached.sources.map((s) => s.id), tokens: 0, afterHours: false,
      });
      return reply;
    }
  }

  const outage = async (err?: LlmUnavailableError) => {
    const language = detectLanguage(message);
    if (err) timings.push(`AI unavailable (${err.reason}): ${err.message.slice(0, 160)}`);
    const draft = await handoffDraft({ kind: "outage", language, messageText: message, fixedText: fixedReply("outage", center, now, language) });
    return finish(draft, message);
  };
  const allowSimulation = process.env.VERCEL_ENV !== "production";
  if ((req.simulateOutage && allowSimulation) || !hasGemini()) return outage();

  /* 4. Understand the message with the small model. */
  let u: Understanding;
  try {
    const r = await understand({ center, family, message, history, today, nowLocal });
    spend(r, "understand");
    u = r.data;
  } catch (err) {
    if (err instanceof LlmUnavailableError) return outage(err);
    throw err;
  }
  lanes.push("understand");
  const language = u.language;
  // With several children, only trust a child the parent actually named.
  const conversation = [message, ...history.map((t) => t.text)].join(" ").toLowerCase();
  const named = (id: string) => {
    const c = childById(family, id);
    return c && (family!.children.length === 1 || conversation.includes(c.firstName.toLowerCase()));
  };
  const child = childById(family, u.childIds.find(named));

  const finishComposed = async (c: Composed, lane: Lane = "lookup") => {
    lanes.push(lane);
    return finish({ ...c, text: await localize(c.text, language), language, calm: false }, message, cacheKey);
  };

  /* 5. Sensitive topics go to people. */
  if (u.sensitive === "medical_emergency") {
    return finish(await handoffDraft({ kind: "emergency", language, child, messageText: message, fixedText: fixedReply("emergency", center, now, language) }), message);
  }
  if (u.sensitive === "custody" || u.sensitive === "abuse_or_neglect") {
    const kind = u.sensitive === "custody" ? "custody" : "abuse";
    return finish(await handoffDraft({ kind, language, child, messageText: message, fixedText: fixedReply(kind, center, now, language), sources: sectionSources(sections, [kind === "custody" ? "custody" : "safety"]) }), message);
  }
  if (u.aboutOtherFamily) return finishComposed(composeOtherFamily(ctx, child), "lookup");
  if (u.asksForPrivateInfo) return finishComposed(composePrivateInfo(ctx), "lookup");
  const personFor: Partial<Record<Understanding["sensitive"], HandoffKind>> = {
    pickup_authorization: "pickup",
    injury_or_incident: "incident",
    staff_complaint: "staff_complaint",
    billing_dispute: "billing_dispute",
    behavior_concern: "behavior",
  };
  const personKind = personFor[u.sensitive];
  if (personKind && personKind !== "outage") {
    const { text } = handoffText(personKind as Exclude<HandoffKind, "emergency" | "custody" | "abuse" | "outage">, center, now, child);
    if (personKind === "pickup") lanes.push("lookup");
    const sourceIds = { pickup: ["pickup"], incident: ["safety"], staff_complaint: ["concerns"], billing_dispute: ["tuition"], behavior: ["behavior"] }[personKind as string] ?? [];
    return finish(await handoffDraft({ kind: personKind, language, child, messageText: message, englishText: text, sources: sectionSources(sections, sourceIds) }), message);
  }

  /* 6. Saved answers from staff. */
  const saved = u.savedAnswerId ? center.savedAnswers.find((s) => s.id === u.savedAnswerId) : undefined;
  if (saved) {
    return finish({ mode: "answer", text: await localize(saved.answer, language), language, calm: false, topic: "other", sources: [savedSource(saved)], actions: [] }, message, cacheKey);
  }

  /* 7. Well-defined questions: code looks up the answer. */
  const enrolled = Boolean(family);
  let composed: Composed | null = null;
  switch (u.intent) {
    case "greeting": return finishComposed(composeGreeting(ctx), "lookup");
    case "thanks": return finishComposed(composeThanks(), "lookup");
    case "off_topic": return finishComposed(composeOffTopic(ctx), "lookup");
    case "closure":
      // Weather can change a normal day, so those questions need the weather policy.
      composed = WEATHER_WORDS.test(message) ? null : composeClosure(ctx, u.date);
      break;
    case "hours": composed = composeHours(ctx); break;
    case "menu": composed = composeMenu(ctx, u.date); break;
    case "forgot_lunch": composed = enrolled ? composeForgotLunch(ctx, child) : null; break;
    case "illness":
      composed = enrolled && u.symptom ? composeIllness(ctx, child, u.symptom, u.symptom.lastAtIsEstimate) : null;
      break;
    case "absence": composed = composeAbsence(ctx, child, u.dates); break;
    case "tuition":
      // Code answers prices and assistance; discounts and fee details need the handbook.
      composed = !u.moneyTopic || u.moneyTopic === "price" || u.moneyTopic === "assistance" ? composeTuition(ctx, u.program) : null;
      break;
    case "waitlist": composed = composeWaitlist(ctx, u.program); break;
    case "tour": composed = composeTour(ctx, u.date); break;
    case "billing": composed = composeBilling(ctx, u.amount); break;
    case "events": composed = composeEvents(ctx, u.date); break;
    case "child_day":
      if (enrolled) {
        const { text } = handoffText("child_day", center, now, child);
        return finish(await handoffDraft({ kind: "child_day", language, child, messageText: message, englishText: text }), message);
      }
      break;
    case "running_late":
      if (enrolled) {
        const { text } = handoffText("running_late", center, now, child);
        return finish(await handoffDraft({ kind: "running_late", language, child, messageText: message, englishText: text, sources: sectionSources(sections, ["late-pickup"]) }), message);
      }
      break;
  }
  if (composed) return finishComposed(composed);

  /* 8. Everything else: read the handbook, then double-check. */
  lanes.push("handbook", "double_check");
  let hb;
  try {
    hb = await answerFromHandbook({ center, family, sections, message, history, language, today, nowLocal });
    spend(hb, "handbook");
  } catch (err) {
    if (err instanceof LlmUnavailableError) return outage(err);
    throw err;
  }
  const available = new Map<string, string>();
  for (const s of sections) available.set(`handbook:${s.id}`, `${s.title}\n${s.body}`);
  for (const [id, text] of tableBlocks(center, today)) available.set(id, text);
  for (const s of center.savedAnswers) available.set(`saved:${s.id}`, `${s.question}\n${s.answer}`);
  if (family) available.set("table:billing", familyLedgerText(family));
  const check = verifyAnswer({
    answer: hb.data.answer,
    sourceIds: hb.data.sourceIds,
    available,
    context: [message, ...history.map((t) => t.text), nowLocal, family ? JSON.stringify(family.children) : ""].join("\n"),
  });
  // Second look: is every claim actually stated in the cited sources?
  if (check.ok && hb.data.covered !== "no") {
    try {
      const claims = await checkClaims({
        question: message,
        answer: hb.data.answer,
        sources: check.validIds.map((id) => `[${id}]\n${available.get(id)}`).join("\n\n"),
      });
      spend(claims, "claim check");
      if (!claims.data.supported) {
        check.ok = false;
        check.problems.push(`Unsupported claims: ${claims.data.unsupportedClaims.join("; ")}`);
      }
    } catch (err) {
      if (!(err instanceof LlmUnavailableError)) throw err;
      timings.push("claim check skipped: AI unavailable");
    }
  }
  const sources = check.validIds.map((id) => sourceFor(id, center, sections)).filter((s): s is Source => Boolean(s));
  const firstSection = check.validIds.find((id) => id.startsWith("handbook:"))?.slice(9);
  const topic: Topic = (firstSection && SECTION_TOPIC[firstSection]) || intentTopic(u.intent);

  if (hb.data.covered === "fully" && hb.data.confidence !== "low" && check.ok) {
    return finish({ mode: "answer", text: hb.data.answer, language, calm: false, topic, sources, actions: [], checks: [] }, message, cacheKey);
  }
  const partial = hb.data.covered === "partly" && check.ok && hb.data.confidence !== "low" ? hb.data.answer : undefined;
  const kind: HandoffKind = !check.ok || hb.data.confidence === "low" ? "low_confidence" : "not_covered";
  const { text } = handoffText(kind, center, now, child, partial);
  const draft = await handoffDraft({ kind, language, child, messageText: message, englishText: text, partialLocalized: partial, sources: partial ? sources : [], topic });
  return finish({ ...draft, checks: check.problems }, message);
}

function chipCompose(ctx: ComposeContext, chip: ChipId): Composed {
  switch (chip) {
    case "today_lunch": return composeMenu(ctx, null);
    case "hours": return composeHours(ctx);
    case "next_closure": return composeClosure(ctx, null);
    case "tuition": return composeTuition(ctx, null);
    case "tours": return composeTour(ctx, null);
  }
}

function sectionSources(sections: { id: string }[], ids: string[]): Source[] {
  return ids
    .map((id) => sections.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => handbookSource(s as never));
}

function sourceFor(id: string, center: Center, sections: Parameters<typeof sectionSources>[0]): Source | undefined {
  if (id.startsWith("handbook:")) return sectionSources(sections, [id.slice(9)])[0];
  if (id.startsWith("saved:")) {
    const s = center.savedAnswers.find((x) => x.id === id.slice(6));
    return s ? savedSource(s) : undefined;
  }
  if (id === "table:billing") return { id, label: "Your account" };
  const table = id.slice(6) as Parameters<typeof tableSource>[1];
  return center.tableUpdates[table] ? tableSource(center, table) : undefined;
}

function intentTopic(intent: Understanding["intent"]): Topic {
  const map: Partial<Record<Understanding["intent"], Topic>> = {
    closure: "closures", weather: "weather", hours: "hours", menu: "meals", forgot_lunch: "meals", illness: "illness", absence: "absence",
    running_late: "pickup", tuition: "tuition", waitlist: "enrollment", tour: "tours", billing: "billing", events: "events",
    child_day: "child_day",
  };
  return map[intent] ?? "other";
}

function hashText(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export type { Family };
