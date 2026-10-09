import "server-only";
import type { CenterId, Handoff, Lang, QuestionLog, TableId, Topic } from "@/content";
import { getCenter, getFamilies, getFeedback, getHandbook, getHandledFeedback, getHandoffs, getLogs, getSeededAt, getTourBookings, type HandledFeedback } from "./data";
import { dayStatus, formatDate, formatTime, hoursLine, upcomingClosures, weekdayName } from "./facts/calendar";
import { ALLERGEN_LABEL, menuFor } from "./facts/menu";
import { upcomingTourSlots } from "./facts/tours";
import { menuWeek } from "./engine/compose";
import { usd } from "./facts/money";
import { groupSimilar, toEnglish } from "./engine/drafts";
import { GENERAL_REASONS, MINUTES_PER_ANSWER } from "./console-constants";
import { zonedParts } from "./time";

/**
 * Everything the control center shows, for one center. Built on the
 * server from the shared store, so it always matches what parents see.
 */

const DAY = 24 * 3600 * 1000;

export interface InboxItem {
  id: string;
  createdAt: string;
  from: string;
  familyId: string | null;
  childName: string | null;
  roomName: string | null;
  language: Lang;
  text: string;
  /** The parent's words in English, when they wrote in another language. */
  textEnglish: string | null;
  reason: string;
  /** What Maple said just before, when the parent asked for a person. */
  context: string | null;
  priority: "urgent" | "normal";
  to: "director" | "teacher";
  toName: string;
  status: "open" | "answered";
  reply: { text: string; by: string; at: string; translated: string | null; withSavedAnswer: boolean } | null;
  savedAnswerId: string | null;
  /** Other families' messages asking essentially the same thing, from the last 4 weeks. */
  similar: { id: string; from: string; text: string; createdAt: string; status: "open" | "answered" }[];
  /** An answer already saved for this question, ready to send. */
  existingAnswer: { id: string; question: string; answer: string } | null;
}

export interface Overview {
  questions: number;
  questionsBefore: number;
  handledShare: number;
  handledShareBefore: number;
  minutesSaved: number;
  afterHours: number;
  openHandoffs: number;
  urgentOpen: number;
  weeks: { label: string; byMaple: number; byStaff: number }[];
  topics: { topic: Topic; label: string; count: number; before: number }[];
  languages: { language: Lang; count: number }[];
  /** Questions Maple couldn't answer, grouped when families asked the same thing. */
  notHelpful: {
    id: string;
    text: string;
    textEnglish: string | null;
    /** What Maple said, in English for the director. Older seeded questions don't have it. */
    answer: string | null;
    at: string;
    topic: string;
    sources: { id: string; label: string; sectionId: string | null }[];
    handled: HandledFeedback | null;
  }[];
  /** Unhelpful answers not yet handled. Questions Maple couldn't answer live in the inbox. */
  toFix: { unhelpful: number };
}

export interface KnowledgeView {
  sections: { id: string; title: string; body: string; updatedAt: string; updatedBy: string; uses: number }[];
  saved: { id: string; question: string; answer: string; keywords: string[]; savedBy: string; savedAt: string; uses: number; fromHandoffId: string | null }[];
  /** Set by the director and rarely changes: calendar, tuition and rooms, hours. */
  tables: { id: TableId; label: string; updatedAt: string; updatedBy: string; uses: number; lines: string[] }[];
  /** Changes week to week: this week's menu and the next two weeks of tour times. Read-only for now. */
  weekly: {
    menu: { updatedAt: string; updatedBy: string; uses: number; days: { date: string; label: string; closed: string | null; items: { label: string; name: string; allergens: string[] }[] }[] };
    tours: { updatedAt: string; updatedBy: string; uses: number; slots: { id: string; label: string; bookedBy: string | null }[] };
  };
}

export interface ConsoleView {
  center: { id: CenterId; name: string; shortName: string; city: string; state: string };
  me: { name: string; firstName: string };
  inbox: InboxItem[];
  overview: Overview;
  knowledge: KnowledgeView;
  families: { id: string; label: string; language: Lang }[];
  /** When the demo data was last reset. The page starts fresh when it changes. */
  seededAt: string | null;
}

export const TOPIC_LABEL: Record<Topic, string> = {
  hours: "Hours", closures: "Closures", weather: "Weather", illness: "Illness", medication: "Medication",
  meals: "Meals", allergies: "Allergies", tuition: "Tuition", billing: "Billing", enrollment: "Enrollment",
  tours: "Tours", pickup: "Pickup", absence: "Absences", schedule: "Daily schedule", toileting: "Toileting",
  clothing: "Clothing", celebrations: "Celebrations", outdoor: "Outdoor play", events: "Events", custody: "Custody",
  behavior: "Behavior", incident: "Incidents", child_day: "My child's day", other: "Other",
};

const TABLE_LABEL: Record<TableId, string> = { calendar: "Calendar and closures", menu: "Menu", tuition: "Tuition and rooms", tours: "Tour times", hours: "Hours" };
const handled = (l: QuestionLog) => l.outcome === "answered" || l.outcome === "declined";

export async function getConsoleView(centerId: CenterId, staffId: string | null, now = new Date()): Promise<ConsoleView> {
  const [center, families, sections, handoffs, logs, feedback, handledFeedback, bookings, seededAt] = await Promise.all([
    getCenter(centerId),
    getFamilies(centerId),
    getHandbook(centerId),
    getHandoffs(centerId),
    getLogs(centerId),
    getFeedback(centerId),
    getHandledFeedback(centerId),
    getTourBookings(centerId),
    getSeededAt(),
  ]);
  const me = center.staff.find((s) => s.id === staffId) ?? center.staff.find((s) => s.role === "director")!;
  const t = now.getTime();
  const inWindow = (iso: string, fromDaysAgo: number, toDaysAgo: number) => {
    const at = new Date(iso).getTime();
    return at > t - fromDaysAgo * DAY && at <= t - toDaysAgo * DAY;
  };
  const week = logs.filter((l) => inWindow(l.askedAt, 7, 0));
  const weekBefore = logs.filter((l) => inWindow(l.askedAt, 14, 7));

  /* Inbox: open first, urgent first, then whoever has waited longest. Recent answered ones follow. */
  const open = handoffs.filter((h) => h.status === "open").sort((a, b) => (a.priority === b.priority ? a.createdAt.localeCompare(b.createdAt) : a.priority === "urgent" ? -1 : 1));
  const answered = handoffs.filter((h) => h.status === "answered").sort((a, b) => (b.reply?.at ?? b.createdAt).localeCompare(a.reply?.at ?? a.createdAt)).slice(0, 25);
  // General questions from the last 4 weeks, checked for repeats. Each is listed in the inbox so it can be opened.
  const general = handoffs.filter((h) => GENERAL_REASONS.has(h.reason) && inWindow(h.createdAt, 28, 0)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shown = [...open, ...answered];
  const listed = new Set(shown.map((h) => h.id));
  for (const h of general) {
    if (listed.has(h.id)) continue;
    shown.push(h);
    listed.add(h.id);
  }
  // Unhandled first, then the most recently handled.
  const down = logs
    .filter((l) => (l.feedback ?? feedback[l.id]) === "down" && inWindow(l.askedAt, 28, 0))
    .sort((a, b) => Number(Boolean(handledFeedback[a.id])) - Number(Boolean(handledFeedback[b.id])) || b.askedAt.localeCompare(a.askedAt))
    .slice(0, 8);
  const english = await withTimeout(
    toEnglish([
      ...shown.filter((h) => h.language !== "en").map((h) => h.text),
      ...down.filter((l) => l.language !== "en").flatMap((l) => [l.text, l.answer ?? ""]),
    ]),
    new Map<string, string>(),
  );
  const sourceLabel = (id: string): { id: string; label: string; sectionId: string | null } => {
    const [kind, key] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
    if (kind === "handbook") return { id, label: sections.find((x) => x.id === key)?.title ?? key, sectionId: key };
    if (kind === "table") return { id, label: TABLE_LABEL[key as TableId] ?? key, sectionId: null };
    if (kind === "saved") return { id, label: `Saved answer: ${center.savedAnswers.find((a) => a.id === key)?.question ?? key}`, sectionId: null };
    return { id, label: id, sectionId: null };
  };
  const savedFrom = new Map(center.savedAnswers.filter((a) => a.fromHandoffId).map((a) => [a.fromHandoffId!, a.id]));
  for (const h of handoffs) if (h.reply?.savedAnswerId) savedFrom.set(h.id, h.reply.savedAnswerId);
  const groups = await withTimeout(groupSimilar(general.map((h) => ({ id: h.id, text: english.get(h.text) ?? h.text }))), [] as string[][]);
  const groupOf = new Map<string, string[]>();
  for (const g of groups) for (const id of g) groupOf.set(id, g);
  const byId = new Map(handoffs.map((h) => [h.id, h]));
  const fromLabel = (h: Handoff) => (h.familyId ? families.find((f) => f.id === h.familyId)?.parentName : undefined) ?? h.askedBy ?? "A parent";

  const inboxItem = (h: Handoff): InboxItem => {
    const family = h.familyId ? families.find((f) => f.id === h.familyId) : undefined;
    const child = family?.children.find((c) => c.id === h.childId) ?? (family?.children.length === 1 ? family.children[0] : undefined);
    const room = child ? center.rooms.find((r) => r.id === child.roomId) : undefined;
    const teacher = h.to === "teacher" && room ? center.staff.find((s) => s.id === room.leadTeacherId) : undefined;
    return {
      id: h.id,
      createdAt: h.createdAt,
      from: family?.parentName ?? h.askedBy ?? "A parent",
      familyId: family?.id ?? null,
      childName: child?.firstName ?? null,
      roomName: room?.name ?? null,
      language: h.language,
      text: h.text,
      textEnglish: h.language === "en" ? null : english.get(h.text) ?? null,
      reason: h.reason,
      context: h.context ?? null,
      priority: h.priority,
      to: h.to,
      toName: teacher?.name ?? (h.to === "teacher" ? "the lead teacher" : me.name),
      status: h.status,
      reply: h.reply ? { text: h.reply.text, by: h.reply.by, at: h.reply.at, translated: h.reply.translated?.text ?? null, withSavedAnswer: Boolean(h.reply.savedAnswerId) } : null,
      savedAnswerId: savedFrom.get(h.id) ?? null,
      similar: (groupOf.get(h.id) ?? [])
        .filter((id) => id !== h.id)
        .map((id) => byId.get(id)!)
        .map((x) => ({ id: x.id, from: fromLabel(x), text: english.get(x.text) ?? x.text, createdAt: x.createdAt, status: x.status })),
      existingAnswer: (() => {
        const savedId = (groupOf.get(h.id) ?? [h.id]).map((id) => savedFrom.get(id)).find(Boolean);
        const saved = savedId ? center.savedAnswers.find((a) => a.id === savedId) : undefined;
        return saved ? { id: saved.id, question: saved.question, answer: saved.answer } : null;
      })(),
    };
  };

  /* Overview */
  const share = (list: QuestionLog[]) => (list.length ? list.filter(handled).length / list.length : 0);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = 7 * (8 - i);
    const list = logs.filter((l) => inWindow(l.askedAt, from, from - 7));
    const start = zonedParts(new Date(t - from * DAY + DAY), center.timeZone).date;
    return { label: formatDate(start, false).replace(/^(\w{3})\w*/, "$1"), byMaple: list.filter(handled).length, byStaff: list.filter((l) => !handled(l)).length };
  });
  const count = <K extends string>(list: QuestionLog[], key: (l: QuestionLog) => K) => list.reduce((m, l) => m.set(key(l), (m.get(key(l)) ?? 0) + 1), new Map<K, number>());
  const topicNow = count(week, (l) => l.topic);
  const topicBefore = count(weekBefore, (l) => l.topic);
  const languages = count(week, (l) => l.language);

  /* Knowledge, with how often each source was used this week */
  const uses = (id: string) => week.filter((l) => l.sources.includes(id)).length;
  const today = zonedParts(now, center.timeZone).date;
  const day = menuFor(center, today);
  const tableLines: Record<TableId, string[]> = {
    hours: [hoursLine(center), `Office answers messages ${formatTime(center.officeHours.start)} to ${formatTime(center.officeHours.end)}`],
    calendar: upcomingClosures(center, today, 3).map((c) => `${c.name}: ${formatDate(c.date)}${c.endDate ? ` to ${formatDate(c.endDate)}` : ""}`),
    menu: day
      ? center.meals === "provided"
        ? [`Today's lunch: ${day.lunch?.name}`, `${center.menu.weeks.length}-week menu cycle`]
        : [`Today's backup lunch: ${day.backupLunch?.main.name}, or ${day.backupLunch?.alternative.name}`, `${center.menu.weeks.length}-week menu cycle`]
      : [`${center.menu.weeks.length}-week menu cycle`],
    tuition: center.rooms.map((r) => `${r.name} (${r.ages}): ${usd(r.tuitionMonthly)} a month, waitlist ${r.waitlist}`),
    tours: center.tours.map((x) => `${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][x.weekday - 1]} at ${formatTime(x.time)}`),
  };

  return {
    center: { id: center.id, name: center.name, shortName: center.shortName, city: center.city, state: center.state },
    me: { name: me.name, firstName: me.name.split(" ")[0] },
    seededAt,
    inbox: shown.map(inboxItem),
    overview: {
      questions: week.length,
      questionsBefore: weekBefore.length,
      handledShare: share(week),
      handledShareBefore: share(weekBefore),
      minutesSaved: week.filter(handled).length * MINUTES_PER_ANSWER,
      afterHours: week.filter((l) => l.afterHours && handled(l)).length,
      openHandoffs: open.length,
      urgentOpen: open.filter((h) => h.priority === "urgent").length,
      weeks,
      topics: [...topicNow.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([topic, n]) => ({ topic, label: TOPIC_LABEL[topic], count: n, before: topicBefore.get(topic) ?? 0 })),
      languages: [...languages.entries()].sort((a, b) => b[1] - a[1]).map(([language, n]) => ({ language, count: n })),
      notHelpful: down.map((l) => ({
        id: l.id,
        text: l.text,
        textEnglish: l.language === "en" ? null : english.get(l.text) ?? null,
        answer: l.answer ? (l.language === "en" ? l.answer : english.get(l.answer) ?? l.answer) : null,
        at: l.askedAt,
        topic: TOPIC_LABEL[l.topic],
        sources: l.sources.map(sourceLabel),
        handled: handledFeedback[l.id] ?? null,
      })),
      toFix: { unhelpful: down.filter((l) => !handledFeedback[l.id]).length },
    },
    knowledge: {
      sections: sections.map((s) => ({ id: s.id, title: s.title, body: s.body, updatedAt: s.updatedAt, updatedBy: s.updatedBy, uses: uses(`handbook:${s.id}`) })),
      saved: [...center.savedAnswers].reverse().map((a) => ({ id: a.id, question: a.question, answer: a.answer, keywords: a.keywords, savedBy: a.savedBy, savedAt: a.savedAt, uses: uses(`saved:${a.id}`), fromHandoffId: a.fromHandoffId ?? null })),
      tables: (["calendar", "tuition", "hours"] as TableId[]).map((id) => ({ id, label: TABLE_LABEL[id], ...center.tableUpdates[id], uses: uses(`table:${id}`), lines: tableLines[id] })),
      weekly: {
        menu: {
          ...center.tableUpdates.menu,
          uses: uses("table:menu"),
          days: menuWeek(today).map((date) => {
            const status = dayStatus(center, date);
            const m = status.open ? menuFor(center, date) : null;
            const item = (label: string, x?: { name: string; allergens: string[] }) => (x ? [{ label, name: x.name, allergens: x.allergens.map((a) => ALLERGEN_LABEL[a as keyof typeof ALLERGEN_LABEL]) }] : []);
            return {
              date,
              label: `${weekdayName(date).slice(0, 3)}, ${formatDate(date, false)}`,
              closed: status.open ? null : status.closure?.name ?? "Closed",
              items: !m
                ? []
                : center.meals === "provided"
                  ? [...item("Breakfast", m.breakfast), ...item("Lunch", m.lunch), ...item("Snack", m.pmSnack)]
                  : [...item("Morning snack", m.amSnack), ...item("Afternoon snack", m.pmSnack), ...item("Backup lunch", m.backupLunch?.main), ...item("Allergy-friendly backup", m.backupLunch?.alternative)],
            };
          }),
        },
        tours: {
          ...center.tableUpdates.tours,
          uses: uses("table:tours"),
          slots: upcomingTourSlots(center, now, 14).map((slot) => ({
            id: slot.id,
            label: `${weekdayName(slot.date).slice(0, 3)}, ${formatDate(slot.date, false)} at ${formatTime(slot.time)}`,
            bookedBy: bookings.find((b) => b.slotId === slot.id)?.name ?? null,
          })),
        },
      },
    },
    families: families.map((f) => ({ id: f.id, label: `${f.parentName} (${f.children.map((c) => c.firstName).join(" and ")})`, language: f.preferredLanguage })),
  };
}

/** The control center never waits long on the AI; untranslated text is fine. */
function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 5000): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}
