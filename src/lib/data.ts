import "server-only";
import { centers, families, seedHandbook } from "@/content";
import { generateHistory } from "@/content/history";
import type { Center, CenterId, Family, HandbookSection, Handoff, QuestionLog } from "@/content";
import { getStore } from "./store";

/**
 * Data access for the demo. Everything lives in the shared store so the
 * parent app and operator console see the same state. The store seeds
 * itself on first use and can be reset from the console.
 */

// Bump when the seed content changes shape, so stale stores reseed.
const SEED_VERSION = "2026-10-07.1";

const keys = {
  version: "seed:version",
  seededAt: "seed:at",
  center: (id: CenterId) => `center:${id}`,
  handbook: (id: CenterId) => `handbook:${id}`,
  families: (id: CenterId) => `families:${id}`,
  logs: (id: CenterId) => `logs:${id}`,
  handoffs: (id: CenterId) => `handoffs:${id}`,
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
