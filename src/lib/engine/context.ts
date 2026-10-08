import type { Center, Family, HandbookSection, SavedAnswer, TableId } from "@/content";
import { addDays } from "../time";
import { formatDate, formatTime, hoursLine, upcomingClosures } from "../facts/calendar";
import { ALLERGEN_LABEL, menuFor } from "../facts/menu";
import { ageInMonths } from "../facts/illness";
import { usd } from "../facts/money";
import type { Source } from "./types";

const TABLE_LABEL: Record<TableId, string> = {
  calendar: "Calendar",
  menu: "Menu",
  tuition: "Tuition and fees",
  tours: "Tour times",
  hours: "Hours",
};

export const tableSource = (center: Center, table: TableId): Source => ({
  id: `table:${table}`,
  label: TABLE_LABEL[table],
  ...center.tableUpdates[table],
});

export const handbookSource = (section: HandbookSection): Source => ({
  id: `handbook:${section.id}`,
  label: section.title,
  updatedAt: section.updatedAt,
  updatedBy: section.updatedBy,
  excerpt: section.body.length > 600 ? `${section.body.slice(0, 600)}…` : section.body,
});

export const savedSource = (saved: SavedAnswer): Source => ({
  id: `saved:${saved.id}`,
  label: "Saved answer",
  updatedAt: saved.savedAt.slice(0, 10),
  updatedBy: saved.savedBy,
  excerpt: saved.answer,
});

export function ageLabel(birthDate: string, today: string) {
  const months = ageInMonths(birthDate, today);
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
}

/** The family's own profile, for prompts. Other families are never included. */
export function renderFamily(center: Center, family: Family | undefined, today: string): string {
  if (!family) return "The person asking is a visitor, not an enrolled family. No child or account details are available.";
  const kids = family.children.map((c) => {
    const room = center.rooms.find((r) => r.id === c.roomId);
    const teacher = center.staff.find((s) => s.id === room?.leadTeacherId);
    const allergies = c.allergies.length ? c.allergies.map((a) => ALLERGEN_LABEL[a]).join(", ") : "none";
    return `- ${c.firstName} (child id "${c.id}"), ${ageLabel(c.birthDate, today)} old, ${room?.name} room, lead teacher ${teacher?.name}. Allergies: ${allergies}.`;
  });
  return [
    `Parent: ${family.parentName}. Preferred language: ${family.preferredLanguage}.`,
    `Children:`,
    ...kids,
    `Authorized pickup list: ${family.authorizedPickup.map((p) => `${p.name} (${p.relation})`).join(", ")}.`,
    `Billing plan: ${family.billing.plan}.`,
  ].join("\n");
}

/** The center's data tables as text, with dates already spelled out. */
export function renderTables(center: Center, today: string): string {
  const lines: string[] = [];
  lines.push(`[table:hours] Hours: ${hoursLine(center)}. Phone ${center.phone}. Address ${center.address}.`);

  lines.push(`[table:calendar] Closures from today:`);
  for (const c of upcomingClosures(center, today, 12)) {
    lines.push(`- Closed ${formatDate(c.date)}${c.endDate ? ` through ${formatDate(c.endDate)}` : ""} (${c.date}): ${c.name}`);
  }
  lines.push(`Events and open days of note:`);
  for (const e of center.events.filter((e) => (e.endDate ?? e.date) >= today)) {
    lines.push(`- ${formatDate(e.date)}${e.endDate ? ` through ${formatDate(e.endDate)}` : ""} (${e.date}): ${e.name}. ${e.note}`);
  }

  lines.push(`[table:tuition] Rooms, monthly tuition and waitlists:`);
  for (const r of center.rooms) {
    const part = r.partTimeMonthly ? `, part time ${usd(r.partTimeMonthly)} (${r.partTimeSchedule})` : "";
    lines.push(`- ${r.name}: ${r.ages}, ratio ${r.ratio}, full time ${usd(r.tuitionMonthly)}${part}, waitlist ${r.waitlist}`);
  }
  const f = center.fees;
  const fees = [
    f.registration != null && `registration ${usd(f.registration)} (${f.registrationNote})`,
    f.waitlistFee != null && `waitlist fee ${usd(f.waitlistFee)}, non-refundable`,
    f.siblingDiscountPct != null && `sibling discount ${f.siblingDiscountPct}% off the older sibling's tuition`,
    f.latePickupPerMinute != null && `late pickup ${usd(f.latePickupPerMinute)} per minute after closing`,
    f.backupLunch != null && `backup lunch ${usd(f.backupLunch)}`,
  ].filter(Boolean);
  lines.push(`Fees: ${fees.length ? fees.join("; ") : "no additional fees"}.`);
  lines.push(`Assistance: ${center.assistance.name}. ${center.assistance.summary}`);

  lines.push(`[table:menu] Menu for the next week:`);
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const day = menuFor(center, date);
    if (!day) continue;
    const parts = [
      day.breakfast && `breakfast ${day.breakfast.name}`,
      day.amSnack && `morning snack ${day.amSnack.name}`,
      day.lunch && `lunch ${day.lunch.name}`,
      day.backupLunch && `backup lunch ${day.backupLunch.main.name} or ${day.backupLunch.alternative.name}`,
      day.pmSnack && `afternoon snack ${day.pmSnack.name}`,
    ].filter(Boolean);
    lines.push(`- ${formatDate(date)}: ${parts.join("; ")}`);
  }
  lines.push(`${center.menu.infantNote}`);

  lines.push(`[table:tours] Tours: ${center.tours.map((t) => `${["", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays"][t.weekday]} at ${formatTime(t.time)}`).join(", ")}, about ${center.tourMinutes} minutes.`);
  return lines.join("\n");
}

export function renderHandbook(sections: HandbookSection[]): string {
  return sections
    .map((s) => `[handbook:${s.id}] ${s.title} (updated ${s.updatedAt} by ${s.updatedBy})\n${s.body}`)
    .join("\n\n");
}

export function renderSaved(saved: SavedAnswer[]): string {
  return saved.length
    ? saved.map((s) => `[saved:${s.id}] Q: ${s.question}\nA: ${s.answer}`).join("\n\n")
    : "(none)";
}

/** The next two weeks with weekdays, so the model can resolve "Friday" or "tomorrow". */
export function renderDays(today: string): string {
  return Array.from({ length: 15 }, (_, i) => {
    const d = addDays(today, i);
    return `${d} = ${formatDate(d)}${i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : ""}`;
  }).join("\n");
}

/** Each table block as its own text, keyed by source id, for the double-check. */
export function tableBlocks(center: Center, today: string): Map<string, string> {
  const blocks = new Map<string, string>();
  let current = "";
  for (const line of renderTables(center, today).split("\n")) {
    const m = line.match(/^\[(table:[a-z]+)\]/);
    if (m) current = m[1];
    if (current) blocks.set(current, `${blocks.get(current) ?? ""}${line}\n`);
  }
  return blocks;
}

export function familyLedgerText(family: Family | undefined): string {
  if (!family) return "";
  return family.billing.ledger.map((l) => `${l.date}: ${l.description}, ${l.amount}`).join("\n");
}
