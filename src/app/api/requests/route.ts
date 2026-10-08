import { connection } from "next/server";
import type { CenterId } from "@/content";
import { resolveParent } from "@/lib/session";
import { CENTER_IDS, getAbsences, getCenter, getFamily, getHandoffs, getLunchOrders, getTourBookings, type TourBookingRecord } from "@/lib/data";

/**
 * A family's open and recent requests, for the notice board: handoffs and
 * staff replies, logged absences, lunch orders and tour bookings. The
 * family comes from the session.
 */
export async function GET(request: Request) {
  await connection();
  const params = new URL(request.url).searchParams;
  const requested = params.get("centerId") as CenterId | null;
  if (requested && !CENTER_IDS.includes(requested)) return Response.json({ error: "Unknown center" }, { status: 400 });
  const asker = await resolveParent({ centerId: requested ?? undefined, familyId: params.get("familyId") });
  if (!asker) return Response.json({ error: "Sign in as a parent" }, { status: 401 });
  const { centerId, familyId } = asker;
  if (!familyId) return Response.json({ error: "Requests are for enrolled families" }, { status: 400 });
  const mine = (record: { familyId: string | null }) => record.familyId === familyId;

  const [center, family, handoffs, absences, lunches, tours] = await Promise.all([
    getCenter(centerId),
    getFamily(centerId, familyId),
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
      .map((h) => ({ id: h.id, createdAt: h.createdAt, text: h.text, status: h.status, to: h.to, staffName: staffName(h.to, h.childId),
        // Parents see staff replies in their own language, with what staff wrote alongside.
        reply: h.reply ? { text: h.reply.translated?.text ?? h.reply.text, original: h.reply.translated ? h.reply.text : null, by: h.reply.by, at: h.reply.at } : null,
      }))
      .reverse(),
    absences: absences.filter(mine).reverse(),
    lunches: lunches.filter(mine).reverse(),
    tours: tours.filter(mine).reverse(),
  });
}
