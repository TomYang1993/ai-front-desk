import type { Center, Child, Family, HandbookSection, Program, Topic } from "@/content";
import { addDays, zonedParts, minutesOf } from "../time";
import {
  dayStatus,
  eventsOn,
  formatDate,
  formatTime,
  hoursLine,
  nextOpenDay,
  openStatus,
  relativeDay,
  upcomingClosures,
} from "../facts/calendar";
import { allergyNote, menuFor, safeBackupLunch, ALLERGEN_LABEL } from "../facts/menu";
import { ageInMonths, decideIllness, type SymptomReport } from "../facts/illness";
import { upcomingTourSlots } from "../facts/tours";
import { balanceOf, findCharge, roomForProgram, usd } from "../facts/money";
import { handbookSource, tableSource } from "./context";
import type { Action, ReplyMode, Source } from "./types";

/**
 * English replies written by code from the center's data. Each composer
 * returns null when the data can't answer the question, and the engine
 * then falls back to reading the handbook.
 */

export interface Composed {
  mode: ReplyMode;
  text: string;
  topic: Topic;
  sources: Source[];
  actions: Action[];
  options?: string[];
}

export interface ComposeContext {
  center: Center;
  family: Family | undefined;
  sections: HandbookSection[];
  now: Date;
  today: string;
  /** Local minutes since midnight. */
  minute: number;
  bookedTours: string[];
}

const section = (ctx: ComposeContext, id: string) => {
  const s = ctx.sections.find((x) => x.id === id);
  return s ? [handbookSource(s)] : [];
};

const answer = (topic: Topic, text: string, sources: Source[], actions: Action[] = []): Composed => ({
  mode: "answer",
  text,
  topic,
  sources,
  actions,
});

export const childById = (family: Family | undefined, id: string | undefined) =>
  family?.children.find((c) => c.id === id);

export const leadTeacher = (center: Center, child: Child | undefined) => {
  const room = center.rooms.find((r) => r.id === child?.roomId);
  return center.staff.find((s) => s.id === room?.leadTeacherId);
};

export const director = (center: Center) => center.staff.find((s) => s.role === "director")!;
export const assistant = (center: Center) => center.staff.find((s) => s.role === "assistant_director")!;
const firstName = (name: string) => name.split(" ")[0];

/** Asks which child, when a question depends on the child and the family has several. */
export function whichChild(family: Family, topic: Topic, question: string): Composed {
  return {
    mode: "clarify",
    text: question,
    topic,
    sources: [],
    actions: [],
    options: family.children.map((c) => c.firstName),
  };
}

/* Calendar and hours */

export function composeClosure(ctx: ComposeContext, date: string | null): Composed {
  const { center, today } = ctx;
  const src = [tableSource(center, "calendar")];
  if (!date) {
    const next = upcomingClosures(center, today, 3);
    const list = next
      .map((c) => `${c.name}, ${formatDate(c.date)}${c.endDate ? ` through ${formatDate(c.endDate)}` : ""}`)
      .join("; ");
    return answer("closures", `${center.shortName}'s next closures are: ${list}. The full calendar is in the app.`, src);
  }
  const status = dayStatus(center, date);
  const when = relativeDay(date, today);
  const whenCap = when[0].toUpperCase() + when.slice(1);
  if (status.reason === "weekend") {
    return answer("closures", `${whenCap} is a ${formatDate(date).split(",")[0]}, and ${center.shortName} is open ${hoursLine(center)}.`, src);
  }
  if (status.reason === "closure") {
    const c = status.closure!;
    const span = c.endDate && c.endDate !== c.date ? `from ${formatDate(c.date)} through ${formatDate(c.endDate)}` : `on ${formatDate(date)}`;
    const reopen = nextOpenDay(center, addDays(c.endDate ?? c.date, 1));
    return answer("closures", `No, ${center.shortName} is closed ${span} for ${c.name}. We reopen ${formatDate(reopen)} at ${formatTime(center.hours.open)}.`, src);
  }
  const event = status.events[0];
  const note = event?.note.replace(/^Open regular hours\.?\s*/i, "").trim();
  const forEvent = event ? ` on ${event.name}` : "";
  return answer(
    "closures",
    `Yes, ${center.shortName} is open${forEvent}, ${formatDate(date)}, with regular hours from ${formatTime(center.hours.open)} to ${formatTime(center.hours.close)}.${note ? ` ${note}` : ""}`,
    src,
  );
}

export function composeHours(ctx: ComposeContext): Composed {
  const { center, now, today } = ctx;
  const status = openStatus(center, now);
  const live = status.openNow
    ? `We're open now until ${formatTime(center.hours.close)}.`
    : `We're closed right now and open again ${relativeDay(status.nextOpen.date, today)} at ${formatTime(status.nextOpen.time)}.`;
  return answer("hours", `${center.shortName} is open ${hoursLine(center)}. ${live}`, [tableSource(center, "hours")]);
}

/* Food */

function childNotes(ctx: ComposeContext, subject: string, itemFor: (c: Child) => { name: string; allergens: string[] } | null) {
  const notes: string[] = [];
  for (const child of ctx.family?.children ?? []) {
    if (ageInMonths(child.birthDate, ctx.today) < 12) {
      notes.push(`${child.firstName} follows the infant feeding plan.`);
      continue;
    }
    const item = itemFor(child);
    const note = item ? allergyNote(item as never, child, subject) : null;
    if (note) notes.push(note);
  }
  return notes;
}

export function composeMenu(ctx: ComposeContext, date: string | null): Composed {
  const { center, today } = ctx;
  const day = date ?? today;
  const when = relativeDay(day, today);
  const status = dayStatus(center, day);
  const src = [tableSource(center, "menu")];
  if (!status.open) {
    return answer("meals", `${center.shortName} is closed ${when === "today" || when === "tomorrow" ? when : `on ${when}`}, so there's no menu that day.`, src);
  }
  const menu = menuFor(center, day)!;
  if (center.meals === "provided") {
    const notes = childNotes(ctx, "Lunch", () => menu.lunch ?? null);
    return answer(
      "meals",
      `Lunch ${when} is ${menu.lunch!.name.toLowerCase()}. Breakfast is ${menu.breakfast!.name.toLowerCase()}, and afternoon snack is ${menu.pmSnack!.name.toLowerCase()}.${notes.length ? ` ${notes.join(" ")}` : ""}`,
      src,
    );
  }
  const backup = menu.backupLunch!;
  const notes = childNotes(ctx, "The backup lunch", (c) => safeBackupLunch(menu, c)?.item ?? backup.main);
  return answer(
    "meals",
    `Families pack lunch at ${center.shortName}. The backup lunch ${when} is ${backup.main.name.toLowerCase()}, or ${backup.alternative.name.toLowerCase()} as the allergy-friendly option, for ${usd(center.fees.backupLunch!)}. Snacks are ${menu.amSnack!.name.toLowerCase()} in the morning and ${menu.pmSnack!.name.toLowerCase()} in the afternoon.${notes.length ? ` ${notes.join(" ")}` : ""}`,
    src,
  );
}

export function composeForgotLunch(ctx: ComposeContext, child: Child | undefined): Composed | null {
  const { center, today, family } = ctx;
  const status = dayStatus(center, today);
  if (!status.open) return answer("meals", `${center.shortName} is closed today, so no lunch is needed.`, [tableSource(center, "calendar")]);
  const menu = menuFor(center, today)!;
  const src = [...section(ctx, "meals"), tableSource(center, "menu")];

  if (center.meals === "provided") {
    const note = child && menu.lunch ? allergyNote(menu.lunch, child, "Lunch") : null;
    return answer(
      "meals",
      `No need to pack lunch at ${center.shortName}. Lunch is provided every day, and today it's ${menu.lunch!.name.toLowerCase()}.${note ? ` ${note}` : ""}`,
      src,
    );
  }

  if (!child && family && family.children.length > 1) {
    return whichChild(family, "meals", "Which child is the lunch for?");
  }
  const cutoff = minutesOf("10:30");
  if (ctx.minute > cutoff) {
    return {
      ...answer("meals", `Backup lunch orders close at 10:30 am. Please call the front desk at ${center.phone}, and the team will make sure ${child?.firstName ?? "your child"} gets lunch.`, src, [{ type: "call_center", phone: center.phone }]),
    };
  }
  const pick = safeBackupLunch(menu, child);
  if (!pick || !pick.item) {
    return answer(
      "meals",
      `Neither backup lunch today is safe for ${child?.firstName}'s allergies. Please call the front desk at ${center.phone} so the team can work something out.`,
      src,
      [{ type: "call_center", phone: center.phone }],
    );
  }
  const name = child?.firstName ?? "your child";
  const avoided = pick.avoided && child
    ? ` Today's main option is the ${pick.avoided.name.toLowerCase()}, but it has ${pick.avoided.allergens.filter((a) => child.allergies.includes(a)).map((a) => ALLERGEN_LABEL[a]).join(" and ")}, so I'd suggest the ${pick.item.name.toLowerCase()} for ${name} instead.`
    : ` Today's backup lunch is the ${pick.item.name.toLowerCase()}.`;
  const actions: Action[] = child
    ? [{ type: "order_backup_lunch", childId: child.id, childName: child.firstName, item: pick.item.name, price: center.fees.backupLunch!, date: today }]
    : [];
  return answer(
    "meals",
    `No problem, ${center.shortName} keeps a backup lunch every day.${avoided} It's ${usd(center.fees.backupLunch!)}, added to your account. Orders close at 10:30 am.`,
    src,
    actions,
  );
}

/* Illness */

export function composeIllness(ctx: ComposeContext, child: Child | undefined, report: SymptomReport, estimate: boolean): Composed | null {
  const { center, today, family } = ctx;
  if (!child) {
    if (family && family.children.length > 1) return whichChild(family, "illness", "Which child is this about?");
    return null;
  }
  const decision = decideIllness(center, report, ageInMonths(child.birthDate, today));
  const src = section(ctx, "illness");
  const name = child.firstName;

  if (decision.status === "not_rule_based") return null;

  if (decision.status === "needs_info") {
    const asks = decision.missing.map((m) =>
      m === "temperature" ? `what ${name}'s highest temperature was` : m === "time" ? "about what time it happened" : "how many times it happened in the past 24 hours",
    );
    const list = asks.length > 1 ? `${asks.slice(0, -1).join(", ")} and ${asks.at(-1)}` : asks[0];
    return { mode: "clarify", text: `I can check ${center.shortName}'s illness policy for ${name}. Can you tell me ${list}?`, topic: "illness", sources: src, actions: [] };
  }

  if (decision.status === "can_attend") {
    const below =
      report.kind === "fever"
        ? `A temperature of ${report.temperatureF}°F is below the ${center.illness.feverThresholdF}°F fever threshold in ${center.shortName}'s policy, so ${name} can come in`
        : `Under ${center.shortName}'s policy, that doesn't require staying home, so ${name} can come in`;
    return answer(
      "illness",
      `${below} as long as ${name} feels well enough for a full day, including outdoor play. Teachers will call you if anything changes.`,
      src,
    );
  }

  const stay = decision.status === "stay_home" ? decision.returnAfter : decision.ifStayHome;
  const earliest = decision.status === "stay_home" ? decision.earliest : decision.ifStayHome?.earliest;
  if (!stay || !earliest) return null;
  const rel = relativeDay(earliest.date, today);
  const returnWhen = earliest.midday
    ? `${rel} after ${formatTime(earliest.time)}`
    : rel === "today" || rel === "tomorrow"
      ? `${rel} morning`
      : `the morning of ${rel}`;
  const symptomEnd = `${relativeDay(stay.date, today)} at ${formatTime(stay.time)}`;
  const assumed = estimate ? " I've assumed the latest likely time, so let me know if it was earlier." : "";
  // After closing time, today is already over, so the absence starts tomorrow.
  const dayStillAhead = ctx.minute < minutesOf(center.hours.close);
  const absentDays: string[] = [];
  for (let d = dayStillAhead ? today : addDays(today, 1); d < earliest.date; d = addDays(d, 1)) if (dayStatus(center, d).open) absentDays.push(d);
  const actions: Action[] = absentDays.length
    ? [{ type: "log_absence", childId: child.id, childName: name, dates: absentDays, reason: `Illness: ${report.kind}` }]
    : [];

  if (decision.status === "depends") {
    return answer(
      "illness",
      `Under ${center.shortName}'s policy, a fever of ${center.illness.feverThresholdF}°F or higher means staying home when it comes with other signs of illness, like a sore throat, earache, rash, vomiting or a change in behavior. If ${name} has any of those, the earliest return is ${returnWhen}, after 24 hours without a fever and without fever-reducing medicine. If ${name} is acting completely normal, the policy allows coming in, but please tell the teacher so they can keep a close eye.`,
      src,
      actions,
    );
  }

  const today0 = earliest.date > today && dayStatus(center, today).open && dayStillAhead ? "Not today. " : "";
  const why =
    report.kind === "fever"
      ? `${center.shortName}'s policy asks children to stay home until 24 hours without a fever and without fever-reducing medicine.`
      : report.kind === "antibiotics"
        ? `${center.shortName}'s policy asks children to have ${center.illness.antibioticHoursToReturn} hours of antibiotics before returning.`
        : `${center.shortName}'s policy asks children to stay home until 24 hours without vomiting or diarrhea.`;
  const alreadyPast = stay.date < today || (stay.date === today && minutesOf(stay.time) <= ctx.minute);
  const clock =
    report.kind === "antibiotics"
      ? `That ${alreadyPast ? "was" : "is"} ${symptomEnd}.`
      : `That 24 hours ${alreadyPast ? "ended" : "ends"} ${symptomEnd}.`;
  return answer(
    "illness",
    `${today0}${why} ${clock} The earliest ${name} can come back is ${returnWhen}, as long as ${name} stays ${report.kind === "fever" ? "fever-free" : "symptom-free"}.${assumed}`,
    src,
    actions,
  );
}

/* Attendance */

export function composeAbsence(ctx: ComposeContext, child: Child | undefined, dates: string[]): Composed | null {
  const { family, center, today } = ctx;
  if (!family) return null;
  if (!child) {
    if (family.children.length > 1) return whichChild(family, "absence", "Which child will be out?");
    return null;
  }
  const days = (dates.length ? dates : [today]).filter((d) => dayStatus(center, d).open);
  if (!days.length) {
    return answer("absence", `${center.shortName} is closed that day, so there's nothing to report.`, [tableSource(center, "calendar")]);
  }
  const teacher = leadTeacher(center, child);
  const list = days.map((d) => relativeDay(d, today)).join(", ");
  return answer(
    "absence",
    `Thanks for letting us know. I can log ${child.firstName}'s absence for ${list}, so ${teacher ? firstName(teacher.name) : "the teacher"} knows not to expect ${child.firstName}.`,
    section(ctx, "attendance"),
    [{ type: "log_absence", childId: child.id, childName: child.firstName, dates: days, reason: "Reported by parent" }],
  );
}

/* Money and enrollment */

function assistanceLine(center: Center) {
  if (center.id === "pinon-grove") {
    return `New Mexico's Child Care Assistance program pays the full cost for families where every available parent works, is looking for work, or attends school, regardless of income. The state decides eligibility, and ${firstName(assistant(center).name)} can help you apply.`;
  }
  return `${center.shortName} accepts Working Connections Child Care, Washington's child care subsidy. DCYF decides eligibility and copayments.`;
}

function tourAction(ctx: ComposeContext): Action[] {
  const slots = upcomingTourSlots(ctx.center, ctx.now, 14, ctx.bookedTours).slice(0, 4);
  return slots.length ? [{ type: "book_tour", slots }] : [];
}

export function composeTuition(ctx: ComposeContext, program: Program | null): Composed {
  const { center, family } = ctx;
  const src = [tableSource(center, "tuition"), ...section(ctx, "tuition")];
  const room = program ? roomForProgram(center, program) : undefined;
  const visitor = !family;
  if (program && !room) {
    return answer("tuition", `${center.shortName} doesn't have a room for that age group. Our rooms are ${center.rooms.map((r) => `${r.name} (${r.ages})`).join(", ")}.`, src);
  }
  if (!room) {
    const list = center.rooms.map((r) => `${r.name} (${r.ages}) ${usd(r.tuitionMonthly)}`).join("; ");
    return answer("tuition", `Full-time monthly tuition at ${center.shortName}: ${list}. ${assistanceLine(center)}`, src, visitor ? tourAction(ctx) : []);
  }
  const part = room.partTimeMonthly ? ` Part time (${room.partTimeSchedule}) is ${usd(room.partTimeMonthly)}.` : "";
  const fee = center.fees.waitlistFee ? `, and joining costs ${usd(center.fees.waitlistFee)}, which is non-refundable` : "";
  const sibling = center.fees.siblingDiscountPct ? ` Siblings get ${center.fees.siblingDiscountPct}% off the older sibling's tuition.` : "";
  return answer(
    "tuition",
    `Full-time care in the ${room.name} room (${room.ages}) is ${usd(room.tuitionMonthly)} a month.${part} ${assistanceLine(center)} The ${room.name} waitlist is ${room.waitlist} right now${fee}.${sibling}${visitor ? " Would you like to see the center? Here are the next tour times." : ""}`,
    src,
    visitor ? tourAction(ctx) : [],
  );
}

export function composeWaitlist(ctx: ComposeContext, program: Program | null): Composed {
  const { center } = ctx;
  const src = [tableSource(center, "tuition"), ...section(ctx, "enrollment")];
  const room = program ? roomForProgram(center, program) : undefined;
  const fee = center.fees.waitlistFee ? `Joining the waitlist costs ${usd(center.fees.waitlistFee)}, which is non-refundable.` : "There's no fee to join the waitlist.";
  const waits = room
    ? `The ${room.name} waitlist (${room.ages}) is ${room.waitlist} right now.`
    : `Current waits: ${center.rooms.map((r) => `${r.name} ${r.waitlist}`).join("; ")}.`;
  return answer(
    "enrollment",
    `${waits} ${fee} You can join through the interest form in the app or by calling ${assistant(center).name} at ${center.phone}.`,
    src,
    ctx.family ? [] : tourAction(ctx),
  );
}

export function composeTour(ctx: ComposeContext, date: string | null): Composed {
  const { center, now, today } = ctx;
  let slots = upcomingTourSlots(center, now, 21, ctx.bookedTours);
  if (date) {
    const sameWeek = slots.filter((s) => s.date >= date && s.date <= addDays(date, 6));
    if (sameWeek.length) slots = sameWeek;
  }
  slots = slots.slice(0, 4);
  const src = [tableSource(center, "tours")];
  if (!slots.length) {
    return answer("tours", `There are no open tour times in the next three weeks. Please call ${center.phone} and ${firstName(assistant(center).name)} will find a time.`, src, [{ type: "call_center", phone: center.phone }]);
  }
  const list = slots.map((s) => `${relativeDay(s.date, today)} at ${formatTime(s.time)}`).join(", ");
  return answer(
    "tours",
    `Tours at ${center.shortName} take about ${center.tourMinutes} minutes, and children are welcome to come along. The next open times are ${list}. Pick one below to book it.`,
    src,
    [{ type: "book_tour", slots }],
  );
}

export function composeBilling(ctx: ComposeContext, amount: number | null): Composed | null {
  const { family } = ctx;
  if (!family) return null;
  const src: Source[] = [{ id: "table:billing", label: "Your account" }];
  const balance = balanceOf(family.billing.ledger);
  const balanceLine = `Your current balance is ${usd(balance)}.`;
  if (amount != null) {
    const charge = findCharge(family, amount);
    if (!charge) return null;
    return answer("billing", `That ${usd(amount)} charge is from ${formatDate(charge.date)}: ${charge.description}. ${balanceLine}`, src);
  }
  const plan = family.billing.monthlyAmount === 0
    ? `Your care is covered: ${family.billing.plan}.`
    : `Your plan is ${family.billing.plan}, ${usd(family.billing.monthlyAmount)} a month${family.billing.autopay ? " on autopay" : ""}.`;
  return answer("billing", `${plan} ${balanceLine}`, src);
}

export function composeEvents(ctx: ComposeContext, date: string | null): Composed | null {
  const { center, today } = ctx;
  const src = [tableSource(center, "calendar")];
  if (date) {
    if (!dayStatus(center, date).open && dayStatus(center, date).reason === "closure") return composeClosure(ctx, date);
    const events = eventsOn(center, date);
    if (!events.length) return null;
    return answer("events", events.map((e) => `${e.name}, ${formatDate(e.date)}${e.endDate ? ` through ${formatDate(e.endDate)}` : ""}. ${e.note}`).join(" "), src);
  }
  const upcoming = center.events.filter((e) => (e.endDate ?? e.date) >= today && e.date <= addDays(today, 60));
  if (!upcoming.length) return null;
  return answer("events", `Coming up at ${center.shortName}: ${upcoming.map((e) => `${e.name}, ${formatDate(e.date)}${e.endDate ? ` through ${formatDate(e.endDate)}` : ""}`).join("; ")}.`, src);
}

/* Small talk and refusals */

export function composeGreeting(ctx: ComposeContext): Composed {
  const { center, family } = ctx;
  const text = family
    ? `Hi ${family.parentFirstName}! I'm Maple, ${center.shortName}'s front desk assistant. Ask me about closures, meals, illness, tuition or anything in the family handbook.`
    : `Hi! I'm Maple, ${center.shortName}'s front desk assistant. I can help with tuition, the waitlist, tours and our policies.`;
  return answer("other", text, []);
}

export const composeThanks = (): Composed => answer("other", "You're welcome. I'm here any time.", []);

export const composeOffTopic = (ctx: ComposeContext): Composed =>
  answer("other", `I can only help with questions about ${ctx.center.shortName}. Try asking about hours, meals, illness, tuition or tours.`, []);

export function composeOtherFamily(ctx: ComposeContext, child: Child | undefined): Composed {
  const teacher = leadTeacher(ctx.center, child);
  return {
    mode: "declined",
    text: `I can't share information about other children or families. Every family's details stay private.${teacher ? ` If you have a question about how the class handles allergies or safety, ${teacher.name} is happy to talk with you.` : ""}`,
    topic: "other",
    sources: section(ctx, "concerns"),
    actions: [],
  };
}

export function composePrivateInfo(ctx: ComposeContext): Composed {
  const { center } = ctx;
  return {
    mode: "declined",
    text: `I can't share staff members' personal contact details. You can reach ${center.shortName} at ${center.phone} or ${center.email}, and I can pass a message along to ${director(center).name}.`,
    topic: "other",
    sources: section(ctx, "welcome"),
    actions: [{ type: "call_center", phone: center.phone }],
  };
}

export const localMinute = (now: Date, center: Center) => {
  const p = zonedParts(now, center.timeZone);
  return p.hour * 60 + p.minute;
};
