import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LayoutDashboard, LogOut } from "lucide-react";
import { getCenter } from "@/lib/data";
import { signOut } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Director console · Maple, the AI front desk" };

/** Where directors land. The console itself is Phase 4. */
export default async function ConsolePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.role !== "director") redirect("/");
  const center = await getCenter(session.centerId);
  const director = center.staff.find((s) => s.id === session.staffId);

  return (
    <main className="min-h-dvh bg-[#FBF7F0] px-4 py-10 text-stone-800 sm:px-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{center.name}</p>
            <h1 className="text-2xl font-extrabold text-stone-900">Welcome, {director?.name.split(" ")[0] ?? "Director"}</h1>
          </div>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50">
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </header>
        <section className="flex items-start gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <LayoutDashboard size={22} className="mt-0.5 shrink-0 text-teal-700" />
          <p className="text-stone-600">
            <span className="font-bold text-stone-900">The director console arrives in the next phase.</span> It will hold the inbox of
            questions Maple handed to you, what families are asking, and the handbook Maple answers from.
          </p>
        </section>
      </div>
    </main>
  );
}
