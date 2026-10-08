import "server-only";
import { centers, families, seedHandbook } from "@/content";
import { generateHistory, HISTORY_VERSION } from "@/content/history";
import type { Center, CenterId, Family, HandbookSection, Handoff, QuestionLog } from "@/content";
import { getStore } from "./store";

/**
 * Data access for the demo. Everything lives in the shared store so the
 * parent app and operator console see the same state. The store seeds
 * itself on first use and can be reset from the console.
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
  cache: (key: string) => `cache:${key}`,
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
  for (const center of centers) await store.del(keys.tours(center.id));
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
