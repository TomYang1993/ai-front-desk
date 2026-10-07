import type { NextRequest } from "next/server";
import type { CenterId } from "@/content";
import { CENTER_IDS, getCenter, getHandbook, getHandoffs, getLogs } from "@/lib/data";

/** Center data and a summary of its seeded activity. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/centers/[centerId]">) {
  const { centerId } = await ctx.params;
  if (!CENTER_IDS.includes(centerId as CenterId)) {
    return Response.json({ error: "Unknown center" }, { status: 404 });
  }
  const id = centerId as CenterId;
  const [center, handbook, logs, handoffs] = await Promise.all([
    getCenter(id),
    getHandbook(id),
    getLogs(id),
    getHandoffs(id),
  ]);
  return Response.json({
    center,
    handbook: handbook.map((s) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt, updatedBy: s.updatedBy })),
    activity: {
      questions: logs.length,
      latestQuestionAt: logs.at(-1)?.askedAt ?? null,
      openHandoffs: handoffs.filter((h) => h.status === "open").length,
    },
  });
}
