import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getParentView } from "@/lib/parent-view";
import { getSession } from "@/lib/session";
import { FrontDeskClient } from "@/components/front-desk-client";

/** A signed-in parent's front desk. The family comes from the session, never the URL. */
export default async function Home() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "parent") redirect("/console");
  const view = await getParentView(session.centerId, session.familyId);
  if (!view) redirect("/signin");
  return <FrontDeskClient view={view} />;
}
