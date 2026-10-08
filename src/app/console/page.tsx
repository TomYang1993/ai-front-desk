import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getConsoleView } from "@/lib/console-view";
import { getSession } from "@/lib/session";
import { ConsoleApp } from "@/components/console/console-app";
import { TABS, type Tab } from "@/components/console/shared";

export const metadata: Metadata = { title: "Director console · Maple, the AI front desk" };

/** The signed-in director's console for their own center. */
export default async function ConsolePage(props: PageProps<"/console">) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "director") redirect("/");
  const params = await props.searchParams;
  const tab = (TABS as readonly string[]).includes(String(params.tab)) ? (params.tab as Tab) : "inbox";
  const item = typeof params.item === "string" ? params.item : null;
  const section = typeof params.section === "string" ? { id: params.section, fixLogId: typeof params.fix === "string" ? params.fix : null } : null;
  const view = await getConsoleView(session.centerId, session.staffId);
  return <ConsoleApp view={view} tab={tab} item={item} section={section} />;
}
