import type { Center } from "../../content/types";
import { addDays, minutesOf, weekdayOf, zonedParts } from "../time";
import { dayStatus } from "./calendar";

export interface TourSlot {
  date: string;
  time: string;
  /** Stable id, "YYYY-MM-DD HH:MM". */
  id: string;
}

/** Open tour times from now through a number of days, skipping closures and booked slots. */
export function upcomingTourSlots(center: Center, now: Date, days = 21, booked: string[] = []): TourSlot[] {
  const local = zonedParts(now, center.timeZone);
  const nowMinute = local.hour * 60 + local.minute;
  const slots: TourSlot[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(local.date, i);
    if (!dayStatus(center, date).open) continue;
    for (const rule of center.tours) {
      if (rule.weekday !== weekdayOf(date)) continue;
      // Same-day tours need at least two hours' notice.
      if (i === 0 && minutesOf(rule.time) - nowMinute < 120) continue;
      const id = `${date} ${rule.time}`;
      if (!booked.includes(id)) slots.push({ date, time: rule.time, id });
    }
  }
  return slots.sort((a, b) => a.id.localeCompare(b.id));
}
