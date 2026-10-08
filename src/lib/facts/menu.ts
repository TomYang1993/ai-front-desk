import type { Allergen, Center, Child, MenuDay, MenuItem } from "../../content/types";
import { daysBetween, weekdayOf } from "../time";

/** Pack-lunch centers take backup lunch orders until this local time. */
export const BACKUP_LUNCH_CUTOFF = "10:30";

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  dairy: "dairy",
  egg: "egg",
  wheat: "wheat",
  soy: "soy",
  peanut: "peanuts",
  tree_nut: "tree nuts",
  fish: "fish",
  shellfish: "shellfish",
  sesame: "sesame",
};

/** The menu for a date, or null on weekends. */
export function menuFor(center: Center, date: string): MenuDay | null {
  const weekday = weekdayOf(date);
  if (weekday > 5) return null;
  const weeks = center.menu.weeks;
  const weekIndex = Math.floor(daysBetween(center.menu.cycleStart, date) / 7);
  const week = weeks[((weekIndex % weeks.length) + weeks.length) % weeks.length];
  return week[weekday - 1] ?? null;
}

export const conflicts = (item: MenuItem, child: Child): Allergen[] =>
  item.allergens.filter((a) => child.allergies.includes(a));

/** Plain-language allergy note for one child and one item. */
export function allergyNote(item: MenuItem, child: Child, subject = "It"): string | null {
  if (!child.allergies.length) return null;
  const hits = conflicts(item, child);
  if (!hits.length) {
    return `${subject} has no ${child.allergies.map((a) => ALLERGEN_LABEL[a]).join(" or ")}, so it's safe for ${child.firstName}.`;
  }
  return `${subject} contains ${hits.map((a) => ALLERGEN_LABEL[a]).join(" and ")}, which ${child.firstName} is allergic to.`;
}

/** For pack-lunch centers: the backup lunch option that is safe for a child. */
export function safeBackupLunch(day: MenuDay, child: Child | undefined) {
  if (!day.backupLunch) return null;
  const { main, alternative } = day.backupLunch;
  if (!child || conflicts(main, child).length === 0) return { item: main, avoided: null as MenuItem | null };
  if (conflicts(alternative, child).length === 0) return { item: alternative, avoided: main };
  return { item: null, avoided: main };
}
