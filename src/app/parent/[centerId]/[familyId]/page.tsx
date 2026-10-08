import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { CenterId } from "@/content";
import { CENTER_IDS } from "@/lib/data";
import { getParentView } from "@/lib/parent-view";
import { FrontDeskClient } from "@/components/front-desk-client";

export const metadata: Metadata = { title: "Maple, the AI front desk" };

/** The parent app for one family, or for a visitor when familyId is "visitor". */
export default async function ParentPage(props: PageProps<"/parent/[centerId]/[familyId]">) {
  await connection();
  const { centerId, familyId } = await props.params;
  if (!CENTER_IDS.includes(centerId as CenterId)) notFound();
  const view = await getParentView(centerId as CenterId, familyId === "visitor" ? null : familyId);
  if (!view) notFound();
  return <FrontDeskClient view={view} />;
}
