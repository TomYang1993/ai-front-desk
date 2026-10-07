/**
 * Validates the fictional center content and prints a review summary.
 * Run with: npm run check:content
 */
import { centers, families, seedHandbook } from "../src/content";
import { generateHistory } from "../src/content/history";
import type { Allergen, Center } from "../src/content";
import { inRange, weekdayOf, zonedParts, minutesOf } from "../src/lib/time";

const failures: string[] = [];
const fail = (msg: string) => failures.push(msg);
const check = (ok: boolean, msg: string) => ok || fail(msg);

const now = new Date();
const REQUIRED_SECTIONS = ["welcome", "hours", "tuition", "enrollment", "pickup", "late-pickup", "attendance", "illness", "medication", "meals", "allergies", "weather", "clothing", "schedule", "celebrations", "custody", "safety", "concerns"];

const closedOn = (c: Center, date: string) => c.closures.find((x) => inRange(date, x.date, x.endDate));
const monthsOld = (birth: string, today: string) => {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
};

for (const center of centers) {
  const label = center.shortName;
  const sections = seedHandbook(center.id);
  const ids = sections.map((s) => s.id);
  const text = sections.map((s) => s.body).join("\n");

  // Handbook structure
  check(new Set(ids).size === ids.length, `${label}: duplicate handbook section ids`);
  for (const id of REQUIRED_SECTIONS) check(ids.includes(id), `${label}: missing handbook section "${id}"`);
  for (const s of sections) check(Boolean(s.updatedAt && s.updatedBy), `${label}: section "${s.id}" has no updated line`);

  // Planted gaps must stay uncovered
  check(!/halloween|costume|disfraz/i.test(text), `${label}: handbook mentions Halloween or costumes`);
  check(!/\btwins?\b/i.test(text), `${label}: handbook mentions twins`);

  // Handbook and tables agree
  for (const room of center.rooms) {
    check(text.includes(`$${room.tuitionMonthly.toLocaleString("en-US")}`), `${label}: handbook lacks tuition $${room.tuitionMonthly} for ${room.name}`);
    check(center.staff.some((s) => s.id === room.leadTeacherId), `${label}: ${room.name} lead teacher missing`);
  }
  const f = center.fees;
  if (f.waitlistFee) check(text.includes(`$${f.waitlistFee}`), `${label}: handbook lacks waitlist fee`);
  if (f.registration) check(text.includes(`$${f.registration}`), `${label}: handbook lacks registration fee`);
  if (f.siblingDiscountPct) check(text.includes(`${f.siblingDiscountPct}%`), `${label}: handbook lacks sibling discount`);
  if (f.backupLunch) check(text.includes(`$${f.backupLunch}`), `${label}: handbook lacks backup lunch price`);
  if (f.latePickupPerMinute) check(text.includes(`$${f.latePickupPerMinute} per minute`), `${label}: handbook lacks late fee`);
  check(text.includes(`${center.illness.feverThresholdF}°F`), `${label}: handbook lacks fever threshold`);
  check(text.includes(center.phone), `${label}: handbook lacks phone number`);
  check(/555-01\d\d/.test(center.phone) && center.email.endsWith(".example"), `${label}: contact details must be obviously fictional`);

  // Calendar
  for (const c of center.closures) {
    check(weekdayOf(c.date) <= 5, `${label}: closure "${c.name}" starts on a weekend (${c.date})`);
    if (c.endDate) check(c.endDate >= c.date, `${label}: closure "${c.name}" ends before it starts`);
  }
  const vetClosed = Boolean(closedOn(center, "2026-11-11"));
  check(center.id === "quail-ridge" ? vetClosed : !vetClosed, `${label}: Veterans Day closure is wrong`);
  check(weekdayOf("2026-11-11") === 3, "Veterans Day 2026 should be a Wednesday");

  // Menus
  for (const [w, week] of center.menu.weeks.entries()) {
    check(week.length === 5, `${label}: menu week ${w + 1} needs 5 weekdays`);
    week.forEach((day, d) => {
      const items = [day.breakfast, day.lunch, day.amSnack, day.pmSnack, day.backupLunch?.main, day.backupLunch?.alternative].filter(Boolean);
      for (const item of items) check(!item!.allergens.some((a: Allergen) => a === "peanut" || a === "tree_nut"), `${label}: menu item "${item!.name}" has nuts`);
      if (center.meals === "provided") check(Boolean(day.breakfast && day.lunch && day.pmSnack), `${label}: week ${w + 1} day ${d + 1} missing a meal`);
      else {
        check(Boolean(day.amSnack && day.pmSnack && day.backupLunch), `${label}: week ${w + 1} day ${d + 1} missing snack or backup lunch`);
        const dairyFree = [day.backupLunch?.main, day.backupLunch?.alternative].some((i) => i && !i.allergens.includes("dairy"));
        check(dairyFree, `${label}: week ${w + 1} day ${d + 1} has no dairy-free backup lunch`);
      }
    });
  }
  check(weekdayOf(center.menu.cycleStart) === 1, `${label}: menu cycle must start on a Monday`);

  // Tours fall inside opening hours on weekdays
  for (const t of center.tours) {
    check(t.weekday >= 1 && t.weekday <= 5, `${label}: tour on a weekend`);
    const start = minutesOf(t.time);
    check(start >= minutesOf(center.hours.open) && start + center.tourMinutes <= minutesOf(center.hours.close), `${label}: tour at ${t.time} outside hours`);
  }
}

// Families
const today = zonedParts(now, "America/Denver").date;
for (const fam of families) {
  const center = centers.find((c) => c.id === fam.centerId)!;
  check(fam.authorizedPickup.some((p) => p.name === fam.parentName), `${fam.parentName}: parent not on own pickup list`);
  for (const child of fam.children) {
    const room = center.rooms.find((r) => r.id === child.roomId);
    check(Boolean(room), `${child.firstName}: room ${child.roomId} not at ${center.shortName}`);
    const months = monthsOld(child.birthDate, today);
    const expected: Record<string, [number, number]> = { infant: [0, 12], toddler: [12, 30], twos: [24, 36], preschool: [30, 54], prek: [48, 66] };
    const [lo, hi] = expected[room!.program];
    check(months >= lo && months <= hi, `${child.firstName} is ${months} months old, outside the ${room!.name} range`);
  }
  const balance = fam.billing.ledger.reduce((s, l) => s + l.amount, 0);
  check(balance === 0, `${fam.parentName}: ledger balance is ${balance}, expected 0`);
}

// Planted scenario facts
const wei = families.find((f) => f.id === "chen")!;
check(!wei.authorizedPickup.some((p) => /grand/i.test(p.relation)), "Chen family must not list a grandparent, for the pickup scenario");
const ana = families.find((f) => f.id === "martinez")!;
check(ana.children.length === 2, "Martínez family needs two children");

// History summary
console.log("\nContent summary\n");
for (const center of centers) {
  const { logs, handoffs } = generateHistory(center, now);
  check(logs.every((l) => new Date(l.askedAt) <= now), `${center.shortName}: history has future questions`);
  const by = <K extends string>(f: (l: (typeof logs)[number]) => K) =>
    logs.reduce<Record<string, number>>((acc, l) => ((acc[f(l)] = (acc[f(l)] ?? 0) + 1), acc), {});
  const pct = (n: number) => `${Math.round((n / logs.length) * 100)}%`;
  const outcomes = by((l) => l.outcome);
  const topics = Object.entries(by((l) => l.topic)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const noAi = logs.filter((l) => l.tokens === 0).length;
  const handbookCalls = logs.filter((l) => l.lanes.includes("handbook")).length;
  const tokens = logs.reduce((s, l) => s + l.tokens, 0);
  const allHandbook = logs.length * 14500;
  console.log(`${center.name} (${center.city}, ${center.timeZone})`);
  console.log(`  handbook sections: ${seedHandbook(center.id).length}, closures: ${center.closures.length}, events: ${center.events.length}`);
  console.log(`  questions in last 8 weeks: ${logs.length}, after hours: ${pct(logs.filter((l) => l.afterHours).length)}`);
  console.log(`  answered: ${pct(outcomes.answered ?? 0)}, handed off: ${pct(outcomes.handoff ?? 0)}, declined: ${pct(outcomes.declined ?? 0)}`);
  console.log(`  no AI used: ${pct(noAi)}, read the handbook: ${pct(handbookCalls)}, tokens saved vs. always reading the handbook: ${Math.round((1 - tokens / allHandbook) * 100)}%`);
  console.log(`  languages: ${JSON.stringify(by((l) => l.language))}`);
  console.log(`  top topics: ${topics.map(([t, n]) => `${t} ${n}`).join(", ")}`);
  console.log(`  handoffs: ${handoffs.length} (${handoffs.filter((h) => h.status === "open").length} open)\n`);
}

if (failures.length) {
  console.error(`${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("All content checks passed.");
