import { addDays, inRange, minutesOf, weekdayOf, zonedParts, zonedToUtc } from "../lib/time";
import type { Center, CenterId, Handoff, Lane, Lang, Outcome, QuestionLog, Topic } from "./types";

/**
 * Generates a believable question history for the operator console.
 * The history is deterministic for a given day and always ends at "now",
 * so the demo never looks stale. Demo families are left out on purpose;
 * their chats start fresh.
 */

type Route =
  | "facts"
  | "lookup"
  | "handbook"
  | "handbook_gap"
  | "saved"
  | "teacher"
  | "director"
  | "declined";

interface Template {
  topic: Topic;
  weight: number;
  route: Route;
  sources: string[];
  visitor?: boolean;
  texts: Partial<Record<Lang, string[]>>;
  /** Multiplies the weight between two dates. */
  season?: { from: string; to: string; boost: number };
}

const ROUTES: Record<Route, { lanes: Lane[]; outcome: Outcome; to?: "teacher" | "director" }> = {
  facts: { lanes: ["safety", "quick_facts"], outcome: "answered" },
  lookup: { lanes: ["safety", "understand", "lookup"], outcome: "answered" },
  handbook: { lanes: ["safety", "understand", "handbook", "double_check"], outcome: "answered" },
  handbook_gap: { lanes: ["safety", "understand", "handbook", "person"], outcome: "handoff", to: "director" },
  saved: { lanes: ["safety", "understand"], outcome: "answered" },
  teacher: { lanes: ["safety", "understand", "person"], outcome: "handoff", to: "teacher" },
  director: { lanes: ["safety", "understand", "person"], outcome: "handoff", to: "director" },
  declined: { lanes: ["safety", "understand"], outcome: "declined" },
};

const PINON_TEMPLATES: Template[] = [
  { topic: "closures", weight: 7, route: "lookup", sources: ["table:calendar"], texts: {
    en: ["Are you open on Indigenous Peoples' Day?", "Are you closed the Friday after Thanksgiving too?", "When is winter break this year?", "Are you open on Veterans Day?"],
    es: ["¿Están abiertos el Día de los Pueblos Indígenas?", "¿Cuándo son las vacaciones de invierno?"] } },
  { topic: "closures", weight: 0.3, route: "lookup", sources: ["table:calendar"], season: { from: "2026-08-24", to: "2026-09-07", boost: 25 }, texts: {
    en: ["Are you open on Labor Day?", "Is the center closed Monday for Labor Day?"], es: ["¿Abren el Día del Trabajo?"] } },
  { topic: "hours", weight: 3, route: "facts", sources: ["table:hours"], texts: { en: ["What time do you close?", "What time can I drop off in the morning?"], es: ["¿A qué hora cierran?"] } },
  { topic: "illness", weight: 8, route: "lookup", sources: ["handbook:illness"], season: { from: "2026-09-14", to: "2026-12-31", boost: 1.6 }, texts: {
    en: ["My kid had a fever of 100.9 last night. Can they come in today?", "Threw up once this morning. Can I still bring her in?", "Started antibiotics for an ear infection yesterday at 5 pm. When can he come back?", "Fever is gone since yesterday afternoon. Is tomorrow ok?"],
    es: ["Mi hijo tuvo fiebre anoche. ¿Puede venir hoy?", "Vomitó en la noche. ¿Puede ir hoy a la escuela?"] } },
  { topic: "meals", weight: 4, route: "facts", sources: ["table:menu"], texts: { en: ["What's for lunch today?"], es: ["¿Qué hay de almuerzo hoy?"] } },
  { topic: "meals", weight: 3, route: "lookup", sources: ["handbook:meals", "table:menu"], texts: { en: ["Do I need to pack lunch?", "Is breakfast still served if we get there at 8:50?", "Can I bring my daughter's lunch from home?"] } },
  { topic: "allergies", weight: 2, route: "handbook", sources: ["handbook:allergies"], texts: { en: ["Is the center peanut-free?", "My son has an egg allergy. How do you handle substitutions?"] } },
  { topic: "tuition", weight: 5, route: "lookup", visitor: true, sources: ["handbook:tuition", "table:tuition"], texts: {
    en: ["How much is infant care?", "Do you accept Child Care Assistance?", "Is child care really free now in New Mexico?", "How much is the 2-year-old room?"],
    es: ["¿Cuánto cuesta el cuidado para bebés?", "¿Aceptan la asistencia del estado?"] } },
  { topic: "enrollment", weight: 3, route: "lookup", visitor: true, sources: ["handbook:enrollment", "table:rooms"], texts: { en: ["How long is the waitlist for the infant room?", "What do I need to enroll my son?"] } },
  { topic: "tours", weight: 3, route: "lookup", visitor: true, sources: ["table:tours"], texts: { en: ["Can I schedule a tour?", "Do you have any tours this week?"], es: ["¿Puedo visitar la escuela?"] } },
  { topic: "pickup", weight: 2, route: "director", sources: ["handbook:pickup"], texts: { en: ["Can my neighbor pick up today? She's not on the list.", "My brother-in-law is getting her at 5. He isn't on the list yet."] } },
  { topic: "absence", weight: 4, route: "lookup", sources: ["handbook:attendance"], texts: { en: ["He'll be out Friday for a doctor's appointment.", "We're traveling next week. Do I need to tell you?"], es: ["Mi hija no va a ir mañana."] } },
  { topic: "schedule", weight: 3, route: "handbook", sources: ["handbook:schedule"], texts: { en: ["When is nap time?", "What time do they go outside?"] } },
  { topic: "weather", weight: 2, route: "handbook", sources: ["handbook:weather"], texts: { en: ["If APS has a two-hour delay, when do you open?", "Do I need to send sunscreen?", "Is it too windy for outside time today?"] } },
  { topic: "events", weight: 1, route: "lookup", sources: ["table:events", "handbook:attendance"], season: { from: "2026-09-28", to: "2026-10-11", boost: 8 }, texts: {
    en: ["Is it ok if we come in late Friday? We're going to the mass ascension.", "Are you open during Balloon Fiesta?"],
    es: ["¿Está bien llegar a las 9:30 durante la Fiesta de Globos?"] } },
  { topic: "events", weight: 1.5, route: "lookup", sources: ["table:events"], texts: { en: ["When are parent-teacher conferences?"] } },
  { topic: "clothing", weight: 2, route: "handbook", sources: ["handbook:clothing"], texts: { en: ["Does she need a change of clothes?", "Are sandals ok?"] } },
  { topic: "toileting", weight: 1.5, route: "handbook", sources: ["handbook:toileting"], texts: { en: ["We want to start potty training. How does that work at school?"] } },
  { topic: "medication", weight: 1.5, route: "handbook", sources: ["handbook:medication"], texts: { en: ["Can teachers give Tylenol if he needs it?", "How do I drop off an inhaler?"] } },
  { topic: "celebrations", weight: 1.5, route: "handbook", sources: ["handbook:celebrations"], season: { from: "2026-10-05", to: "2026-11-02", boost: 2 }, texts: { en: ["Can I bring cupcakes for her birthday?", "Can we bring a photo for the ofrenda?"] } },
  { topic: "child_day", weight: 3, route: "teacher", sources: [], texts: { en: ["Did she nap today?", "How was drop-off this morning? He was crying when I left."], es: ["¿Comió bien hoy?"] } },
  { topic: "behavior", weight: 0.7, route: "teacher", sources: [], texts: { en: ["Is he hitting at school? He's been hitting at home."] } },
  { topic: "incident", weight: 0.6, route: "director", sources: [], texts: { en: ["She came home with a bump on her head. What happened?"] } },
  { topic: "billing", weight: 1, route: "lookup", sources: ["table:billing"], texts: { en: ["Do I owe anything this month?"] } },
  { topic: "other", weight: 1.5, route: "handbook_gap", sources: [], texts: { en: ["Do you offer swim lessons in the summer?", "Can I volunteer to read to the class?", "Do you have a Spanish immersion classroom?"] } },
  { topic: "other", weight: 1.5, route: "saved", sources: ["saved:pg-sa-parking"], texts: { en: ["Where do I park at drop-off?"], es: ["¿Dónde me estaciono para dejar a mi hijo?"] } },
  { topic: "events", weight: 0.2, route: "saved", sources: ["saved:pg-sa-fiesta-trip"], season: { from: "2026-09-30", to: "2026-10-11", boost: 10 }, texts: { en: ["Is the class going to Balloon Fiesta?"] } },
  { topic: "other", weight: 0.3, route: "declined", sources: [], texts: { en: ["Which kid in the Coyotes has a peanut allergy?"] } },
];

const QUAIL_TEMPLATES: Template[] = [
  { topic: "closures", weight: 7, route: "lookup", sources: ["table:calendar"], texts: {
    en: ["Are you open on Veterans Day?", "Are you closed the Friday after Thanksgiving?", "When is winter break?", "Are you open on Indigenous Peoples' Day?"],
    zh: ["感恩节后的星期五你们开门吗？", "寒假是什么时候？"] } },
  { topic: "closures", weight: 0.3, route: "lookup", sources: ["table:calendar"], season: { from: "2026-08-24", to: "2026-09-07", boost: 25 }, texts: { en: ["Are you open on Labor Day?"] } },
  { topic: "hours", weight: 3, route: "facts", sources: ["table:hours"], texts: { en: ["What time do you open?", "What time do you close?"] } },
  { topic: "illness", weight: 8, route: "lookup", sources: ["handbook:illness"], season: { from: "2026-09-14", to: "2026-12-31", boost: 1.6 }, texts: {
    en: ["Temp of 100.5 this morning but acting normal. Ok to come?", "She threw up twice last night. Can she come today?", "Fever broke yesterday at noon. Can he come tomorrow?", "Runny nose and a cough, no fever. Is that ok?"],
    zh: ["孩子昨晚发烧了，今天可以去吗？", "今天早上体温100.2，可以上学吗？"] } },
  { topic: "meals", weight: 4, route: "facts", sources: ["table:menu"], texts: { en: ["What's the backup lunch today?"] } },
  { topic: "meals", weight: 4, route: "lookup", sources: ["handbook:meals", "table:menu"], texts: { en: ["I forgot to pack lunch. Can you give him a backup lunch?", "Forgot her lunch today, sorry! Is there a dairy-free option?"], zh: ["今天忘了带午饭，可以买备用午餐吗？"] } },
  { topic: "meals", weight: 1, route: "handbook", sources: ["handbook:meals"], texts: { en: ["Can you heat up leftovers for lunch?"] } },
  { topic: "allergies", weight: 2, route: "handbook", sources: ["handbook:allergies"], texts: { en: ["Is the center nut-free?", "How do you handle a sesame allergy at snack?"] } },
  { topic: "tuition", weight: 5, route: "lookup", visitor: true, sources: ["handbook:tuition", "table:tuition"], texts: {
    en: ["How much is infant care?", "Do you take Working Connections?", "Is there a sibling discount?", "What's tuition for the Pre-K room?"],
    zh: ["婴儿班学费多少？"] } },
  { topic: "enrollment", weight: 4, route: "lookup", visitor: true, sources: ["handbook:enrollment", "table:rooms"], texts: { en: ["How long is the infant waitlist?", "We're due in March. When should we join the waitlist?", "Is the waitlist fee refundable?"] } },
  { topic: "tours", weight: 3, route: "lookup", visitor: true, sources: ["table:tours"], texts: { en: ["Can I book a tour?", "Do you have a tour this Friday?"] } },
  { topic: "pickup", weight: 2, route: "director", sources: ["handbook:pickup"], texts: { en: ["Our nanny is picking up today. She's not on the list.", "My parents are visiting from India. Can they pick up?"] } },
  { topic: "absence", weight: 3, route: "lookup", sources: ["handbook:attendance"], texts: { en: ["He'll be out tomorrow, we have a doctor's appointment.", "We're on vacation next week."], zh: ["孩子明天请假。"] } },
  { topic: "schedule", weight: 2, route: "handbook", sources: ["handbook:schedule"], texts: { en: ["What time is nap?", "When is morning snack?"] } },
  { topic: "outdoor", weight: 3, route: "handbook", sources: ["handbook:weather"], texts: { en: ["Do the kids go outside when it rains?", "Does she need rain pants or just boots?"] } },
  { topic: "outdoor", weight: 0.5, route: "handbook", sources: ["handbook:weather"], season: { from: "2026-08-15", to: "2026-09-20", boost: 14 }, texts: {
    en: ["Is the class going outside with the smoke today?", "At what AQI do you keep kids inside?", "My son has asthma. Can he stay in when the air is bad?"],
    zh: ["今天空气不好，孩子们会出去玩吗？"] } },
  { topic: "events", weight: 2, route: "lookup", sources: ["table:events"], texts: { en: ["When is picture day?", "When are fall conferences?"] } },
  { topic: "clothing", weight: 2, route: "handbook", sources: ["handbook:clothing"], texts: { en: ["How many changes of clothes should we leave?"] } },
  { topic: "toileting", weight: 1.5, route: "handbook", sources: ["handbook:toileting"], texts: { en: ["When do you start potty training?"] } },
  { topic: "medication", weight: 1, route: "handbook", sources: ["handbook:medication"], texts: { en: ["Can you give her allergy medicine at lunch?"] } },
  { topic: "celebrations", weight: 1.5, route: "handbook", sources: ["handbook:celebrations"], texts: { en: ["Can I bring cupcakes for her birthday?", "How do you celebrate Lunar New Year?"] } },
  { topic: "child_day", weight: 3, route: "teacher", sources: [], texts: { en: ["Did he eat his lunch today?", "Was she ok after drop-off?"], zh: ["孩子今天午睡了吗？"] } },
  { topic: "behavior", weight: 0.7, route: "teacher", sources: [], texts: { en: ["He's been biting at home. Is it happening at school?"] } },
  { topic: "incident", weight: 0.6, route: "director", sources: [], texts: { en: ["There's a scratch on his arm. Did something happen?"] } },
  { topic: "billing", weight: 1.5, route: "lookup", sources: ["table:billing"], texts: { en: ["Why was I charged $8?", "What's my balance?"] } },
  { topic: "billing", weight: 1, route: "handbook", sources: ["handbook:tuition"], texts: { en: ["Is tuition reduced if we're on vacation?", "How much is the late pickup fee?"] } },
  { topic: "other", weight: 1.5, route: "handbook_gap", sources: [], texts: { en: ["Is there a discount for twins?", "Do you run a summer camp for 5-year-olds?", "Can our nanny do drop-off on Tuesdays?"] } },
  { topic: "other", weight: 1.5, route: "saved", sources: ["saved:qr-sa-parking"], texts: { en: ["Where should I park at pickup?"], zh: ["接孩子的时候在哪里停车？"] } },
  { topic: "toileting", weight: 0.8, route: "saved", sources: ["saved:qr-sa-cloth-diapers"], texts: { en: ["Can we use cloth diapers?"] } },
  { topic: "other", weight: 0.3, route: "declined", sources: [], texts: { en: ["Who else in the Orcas has a nut allergy?"] } },
];

const ASKERS: Record<CenterId, string[]> = {
  "pinon-grove": [
    "Parent of Sam, Roadrunners", "Parent of Ella, Jackrabbits", "Parent of Isabella, Coyotes",
    "Parent of Lucas, Sunflowers", "Parent of Aiden, Roadrunners", "Parent of Camila, Coyotes",
    "Parent of Nora, Hummingbirds", "Parent of Elijah, Sunflowers", "Parent of Sofía, Jackrabbits",
    "Parent of Gabriel, Coyotes",
  ],
  "quail-ridge": [
    "Parent of Noah, Chickadees", "Parent of Olive, Ferns", "Parent of Hiro, Orcas",
    "Parent of Zoe, Chickadees", "Parent of Liam, Orcas", "Parent of Aria, Otters",
    "Parent of Theo, Ferns", "Parent of Mei, Orcas", "Parent of Felix, Chickadees",
    "Parent of Ruby, Ferns",
  ],
};

/** Share of parent messages written in the center's second language. */
const SECOND_LANGUAGE: Record<CenterId, { lang: Lang; share: number }> = {
  "pinon-grove": { lang: "es", share: 0.2 },
  "quail-ridge": { lang: "zh", share: 0.12 },
};

/** Relative chance of a question in each local hour, 0 to 23. */
const HOUR_WEIGHTS = [0, 0, 0, 0, 0, 1, 5, 9, 8, 5, 4, 4, 6, 5, 4, 4, 5, 6, 4, 6, 9, 8, 4, 1];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pickWeighted<T>(rand: () => number, items: T[], weightOf: (t: T) => number): T {
  const total = items.reduce((sum, t) => sum + weightOf(t), 0);
  let r = rand() * total;
  for (const t of items) {
    r -= weightOf(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

function isClosedOn(center: Center, date: string) {
  return center.closures.some((c) => inRange(date, c.date, c.endDate));
}

const REPLIES: Partial<Record<Topic, Record<"teacher" | "director", string>>> = {
  pickup: {
    director: "Thanks for letting us know. I called to confirm and made a note for today. Please add them to the pickup list in the app for next time.",
    teacher: "Thanks! I'll pass this to the office so they can confirm.",
  },
  child_day: {
    teacher: "All good today! Napped about an hour and a half and ate most of lunch.",
    director: "I checked with the teacher and everything went well today.",
  },
  behavior: {
    teacher: "Thanks for telling us. We've seen a little of that too. Let's find a time this week to talk about a plan together.",
    director: "Thanks for telling us. The lead teacher will reach out to set up a time to talk.",
  },
  incident: {
    director: "I'm sorry we missed telling you at pickup. There was a small bump on the play yard, and the incident report is now in the app. Please call me if you have any questions.",
    teacher: "There was a small bump outside. I've added the incident report in the app.",
  },
  other: {
    director: "Good question. We don't offer that right now, but I'll keep it in mind as we plan next year.",
    teacher: "I'll check with the director and get back to you.",
  },
};

const STAFF_REPLY_NAME: Record<CenterId, Record<"teacher" | "director", string>> = {
  "pinon-grove": { director: "Elena Vigil", teacher: "Lead teacher" },
  "quail-ridge": { director: "Hannah Lindqvist", teacher: "Lead teacher" },
};

export interface GeneratedHistory {
  logs: QuestionLog[];
  handoffs: Handoff[];
}

export function generateHistory(center: Center, now: Date, days = 56): GeneratedHistory {
  const templates = center.id === "pinon-grove" ? PINON_TEMPLATES : QUAIL_TEMPLATES;
  const today = zonedParts(now, center.timeZone).date;
  const second = SECOND_LANGUAGE[center.id];
  const openMin = minutesOf(center.hours.open);
  const closeMin = minutesOf(center.hours.close);
  const logs: QuestionLog[] = [];
  const handoffs: Handoff[] = [];

  for (let back = days; back >= 0; back--) {
    const date = addDays(today, -back);
    const rand = mulberry32(hashString(`${center.id}:${date}`));
    const weekday = weekdayOf(date);
    const weekend = weekday >= 6;
    const closed = weekend || isClosedOn(center, date);
    const base = center.id === "pinon-grove" ? 11 : 9;
    const count = closed ? 1 + Math.floor(rand() * 3) : base - 3 + Math.floor(rand() * 7);

    for (let i = 0; i < count; i++) {
      const hour = pickWeighted(rand, HOUR_WEIGHTS.map((w, h) => ({ w, h })), (x) => x.w).h;
      const minute = Math.floor(rand() * 60);
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const askedAt = zonedToUtc(date, time, center.timeZone);
      if (askedAt > now) continue;

      const template = pickWeighted(rand, templates, (t) =>
        t.season && inRange(date, t.season.from, t.season.to) ? t.weight * t.season.boost : t.weight,
      );
      const useSecond = Boolean(template.texts[second.lang]) && rand() < second.share * 2;
      const language: Lang = useSecond ? second.lang : "en";
      const options = template.texts[language] ?? template.texts.en ?? [];
      const text = options[Math.floor(rand() * options.length)];

      let route = template.route;
      // Some handbook questions turn out not to be covered.
      if (route === "handbook" && rand() < 0.08) route = "handbook_gap";
      const r = ROUTES[route];
      const understandTokens = 1300 + Math.floor(rand() * 500);
      const handbookTokens = 12000 + Math.floor(rand() * 2500);
      const tokens = r.lanes.includes("handbook")
        ? understandTokens + handbookTokens
        : r.lanes.includes("understand")
          ? understandTokens
          : 0;
      const minuteOfDay = hour * 60 + minute;
      const afterHours = closed || minuteOfDay < openMin || minuteOfDay >= closeMin;
      const answered = r.outcome === "answered";
      const feedbackRoll = rand();

      const id = `${center.id === "pinon-grove" ? "pg" : "qr"}-q-${date.replaceAll("-", "")}-${i}`;
      const askedBy = template.visitor ? "Visitor" : ASKERS[center.id][Math.floor(rand() * ASKERS[center.id].length)];
      logs.push({
        id,
        centerId: center.id,
        familyId: null,
        askedBy,
        askedAt: askedAt.toISOString(),
        language,
        text,
        topic: template.topic,
        lanes: r.lanes,
        outcome: r.outcome,
        handoffTo: r.to,
        sources: template.sources,
        tokens,
        feedback: answered && feedbackRoll < 0.35 ? (feedbackRoll < 0.03 ? "down" : "up") : undefined,
        afterHours,
      });

      if (r.outcome === "handoff" && r.to) {
        // Older handoffs were answered by staff. Planted open ones are added separately.
        const replyAt = new Date(askedAt.getTime() + (45 + Math.floor(rand() * 150)) * 60_000);
        const reply = REPLIES[template.topic]?.[r.to] ?? REPLIES.other![r.to];
        handoffs.push({
          id: id.replace("-q-", "-h-"),
          centerId: center.id,
          familyId: null,
          askedBy,
          createdAt: askedAt.toISOString(),
          language,
          text,
          topic: template.topic,
          reason: route === "handbook_gap" ? "Not covered by the handbook" : r.to === "teacher" ? "Only the teacher knows" : "Needs a person",
          priority: template.topic === "pickup" || template.topic === "incident" ? "urgent" : "normal",
          to: r.to,
          status: "answered",
          reply: { text: reply, by: STAFF_REPLY_NAME[center.id][r.to], at: replyAt.toISOString() },
        });
      }
    }
  }

  // Keep "answered" handoffs only when the reply time has passed.
  const answeredHandoffs = handoffs.filter((h) => !h.reply || new Date(h.reply.at) <= now);
  return { logs, handoffs: [...answeredHandoffs, ...plantedOpenHandoffs(center, now)] };
}

/** Open handoffs waiting in the director's inbox when the demo starts. */
function plantedOpenHandoffs(center: Center, now: Date): Handoff[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  if (center.id === "pinon-grove") {
    return [
      { id: "pg-h-open-1", centerId: center.id, familyId: null, askedBy: "Parent of Sam, Roadrunners", createdAt: ago(35), language: "en", text: "Can our neighbor Mrs. Lopez pick up Sam today at 4? She's not on the list.", topic: "pickup", reason: "Pickup permission needs staff", priority: "urgent", to: "director", status: "open" },
      { id: "pg-h-open-2", centerId: center.id, familyId: null, askedBy: "Parent of Lucas, Sunflowers", createdAt: ago(190), language: "en", text: "Do you offer swim lessons in the summer?", topic: "other", reason: "Not covered by the handbook", priority: "normal", to: "director", status: "open" },
      { id: "pg-h-open-3", centerId: center.id, familyId: null, askedBy: "Parent of Ella, Jackrabbits", createdAt: ago(80), language: "es", text: "Ella llegó a casa con un rasguño en la mejilla. ¿Qué pasó?", topic: "incident", reason: "Injury questions go to staff", priority: "normal", to: "teacher", status: "open" },
    ];
  }
  return [
    { id: "qr-h-open-1", centerId: center.id, familyId: null, askedBy: "Visitor", createdAt: ago(240), language: "en", text: "We're expecting twins in May. Is there a discount for twins if we join the waitlist?", topic: "tuition", reason: "Not covered by the handbook", priority: "normal", to: "director", status: "open" },
    { id: "qr-h-open-2", centerId: center.id, familyId: null, askedBy: "Parent of Olive, Ferns", createdAt: ago(55), language: "en", text: "Our new nanny will do drop-off on Tuesdays and Thursdays. What do you need from us?", topic: "pickup", reason: "Pickup permission needs staff", priority: "normal", to: "director", status: "open" },
    { id: "qr-h-open-3", centerId: center.id, familyId: null, askedBy: "Parent of Noah, Chickadees", createdAt: ago(120), language: "en", text: "Noah has been biting at home this week. Is it happening at school too?", topic: "behavior", reason: "Only the teacher knows", priority: "normal", to: "teacher", status: "open" },
  ];
}
