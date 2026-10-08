import { connection } from "next/server";
import type { CenterId } from "@/content";
import { CENTER_IDS, getAbsences, getCenter, getFamily, getHandoffs, getLunchOrders, getTourBookings, type TourBookingRecord } from "@/lib/data";

/**
 * A family's open and recent requests, for the notice board: handoffs and
 * staff replies, logged absences, lunch orders and tour bookings. Visitors
 * have no account, so they pass the ids of their own handoffs and tours.
 */
export async function GET(request: Request) {
  await connection();
  const params = new URL(request.url).searchParams;
  const centerId = params.get("centerId") as CenterId;
  if (!CENTER_IDS.includes(centerId)) return Response.json({ error: "Unknown center" }, { status: 400 });
  const familyId = params.get("familyId");
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
