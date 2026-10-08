import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getConsoleView } from "@/lib/console-view";
import { getSession } from "@/lib/session";
import { ConsoleApp } from "@/components/console/console-app";

export const metadata: Metadata = { title: "Director console · Maple, the AI front desk" };

/** The signed-in director's console for their own center. */
export default async function ConsolePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "director") redirect("/");
  const view = await getConsoleView(session.centerId, session.staffId);
  return <ConsoleApp view={view} />;
}
