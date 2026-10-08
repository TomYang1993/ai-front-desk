import type { Lang } from "@/content/types";

const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-US", zh: "zh-CN" };

/** "Tuesday, October 13" for a YYYY-MM-DD calendar date. */
export const formatDay = (date: string, lang: Lang) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** "Tuesday, October 13 at 4:00 PM" for a tour slot. */
export const formatSlot = (date: string, time: string, lang: Lang) => {
  const t = new Date(`${date}T${time}:00Z`).toLocaleTimeString(LOCALE[lang], { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return `${formatDay(date, lang)}, ${t}`;
};

/** "Sep 2" for an update date. */
export const shortDate = (date: string, lang: Lang) =>
  new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { month: "short", day: "numeric", timeZone: "UTC" });

export const listDays = (dates: string[], lang: Lang) => dates.map((d) => formatDay(d, lang)).join(lang === "zh" ? "、" : "; ");

/** "7:00 am" in English, the locale's own form otherwise, for an HH:MM time. */
export const formatClock = (time: string, lang: Lang) => {
  if (lang === "en") {
    const [h, m] = time.split(":").map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
  }
  return new Date(`2000-01-01T${time}:00Z`).toLocaleTimeString(LOCALE[lang], { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
};
