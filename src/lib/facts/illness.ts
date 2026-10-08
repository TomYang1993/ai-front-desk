import type { Center } from "../../content/types";
import { addDays, minutesOf } from "../time";
import { dayStatus, nextOpenDay } from "./calendar";

/**
 * Applies a center's illness rules to what a parent reported. Only the
 * well-defined rules are computed here: fevers, vomiting and diarrhea,
 * and antibiotics. Everything else goes to the handbook.
 */

export type SymptomKind = "fever" | "vomiting" | "diarrhea" | "antibiotics" | "other";

export interface SymptomReport {
  kind: SymptomKind;
  temperatureF?: number | null;
  /** When the symptom last happened, or the first antibiotic dose: local "YYYY-MM-DD HH:MM". */
  lastAt?: string | null;
  /** Times vomited, or loose stools, in the past 24 hours. */
  count24h?: number | null;
  /** Other signs of illness or a change in behavior. */
  otherSymptoms?: boolean | null;
}

export interface Attendance {
  date: string;
  time: string;
  /** True when the earliest return is partway through an open day. */
  midday: boolean;
}

export type IllnessDecision =
  | { status: "needs_info"; missing: ("temperature" | "time" | "count")[] }
  | { status: "can_attend"; rule: string }
  | { status: "stay_home"; rule: string; returnAfter: { date: string; time: string }; earliest: Attendance }
  | { status: "depends"; rule: string; ifStayHome: { date: string; time: string; earliest: Attendance } | null }
  | { status: "not_rule_based" };

function earliestAttendance(center: Center, date: string, time: string): Attendance {
  const day = dayStatus(center, date);
  const t = minutesOf(time);
  if (!day.open || t >= minutesOf(center.hours.close)) {
    return { date: nextOpenDay(center, addDays(date, 1)), time: center.hours.open, midday: false };
  }
  if (t <= minutesOf(center.hours.open)) return { date, time: center.hours.open, midday: false };
  return { date, time, midday: true };
}

function after(center: Center, lastAt: string, hours: number) {
  const [date, time] = lastAt.split(" ");
  const days = Math.floor(hours / 24);
  const returnAfter = { date: addDays(date, days), time };
  return { returnAfter, earliest: earliestAttendance(center, returnAfter.date, returnAfter.time) };
}

export function decideIllness(center: Center, report: SymptomReport, childAgeMonths: number): IllnessDecision {
  const rules = center.illness;

  if (report.kind === "fever") {
    const threshold =
      childAgeMonths < 2 && rules.youngInfantThresholdF ? rules.youngInfantThresholdF : rules.feverThresholdF;
    const missing: ("temperature" | "time")[] = [];
    if (report.temperatureF == null) missing.push("temperature");
    if (!report.lastAt && (report.temperatureF == null || report.temperatureF >= threshold)) missing.push("time");
    if (missing.length) return { status: "needs_info", missing };

    const rule = rules.feverRequiresOtherSymptoms
      ? `A fever of ${threshold}°F or higher together with other signs of illness means staying home until ${rules.feverFreeHoursToReturn} hours fever-free without fever-reducing medicine.`
      : `A fever of ${threshold}°F or higher in the past 24 hours means staying home until ${rules.feverFreeHoursToReturn} hours fever-free without fever-reducing medicine.`;

    if (report.temperatureF! < threshold) return { status: "can_attend", rule };
    const stay = after(center, report.lastAt!, rules.feverFreeHoursToReturn);
    if (rules.feverRequiresOtherSymptoms && report.otherSymptoms !== true) {
      return { status: "depends", rule, ifStayHome: { ...stay.returnAfter, earliest: stay.earliest } };
    }
    return { status: "stay_home", rule, ...stay };
  }

  if (report.kind === "vomiting" || report.kind === "diarrhea") {
    const hours = rules.vomitDiarrheaHoursToReturn;
    if (rules.feverRequiresOtherSymptoms) {
      // Washington-style rules depend on counts; vomiting is clear enough to compute.
      if (report.kind === "diarrhea") return { status: "not_rule_based" };
      if (report.count24h == null) return { status: "needs_info", missing: ["count"] };
      const rule = `Vomiting two or more times in 24 hours means staying home until ${hours} hours without symptoms.`;
      if (report.count24h < 2) return { status: "can_attend", rule };
      if (!report.lastAt) return { status: "needs_info", missing: ["time"] };
      return { status: "stay_home", rule, ...after(center, report.lastAt, hours) };
    }
    const rule = `Vomiting or diarrhea in the past 24 hours means staying home until ${hours} hours without symptoms.`;
    if (!report.lastAt) return { status: "needs_info", missing: ["time"] };
    return { status: "stay_home", rule, ...after(center, report.lastAt, hours) };
  }

  if (report.kind === "antibiotics" && rules.antibioticHoursToReturn) {
    if (!report.lastAt) return { status: "needs_info", missing: ["time"] };
    const rule = `Children on antibiotics can return after ${rules.antibioticHoursToReturn} hours of treatment.`;
    return { status: "stay_home", rule, ...after(center, report.lastAt, rules.antibioticHoursToReturn) };
  }

  return { status: "not_rule_based" };
}

export function ageInMonths(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
}
