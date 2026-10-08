import "server-only";
import { centers, families, seedHandbook } from "@/content";
import { generateHistory, HISTORY_VERSION } from "@/content/history";
import type { Center, CenterId, Family, HandbookSection, Handoff, QuestionLog, SavedAnswer } from "@/content";
import { getStore } from "./store";

/**
 * Data access for the demo. Everything lives in the shared store so the
 * parent app and control center see the same state. The store seeds
 * itself on first use and can be reset from the control center.
 */

// A fingerprint of the seed content. When the content in code changes,
// stores holding older seed data reseed themselves automatically.
const SEED_VERSION = (() => {
  const text = JSON.stringify([HISTORY_VERSION, centers, families, centers.map((c) => seedHandbook(c.id))]);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `v2-${(h >>> 0).toString(36)}`;
})();

const keys = {
  version: "seed:version",
  seededAt: "seed:at",
  center: (id: CenterId) => `center:${id}`,
  handbook: (id: CenterId) => `handbook:${id}`,
  families: (id: CenterId) => `families:${id}`,
  logs: (id: CenterId) => `logs:${id}`,
  handoffs: (id: CenterId) => `handoffs:${id}`,
  tours: (id: CenterId) => `tours:${id}`,
  absences: (id: CenterId) => `absences:${id}`,
  lunches: (id: CenterId) => `lunches:${id}`,
  feedback: (id: CenterId) => `feedback:${id}`,
  cache: (key: string) => `cache:${key}`,
  handled: (id: CenterId) => `feedback-handled:${id}`,
};

export const CENTER_IDS: CenterId[] = centers.map((c) => c.id);

export async function resetDemo(now = new Date()) {
  const store = getStore();
  for (const center of centers) {
    const { logs, handoffs } = generateHistory(center, now);
    await store.set(keys.center(center.id), center);
    await store.set(keys.handbook(center.id), seedHandbook(center.id));
    await store.set(
      keys.families(center.id),
      families.filter((f) => f.centerId === center.id),
    );
    await store.del(keys.logs(center.id));
    await store.pushMany(keys.logs(center.id), logs);
    await store.set(keys.handoffs(center.id), handoffs);
  }
  for (const center of centers) {
    for (const key of [keys.tours, keys.absences, keys.lunches, keys.feedback, keys.handled]) await store.del(key(center.id));
  }
  await store.set(keys.seededAt, now.toISOString());
  await store.set(keys.version, SEED_VERSION);
}

let seeding: Promise<void> | null = null;
async function ensureSeeded() {
  const store = getStore();
  if ((await store.get<string>(keys.version)) === SEED_VERSION) return;
  seeding ??= resetDemo().finally(() => {
    seeding = null;
  });
  await seeding;
}

export async function getCenter(id: CenterId): Promise<Center> {
  await ensureSeeded();
  const center = await getStore().get<Center>(keys.center(id));
  if (!center) throw new Error(`Unknown center ${id}`);
  return center;
}

export async function saveCenter(center: Center) {
  await getStore().set(keys.center(center.id), center);
}

export async function getHandbook(id: CenterId): Promise<HandbookSection[]> {
  await ensureSeeded();
  return (await getStore().get<HandbookSection[]>(keys.handbook(id))) ?? [];
}

export async function saveHandbook(id: CenterId, sections: HandbookSection[]) {
  await getStore().set(keys.handbook(id), sections);
}

export async function getFamilies(id: CenterId): Promise<Family[]> {
  await ensureSeeded();
  return (await getStore().get<Family[]>(keys.families(id))) ?? [];
}

export async function getFamily(centerId: CenterId, familyId: string): Promise<Family | undefined> {
  return (await getFamilies(centerId)).find((f) => f.id === familyId);
}

export async function getLogs(id: CenterId): Promise<QuestionLog[]> {
  await ensureSeeded();
  return getStore().range<QuestionLog>(keys.logs(id));
}

export async function appendLog(log: QuestionLog) {
  await getStore().push(keys.logs(log.centerId), log);
}

export async function getHandoffs(id: CenterId): Promise<Handoff[]> {
  await ensureSeeded();
  return (await getStore().get<Handoff[]>(keys.handoffs(id))) ?? [];
}

export async function saveHandoffs(id: CenterId, handoffs: Handoff[]) {
  await getStore().set(keys.handoffs(id), handoffs);
}

export async function getSeededAt(): Promise<string | null> {
  await ensureSeeded();
  return getStore().get<string>(keys.seededAt);
}

export async function addHandoff(handoff: Handoff) {
  const all = await getHandoffs(handoff.centerId);
  await saveHandoffs(handoff.centerId, [...all, handoff]);
}

/** Changes one handoff in place. Returns the updated handoff, or null if it doesn't exist. */
export async function updateHandoff(centerId: CenterId, id: string, change: (h: Handoff) => Handoff): Promise<Handoff | null> {
  const all = await getHandoffs(centerId);
  const index = all.findIndex((h) => h.id === id);
  if (index < 0) return null;
  const updated = change(all[index]);
  all[index] = updated;
  await saveHandoffs(centerId, all);
  return updated;
}

/* Knowledge edits from the control center. Each bumps the center's revision, so cached answers start fresh. */

export async function saveSavedAnswers(centerId: CenterId, savedAnswers: SavedAnswer[]) {
  const center = await getCenter(centerId);
  await saveCenter({ ...center, savedAnswers, revision: (center.revision ?? 0) + 1 });
}

export async function updateHandbookSection(centerId: CenterId, id: string, change: { title: string; body: string; updatedBy: string; updatedAt: string }) {
  const sections = await getHandbook(centerId);
  const index = sections.findIndex((s) => s.id === id);
  if (index < 0) return null;
  sections[index] = { ...sections[index], ...change };
  await saveHandbook(centerId, sections);
  const center = await getCenter(centerId);
  await saveCenter({ ...center, revision: (center.revision ?? 0) + 1 });
  return sections[index];
}

export interface TourBooking {
  slotId: string;
  name: string;
  bookedAt: string;
}

export async function getTourBookings(id: CenterId): Promise<TourBooking[]> {
  return (await getStore().get<TourBooking[]>(keys.tours(id))) ?? [];
}

export async function saveTourBookings(id: CenterId, bookings: TourBooking[]) {
  await getStore().set(keys.tours(id), bookings);
}

/** Day-scoped reply cache: identical questions on the same day reuse the answer. */
export async function getCached<T>(key: string): Promise<T | null> {
  return getStore().get<T>(keys.cache(key));
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 12 * 3600) {
  await getStore().set(keys.cache(key), value, ttlSeconds);
}

export async function saveFamilies(id: CenterId, list: Family[]) {
  await getStore().set(keys.families(id), list);
}

/* Things parents do from the chat. Each list holds every family's records for one center. */

export interface AbsenceRecord {
  id: string;
  familyId: string;
  childId: string;
  childName: string;
  dates: string[];
  reason: string;
  createdAt: string;
}

export interface LunchOrder {
  id: string;
  familyId: string;
  childId: string;
  childName: string;
  item: string;
  price: number;
  date: string;
  createdAt: string;
}

export interface TourBookingRecord extends TourBooking {
  id: string;
  familyId: string | null;
}

async function readList<T>(key: string): Promise<T[]> {
  await ensureSeeded();
  return (await getStore().get<T[]>(key)) ?? [];
}

export const getAbsences = (id: CenterId) => readList<AbsenceRecord>(keys.absences(id));
export const getLunchOrders = (id: CenterId) => readList<LunchOrder>(keys.lunches(id));

export async function addAbsence(centerId: CenterId, record: AbsenceRecord) {
  await getStore().set(keys.absences(centerId), [...(await getAbsences(centerId)), record]);
}

/** Records the order and adds the charge to the family's account. */
export async function addLunchOrder(centerId: CenterId, order: LunchOrder) {
  await getStore().set(keys.lunches(centerId), [...(await getLunchOrders(centerId)), order]);
  const list = await getFamilies(centerId);
  const updated = list.map((f) =>
    f.id === order.familyId
      ? {
          ...f,
          billing: {
            ...f.billing,
            ledger: [...f.billing.ledger, { date: order.date, description: `Backup lunch: ${order.item.toLowerCase()}`, amount: order.price }],
          },
        }
      : f,
  );
  await saveFamilies(centerId, updated);
}

export async function addTourBooking(centerId: CenterId, booking: TourBookingRecord) {
  const existing = (await getTourBookings(centerId)) as TourBookingRecord[];
  if (existing.some((b) => b.slotId === booking.slotId)) return false;
  await saveTourBookings(centerId, [...existing, booking]);
  return true;
}

/** Thumbs up or down on a reply, keyed by its log id. */
export async function setFeedback(centerId: CenterId, logId: string, value: "up" | "down") {
  const all = (await getStore().get<Record<string, "up" | "down">>(keys.feedback(centerId))) ?? {};
  all[logId] = value;
  await getStore().set(keys.feedback(centerId), all);
}

/** Unhelpful answers a director has dealt with, keyed by log id. */
export interface HandledFeedback {
  by: string;
  at: string;
  how: "source" | "answer" | "reviewed";
}

export async function getHandledFeedback(centerId: CenterId) {
  return (await getStore().get<Record<string, HandledFeedback>>(keys.handled(centerId))) ?? {};
}

export async function markFeedbackHandled(centerId: CenterId, logId: string, handled: HandledFeedback) {
  const all = await getHandledFeedback(centerId);
  all[logId] = handled;
  await getStore().set(keys.handled(centerId), all);
}

export async function getFeedback(centerId: CenterId) {
  return (await getStore().get<Record<string, "up" | "down">>(keys.feedback(centerId))) ?? {};
}
