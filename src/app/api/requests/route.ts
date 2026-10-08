import { connection } from "next/server";
import type { CenterId } from "@/content";
import { resolveParent } from "@/lib/session";
import { CENTER_IDS, getAbsences, getCenter, getFamily, getHandoffs, getLunchOrders, getTourBookings, type TourBookingRecord } from "@/lib/data";

/**
 * A family's open and recent requests, for the notice board: handoffs and
 * staff replies, logged absences, lunch orders and tour bookings. The
 * family comes from the session. Visitors, available only to test scripts
 * for now, pass the ids of their own handoffs and tours.
 */
export async function GET(request: Request) {
  await connection();
  const params = new URL(request.url).searchParams;
  const requested = params.get("centerId") as CenterId | null;
  if (requested && !CENTER_IDS.includes(requested)) return Response.json({ error: "Unknown center" }, { status: 400 });
  const asker = await resolveParent({ centerId: requested ?? undefined, familyId: params.get("familyId") });
  if (!asker) return Response.json({ error: "Sign in as a parent" }, { status: 401 });
  const { centerId, familyId } = asker;
  const ids = new Set((params.get("ids") ?? "").split(",").filter(Boolean));
  const mine = (record: { id: string; familyId: string | null }) => (familyId ? record.familyId === familyId : ids.has(record.id));

  const [center, family, handoffs, absences, lunches, tours] = await Promise.all([
    getCenter(centerId),
    familyId ? getFamily(centerId, familyId) : Promise.resolve(undefined),
    getHandoffs(centerId),
    getAbsences(centerId),
    getLunchOrders(centerId),
    getTourBookings(centerId) as Promise<TourBookingRecord[]>,
  ]);
  const staffName = (to: "director" | "teacher", childId?: string) => {
    const roomId = family?.children.find((c) => c.id === childId)?.roomId;
    const teacher = to === "teacher" && roomId ? center.staff.find((s) => s.roomId === roomId) : undefined;
    return (teacher ?? center.staff.find((s) => s.role === "director"))?.name;
  };
  return Response.json({
    handoffs: handoffs
      .filter(mine)
      .map((h) => ({ id: h.id, createdAt: h.createdAt, text: h.text, status: h.status, to: h.to, staffName: staffName(h.to, h.childId), reply: h.reply ?? null }))
      .reverse(),
    absences: absences.filter((a) => a.familyId === familyId).reverse(),
    lunches: lunches.filter((l) => l.familyId === familyId).reverse(),
    tours: tours.filter((t) => (familyId ? t.familyId === familyId : ids.has(t.id))).reverse(),
  });
}
