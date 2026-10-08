import "server-only";
import { z } from "zod";
import type { CenterId } from "@/content";
import { getCenter } from "./data";
import { resolveDirector } from "./session";

/** The director behind a control center request, or a 401 response to return. */
export async function directorFor(body: { centerId?: CenterId | null } = {}) {
  const who = await resolveDirector(body);
  if (!who) return { error: Response.json({ error: "Sign in as a director" }, { status: 401 }) } as const;
  const center = await getCenter(who.centerId);
  const staff = center.staff.find((s) => s.id === who.staffId) ?? center.staff.find((s) => s.role === "director")!;
  return { center, staffName: staff.name } as const;
}


/** The editable fields of a saved answer. */
export const SavedAnswerFields = z.object({
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(2000),
  keywords: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(12),
});
