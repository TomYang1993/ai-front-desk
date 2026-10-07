import { resetDemo } from "@/lib/data";

/** Restores all demo content and regenerates history relative to now. */
export async function POST() {
  const started = Date.now();
  await resetDemo();
  return Response.json({ ok: true, ms: Date.now() - started });
}
