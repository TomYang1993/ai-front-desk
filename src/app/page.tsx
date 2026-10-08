import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { centers, families } from "@/content";
import { Maple } from "@/components/maple";

const LANG_LABEL = { en: "English", es: "Español", zh: "中文" } as const;

/** Pick who you are: a family at either center, or a visitor. No real login, by design. */
export default function Home() {
  return (
    <main className="min-h-dvh bg-[#FBF7F0] px-5 py-10 text-stone-800 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="rounded-full bg-[#F6EBD9] p-2">
            <Maple size={112} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-700">AI front desk prototype</p>
            <h1 className="text-3xl font-extrabold text-stone-900 sm:text-4xl">Meet Maple</h1>
            <p className="mt-2 max-w-xl text-stone-600">
              Maple answers parents from each center&apos;s own handbook and data, shows where every answer comes from, and hands
              anything sensitive or uncertain to the right person. Pick a family to try it.
            </p>
          </div>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {centers.map((center) => (
            <section key={center.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold text-stone-900">{center.name}</h2>
              <p className="text-sm text-stone-500">
                {center.city}, {center.state} · {center.rooms.length} rooms · {center.meals === "provided" ? "Meals provided" : "Families pack lunch"}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {families
                  .filter((f) => f.centerId === center.id)
                  .map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`/parent/${center.id}/${f.id}`}
                        className="group flex items-center justify-between gap-3 rounded-2xl border border-stone-200 px-4 py-3 hover:border-teal-600 hover:bg-teal-50/40"
                      >
                        <span>
                          <span className="block font-bold text-stone-900">{f.parentName}</span>
                          <span className="block text-sm text-stone-600">
                            {f.children
                              .map((c) => `${c.firstName}, ${center.rooms.find((r) => r.id === c.roomId)?.name}${c.allergies.length ? `, ${c.allergies.join(" and ")} allergy` : ""}`)
                              .join(" · ")}
                          </span>
                          <span className="mt-1 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">{LANG_LABEL[f.preferredLanguage]}</span>
                        </span>
                        <ArrowRight size={18} className="shrink-0 text-stone-400 group-hover:text-teal-700" />
                      </Link>
                    </li>
                  ))}
                <li>
                  <Link
                    href={`/parent/${center.id}/visitor`}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-dashed border-stone-300 px-4 py-3 hover:border-teal-600 hover:bg-teal-50/40"
                  >
                    <span>
                      <span className="block font-bold text-stone-900">Prospective family</span>
                      <span className="block text-sm text-stone-600">Not enrolled: tuition, waitlist and tours</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-stone-400 group-hover:text-teal-700" />
                  </Link>
                </li>
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/60 px-5 py-4 text-stone-500">
          <LayoutDashboard size={20} />
          <span>
            <span className="font-bold text-stone-700">Director console</span> arrives in the next phase.
          </span>
        </div>

        <footer className="mt-10 text-center text-xs text-stone-500">
          Everything here is fictional: the centers, families, staff and phone numbers. ·{" "}
          <Link href="/status" className="underline">
            Setup status
          </Link>
        </footer>
      </div>
    </main>
  );
}
