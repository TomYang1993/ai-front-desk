import "server-only";
import { createHash } from "node:crypto";
import type { Allergen, CenterId, Lang } from "@/content";
import { getCached, getCenter, getFamily, setCached } from "./data";
import { openStatus, upcomingClosures } from "./facts/calendar";
import { ageInMonths } from "./facts/illness";
import { menuFor } from "./facts/menu";
import { usd } from "./facts/money";
import { formatClock, formatDay } from "./format";
import { STRINGS } from "./i18n";
import { translateList } from "./engine/translate";
import { addDays, zonedParts } from "./time";
import type { ChipId } from "./engine/types";

/** Staff-written text shown to a family, with the original kept when Maple translated it. */
export interface Translatable {
  text: string;
  original: string | null;
}

/**
 * Everything the parent app needs on first load, computed in the center's
 * time zone and written in the family's language. Fixed wording comes from
 * the interface strings; text staff wrote (dishes, closures, notices) is
 * translated by the AI once and cached, falling back to English.
 */
export interface ParentView {
  center: {
    id: CenterId;
    name: string;
    shortName: string;
    city: string;
    state: string;
    timeZone: string;
    phone: string;
    email: string;
    hoursLine: string;
    directorName: string;
  };
  family: {
    id: string;
    parentName: string;
    parentFirstName: string;
    language: Lang;
    children: { id: string; firstName: string; roomName: string; teacherName: string; age: string; allergies: Allergen[] }[];
  };
  board: {
    dateLabel: string;
    open: boolean;
    statusLine: string;
    menu: { lines: string[]; translated: boolean } | null;
    nextClosure: Translatable | null;
    announcements: { id: string; title: Translatable; body: Translatable; postedBy: string }[];
  };
  /** Dish names in the family's language, keyed by the English name, for lunch actions. */
  dishes: Record<string, string>;
  chips: ChipId[];
}

const TRANSLATE_TIMEOUT_MS = 6000;

/** Translations of center content for one language, cached for a week. */
async function translations(texts: string[], lang: Lang): Promise<Map<string, string>> {
  const unique = [...new Set(texts.filter(Boolean))];
  const map = new Map<string, string>();
  if (lang === "en" || !unique.length) return map;
  const key = `translate:v2:${lang}:${createHash("sha1").update(JSON.stringify(unique)).digest("hex")}`;
  const cached = await getCached<Record<string, string>>(key);
  if (cached) return new Map(Object.entries(cached));
  // Never hold the page for long; English is a fine answer while the AI is slow.
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TRANSLATE_TIMEOUT_MS));
  const result = await Promise.race([translateList(unique, lang), timeout]);
  if (!result) return map;
  unique.forEach((text, i) => result.translated[i] && map.set(text, result.texts[i]));
  if (result.translated.every(Boolean)) await setCached(key, Object.fromEntries(map), 7 * 24 * 3600);
  return map;
}

export async function getParentView(centerId: CenterId, familyId: string, now = new Date()): Promise<ParentView | null> {
  const center = await getCenter(centerId);
  const family = await getFamily(centerId, familyId);
  if (!family) return null;
  const lang = family.preferredLanguage;
  const s = STRINGS[lang].board;
  const today = zonedParts(now, center.timeZone).date;
  const status = openStatus(center, now);
  const clock = (time: string) => formatClock(time, lang);

  const dayWord = (date: string) =>
    date === today ? s.todayWord : date === addDays(today, 1) ? s.tomorrowWord : `${lang === "es" ? "el " : ""}${formatDay(date, lang)}`;
  const statusLine = status.openNow ? s.openUntil(clock(center.hours.close)) : s.closedOpens(dayWord(status.nextOpen.date), clock(status.nextOpen.time));
  const days = center.hours.days === "Monday to Friday" ? s.weekdays : center.hours.days;

  const day = status.today.open ? menuFor(center, today) : null;
  const closure = upcomingClosures(center, today, 1)[0];
  const notices = center.announcements.filter((a) => a.showFrom <= today && today <= a.showUntil);

  const dishNames = [day?.breakfast, day?.lunch, day?.amSnack, day?.pmSnack, day?.backupLunch?.main, day?.backupLunch?.alternative]
    .map((d) => d?.name)
    .filter((n): n is string => Boolean(n));
  const tr = await translations([...dishNames, closure?.name ?? "", ...notices.flatMap((a) => [a.title, a.body])], lang);
  const t = (text: string): Translatable => ({ text: tr.get(text) ?? text, original: tr.has(text) ? text : null });
  const dish = (name: string) => tr.get(name) ?? name;

  let menu: ParentView["board"]["menu"] = null;
  const menuTranslated = dishNames.some((n) => tr.has(n));
  if (day && center.meals === "provided") {
    menu = {
      lines: [`${s.breakfast}: ${dish(day.breakfast!.name)}`, `${s.lunchLabel}: ${dish(day.lunch!.name)}`, `${s.snack}: ${dish(day.pmSnack!.name)}`],
      translated: menuTranslated,
    };
  } else if (day?.backupLunch) {
    const alt = dish(day.backupLunch.alternative.name);
    menu = {
      lines: [
        `${s.morningSnack}: ${dish(day.amSnack!.name)}`,
        `${s.afternoonSnack}: ${dish(day.pmSnack!.name)}`,
        `${s.backupLunch(usd(center.fees.backupLunch!))}: ${dish(day.backupLunch.main.name)}, ${s.or} ${lang === "en" ? alt.charAt(0).toLowerCase() + alt.slice(1) : alt}`,
      ],
      translated: menuTranslated,
    };
  }

  let nextClosure: Translatable | null = null;
  if (closure) {
    const name = t(closure.name);
    const when = closure.endDate ? s.closureRange(formatDay(closure.date, lang), formatDay(closure.endDate, lang)) : formatDay(closure.date, lang);
    nextClosure = { text: `${name.text}: ${when}`, original: name.original ? `${closure.name}: ${when}` : null };
  }

  const director = center.staff.find((x) => x.role === "director")!;
  return {
    center: {
      id: center.id,
      name: center.name,
      shortName: center.shortName,
      city: center.city,
      state: center.state,
      timeZone: center.timeZone,
      phone: center.phone,
      email: center.email,
      hoursLine: s.hours(days, clock(center.hours.open), clock(center.hours.close)),
      directorName: director.name,
    },
    family: {
      id: family.id,
      parentName: family.parentName,
      parentFirstName: family.parentFirstName,
      language: lang,
      children: family.children.map((c) => {
        const room = center.rooms.find((r) => r.id === c.roomId)!;
        const months = ageInMonths(c.birthDate, today);
        return {
          id: c.id,
          firstName: c.firstName,
          roomName: room.name,
          teacherName: center.staff.find((x) => x.id === room.leadTeacherId)?.name ?? "",
          age: months < 24 ? s.months(months) : s.years(Math.floor(months / 12)),
          allergies: c.allergies,
        };
      }),
    },
    board: {
      dateLabel: formatDay(today, lang),
      open: status.today.open,
      statusLine,
      menu,
      nextClosure,
      announcements: notices.map((a) => ({ id: a.id, title: t(a.title), body: t(a.body), postedBy: a.postedBy })),
    },
    dishes: Object.fromEntries(dishNames.filter((n) => tr.has(n)).map((n) => [n, tr.get(n)!])),
    chips: ["today_lunch", "next_closure", "hours"],
  };
}
