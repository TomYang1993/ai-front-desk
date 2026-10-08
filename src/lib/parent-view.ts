import "server-only";
import type { CenterId, Lang } from "@/content";
import { getCenter, getFamily } from "./data";
import { formatDate, formatTime, hoursLine, openStatus, relativeDay, upcomingClosures } from "./facts/calendar";
import { ALLERGEN_LABEL, menuFor } from "./facts/menu";
import { usd } from "./facts/money";
import { ageLabel } from "./engine/context";
import { zonedParts } from "./time";
import type { ChipId } from "./engine/types";

/** Everything the parent app needs on first load, computed in the center's time zone. */
export interface ParentView {
  center: {
    id: CenterId;
    name: string;
    shortName: string;
    city: string;
    state: string;
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
    children: { id: string; firstName: string; roomName: string; teacherName: string; age: string; allergies: string[] }[];
  };
  board: {
    dateLabel: string;
    open: boolean;
    statusLine: string;
    menu: { title: string; lines: string[] } | null;
    nextClosure: string | null;
    announcements: { id: string; title: string; body: string; postedBy: string }[];
  };
  chips: ChipId[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function getParentView(centerId: CenterId, familyId: string, now = new Date()): Promise<ParentView | null> {
  const center = await getCenter(centerId);
  const family = await getFamily(centerId, familyId);
  if (!family) return null;
  const today = zonedParts(now, center.timeZone).date;
  const status = openStatus(center, now);

  const statusLine = status.openNow
    ? `Open now until ${formatTime(center.hours.close)}`
    : `Closed now. Opens ${relativeDay(status.nextOpen.date, today)} at ${formatTime(status.nextOpen.time)}`;

  const day = status.today.open ? menuFor(center, today) : null;
  let menu: ParentView["board"]["menu"] = null;
  if (day && center.meals === "provided") {
    menu = {
      title: "Today's meals",
      lines: [`Breakfast: ${day.breakfast!.name}`, `Lunch: ${day.lunch!.name}`, `Snack: ${day.pmSnack!.name}`],
    };
  } else if (day?.backupLunch) {
    menu = {
      title: "Today's snacks and backup lunch",
      lines: [
        `Morning snack: ${day.amSnack!.name}`,
        `Afternoon snack: ${day.pmSnack!.name}`,
        `Backup lunch, ${usd(center.fees.backupLunch!)}: ${day.backupLunch.main.name}, or ${day.backupLunch.alternative.name.charAt(0).toLowerCase()}${day.backupLunch.alternative.name.slice(1)}`,
      ],
    };
  }

  const closure = upcomingClosures(center, today, 1)[0];
  const nextClosure = closure
    ? `${closure.name}: ${formatDate(closure.date)}${closure.endDate ? ` through ${formatDate(closure.endDate)}` : ""}`
    : null;

  const announcements = center.announcements
    .filter((a) => a.showFrom <= today && today <= a.showUntil)
    .map((a) => ({ id: a.id, title: a.title, body: a.body, postedBy: a.postedBy }));

  const director = center.staff.find((s) => s.role === "director")!;
  return {
    center: {
      id: center.id,
      name: center.name,
      shortName: center.shortName,
      city: center.city,
      state: center.state,
      phone: center.phone,
      email: center.email,
      hoursLine: hoursLine(center),
      directorName: director.name,
    },
    family: {
      id: family.id,
      parentName: family.parentName,
      parentFirstName: family.parentFirstName,
      language: family.preferredLanguage,
      children: family.children.map((c) => {
        const room = center.rooms.find((r) => r.id === c.roomId)!;
        return {
          id: c.id,
          firstName: c.firstName,
          roomName: room.name,
          teacherName: center.staff.find((s) => s.id === room.leadTeacherId)?.name ?? "",
          age: ageLabel(c.birthDate, today),
          allergies: c.allergies.map((a) => cap(ALLERGEN_LABEL[a])),
        };
      }),
    },
    board: { dateLabel: formatDate(today), open: status.today.open, statusLine, menu, nextClosure, announcements },
    chips: ["today_lunch", "next_closure", "hours"],
  };
}
