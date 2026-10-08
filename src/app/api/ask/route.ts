import { z } from "zod";
import { ask } from "@/lib/engine";
import { getFamily } from "@/lib/data";

const Body = z.object({
  centerId: z.enum(["pinon-grove", "quail-ridge"]),
  familyId: z.string().nullable().optional(),
  message: z.string().max(1000).optional(),
  chip: z.enum(["today_lunch", "hours", "next_closure", "tuition", "tours"]).optional(),
  history: z
    .array(z.object({ role: z.enum(["parent", "maple"]), text: z.string().max(2000) }))
    .max(10)
    .optional(),
  /** Test controls, honored only outside production. */
  demoNow: z.string().datetime().optional(),
  simulateOutage: z.boolean().optional(),
  noCache: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  const body = parsed.data;
  if (!body.chip && !body.message?.trim()) return Response.json({ error: "Message or chip required" }, { status: 400 });
  if (body.familyId && !(await getFamily(body.centerId, body.familyId))) {
    return Response.json({ error: "Unknown family for this center" }, { status: 400 });
  }

  const production = process.env.VERCEL_ENV === "production";
  const reply = await ask({
    centerId: body.centerId,
    familyId: body.familyId ?? null,
    message: body.message,
    chip: body.chip,
    history: body.history,
    now: !production && body.demoNow ? new Date(body.demoNow) : undefined,
    simulateOutage: !production && body.simulateOutage,
    noCache: !production && body.noCache,
  });
  const { checks, ...publicReply } = reply;
  return Response.json(production ? publicReply : { ...publicReply, checks });
}
