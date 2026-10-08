import { z } from "zod";
import { addAbsence, addLunchOrder, addTourBooking, getCenter, getFamily } from "@/lib/data";
import { dayStatus } from "@/lib/facts/calendar";
import { menuFor, safeBackupLunch } from "@/lib/facts/menu";
import { upcomingTourSlots } from "@/lib/facts/tours";
import { resolveParent } from "@/lib/session";
import { zonedParts } from "@/lib/time";

/**
 * Carries out an action Maple offered. Prices, menu items and open tour
 * times are recomputed here; nothing the browser sends is trusted for them.
 */
const Body = z.object({
  /** Read from the session; honored only for test scripts outside production. */
  centerId: z.enum(["pinon-grove", "quail-ridge"]).optional(),
  familyId: z.string().nullable().optional(),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("log_absence"), childId: z.string(), dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(10), reason: z.string().max(200) }),
    z.object({ type: z.literal("order_backup_lunch"), childId: z.string() }),
    z.object({ type: z.literal("book_tour"), slotId: z.string(), name: z.string().trim().min(1).max(80) }),
  ]),
});

const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const asker = await resolveParent(parsed.data);
  if (!asker) return Response.json({ error: "Sign in as a parent" }, { status: 401 });
  const { centerId, familyId } = asker;
  const { action } = parsed.data;
  const center = await getCenter(centerId);
  const family = familyId ? await getFamily(centerId, familyId) : undefined;
  if (familyId && !family) return Response.json({ error: "Unknown family" }, { status: 400 });
  const now = new Date();
  const today = zonedParts(now, center.timeZone).date;

  if (action.type === "log_absence") {
    const child = family?.children.find((c) => c.id === action.childId);
    if (!family || !child) return Response.json({ error: "Unknown child" }, { status: 400 });
    const dates = action.dates.filter((d) => d >= today && dayStatus(center, d).open);
    if (!dates.length) return Response.json({ error: "No open days to log" }, { status: 400 });
    await addAbsence(centerId, { id: id("abs"), familyId: family.id, childId: child.id, childName: child.firstName, dates, reason: action.reason, createdAt: now.toISOString() });
    return Response.json({ ok: true, type: action.type, childName: child.firstName, dates });
  }

  if (action.type === "order_backup_lunch") {
    const child = family?.children.find((c) => c.id === action.childId);
    if (!family || !child) return Response.json({ error: "Unknown child" }, { status: 400 });
    if (center.meals !== "pack_lunch" || !center.fees.backupLunch) return Response.json({ error: "This center provides lunch" }, { status: 400 });
    const day = dayStatus(center, today).open ? menuFor(center, today) : null;
    const pick = day ? safeBackupLunch(day, child) : null;
    if (!pick?.item) return Response.json({ error: "No safe backup lunch today" }, { status: 400 });
    await addLunchOrder(centerId, { id: id("lunch"), familyId: family.id, childId: child.id, childName: child.firstName, item: pick.item.name, price: center.fees.backupLunch, date: today, createdAt: now.toISOString() });
    return Response.json({ ok: true, type: action.type, childName: child.firstName, item: pick.item.name, price: center.fees.backupLunch });
  }

  const slot = upcomingTourSlots(center, now, 21).find((s) => s.id === action.slotId);
  if (!slot) return Response.json({ error: "That tour time is no longer available" }, { status: 409 });
  const bookingId = id("tour");
  const booked = await addTourBooking(centerId, { id: bookingId, slotId: slot.id, name: action.name, bookedAt: now.toISOString(), familyId: family?.id ?? null });
  if (!booked) return Response.json({ error: "That tour time was just booked" }, { status: 409 });
  return Response.json({ ok: true, type: action.type, id: bookingId, date: slot.date, time: slot.time });
}
