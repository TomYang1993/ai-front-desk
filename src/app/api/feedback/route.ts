import { z } from "zod";
import { setFeedback } from "@/lib/data";

const Body = z.object({
  centerId: z.enum(["pinon-grove", "quail-ridge"]),
  logId: z.string().max(100),
  value: z.enum(["up", "down"]),
});

/** Thumbs up or down on one of Maple's replies. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  await setFeedback(parsed.data.centerId, parsed.data.logId, parsed.data.value);
  return Response.json({ ok: true });
}
