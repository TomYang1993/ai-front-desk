import type { CalendarEvent, Center, Closure } from "../../content/types";
import { addDays, inRange, minutesOf, weekdayOf, zonedParts, zonedToUtc } from "../time";

export interface DayStatus {
  date: string;
  weekday: number;
  open: boolean;
  reason: "open" | "weekend" | "closure";
  closure?: Closure;
  events: CalendarEvent[];
}

export const closureOn = (center: Center, date: string) =>
  center.closures.find((c) => inRange(date, c.date, c.endDate));

export const eventsOn = (center: Center, date: string) =>
  center.events.filter((e) => inRange(date, e.date, e.endDate));

export function dayStatus(center: Center, date: string): DayStatus {
  const weekday = weekdayOf(date);
  const closure = closureOn(center, date);
  const events = eventsOn(center, date);
  if (weekday >= 6) return { date, weekday, open: false, reason: "weekend", events };
  if (closure) return { date, weekday, open: false, reason: "closure", closure, events };
  return { date, weekday, open: true, reason: "open", events };
}

/** The first open day on or after a date. */
export function nextOpenDay(center: Center, from: string): string {
  let d = from;
  for (let i = 0; i < 30 && !dayStatus(center, d).open; i++) d = addDays(d, 1);
  return d;
}

export function upcomingClosures(center: Center, from: string, limit = 3): Closure[] {
  return center.closures
    .filter((c) => (c.endDate ?? c.date) >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export interface OpenNow {
  today: DayStatus;
  /** True when the center is open at this moment. */
  openNow: boolean;
  /** The next time the doors open, when not open now. */
  nextOpen: { date: string; time: string };
}

export function openStatus(center: Center, now: Date): OpenNow {
  const local = zonedParts(now, center.timeZone);
  const today = dayStatus(center, local.date);
  const minute = local.hour * 60 + local.minute;
  const openNow =
    today.open && minute >= minutesOf(center.hours.open) && minute < minutesOf(center.hours.close);
  const beforeOpenToday = today.open && minute < minutesOf(center.hours.open);
  const nextDate = beforeOpenToday || openNow ? local.date : nextOpenDay(center, addDays(local.date, 1));
  return { today, openNow, nextOpen: { date: nextDate, time: center.hours.open } };
}

/** When the office will next be answering messages, for handoff expectations. */
export function officeAvailability(center: Center, now: Date) {
  const local = zonedParts(now, center.timeZone);
  const minute = local.hour * 60 + local.minute;
  const start = minutesOf(center.officeHours.start);
  const end = minutesOf(center.officeHours.end);
  const todayOpen = dayStatus(center, local.date).open;
  if (todayOpen && minute >= start && minute < end) {
    return { inOfficeHours: true, next: now };
  }
  const date = todayOpen && minute < start ? local.date : nextOpenDay(center, addDays(local.date, 1));
  return { inOfficeHours: false, next: zonedToUtc(date, center.officeHours.start, center.timeZone) };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "Wednesday, November 11" */
export function formatDate(date: string, withWeekday = true): string {
  const [, m, d] = date.split("-").map(Number);
  const md = `${MONTHS[m - 1]} ${d}`;
  return withWeekday ? `${DAYS[weekdayOf(date) - 1]}, ${md}` : md;
}

export const weekdayName = (date: string) => DAYS[weekdayOf(date) - 1];

/** "7:00 am", "4:00 pm" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Describes a date relative to today: "today", "tomorrow", or the weekday and date. */
export function relativeDay(date: string, today: string): string {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  return formatDate(date);
}

/* Named days, so the language model can turn "Veterans Day" into a date. */

function nthWeekday(year: number, month: number, isoWeekday: number, n: number): string {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const offset = (isoWeekday - weekdayOf(first) + 7) % 7;
  return addDays(first, offset + (n - 1) * 7);
}

function lastWeekday(year: number, month: number, isoWeekday: number): string {
  const nextMonthFirst = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = addDays(nextMonthFirst, -1);
  const back = (weekdayOf(lastDay) - isoWeekday + 7) % 7;
  return addDays(lastDay, -back);
}

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** US holidays and common observances for the next year, plus the center's own named days. */
export function namedDays(center: Center, today: string): { name: string; date: string }[] {
  const year = Number(today.slice(0, 4));
  const days: { name: string; date: string }[] = [];
  for (const y of [year, year + 1]) {
    const thanksgiving = nthWeekday(y, 11, 4, 4);
    days.push(
      { name: "New Year's Day", date: ymd(y, 1, 1) },
      { name: "Martin Luther King Jr. Day", date: nthWeekday(y, 1, 1, 3) },
      { name: "Presidents Day", date: nthWeekday(y, 2, 1, 3) },
      { name: "Memorial Day", date: lastWeekday(y, 5, 1) },
      { name: "Juneteenth", date: ymd(y, 6, 19) },
      { name: "Independence Day (Fourth of July)", date: ymd(y, 7, 4) },
      { name: "Labor Day", date: nthWeekday(y, 9, 1, 1) },
      { name: "Indigenous Peoples' Day (Columbus Day)", date: nthWeekday(y, 10, 1, 2) },
      { name: "Halloween", date: ymd(y, 10, 31) },
      { name: "Día de los Muertos", date: ymd(y, 11, 2) },
      { name: "Veterans Day", date: ymd(y, 11, 11) },
      { name: "Thanksgiving", date: thanksgiving },
      { name: "Day after Thanksgiving (Native American Heritage Day)", date: addDays(thanksgiving, 1) },
      { name: "Christmas Eve", date: ymd(y, 12, 24) },
      { name: "Christmas Day", date: ymd(y, 12, 25) },
      { name: "New Year's Eve", date: ymd(y, 12, 31) },
    );
  }
  days.push({ name: "Lunar New Year", date: "2027-02-06" });
  for (const c of center.closures) days.push({ name: c.name, date: c.date });
  for (const e of center.events) days.push({ name: e.name, date: e.date });
  const horizon = addDays(today, 366);
  const seen = new Set<string>();
  return days
    .filter((d) => d.date >= today && d.date <= horizon)
    .filter((d) => (seen.has(d.name + d.date) ? false : (seen.add(d.name + d.date), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const hoursLine = (center: Center) =>
  `${center.hours.days}, ${formatTime(center.hours.open)} to ${formatTime(center.hours.close)}`;

export const toLocalDate = (now: Date, center: Center) => zonedParts(now, center.timeZone).date;
