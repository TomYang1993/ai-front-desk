"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, BookOpen, FlaskConical, Inbox as InboxIcon, LogOut } from "lucide-react";
import type { ConsoleView } from "@/lib/console-view";
import { signOut } from "@/lib/auth-actions";
import { CenterLogo } from "../center-logo";
import { ConsoleLink } from "./console-link";
import { Inbox } from "./inbox";
import { OverviewPanel } from "./overview";
import { SourceOfTruth } from "./source-of-truth";
import { TestBox } from "./test-box";
import { TABS, type Tab } from "./shared";

const NAV: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  { tab: "inbox", label: "Inbox", icon: <InboxIcon size={18} /> },
  { tab: "overview", label: "Overview", icon: <BarChart3 size={18} /> },
  { tab: "source", label: "Source of truth", icon: <BookOpen size={18} /> },
  { tab: "test", label: "Test Maple", icon: <FlaskConical size={18} /> },
];

/**
 * The control center shell: navigation, the signed-in director, and the active tab.
 * The server sends every tab's data at once, and the URL says which tab to show, so switching tabs never waits on the server.
 */
export function ConsoleApp({ view }: { view: ConsoleView }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS as readonly string[]).includes(String(params.get("tab"))) ? (params.get("tab") as Tab) : "inbox";
  const item = params.get("item");
  const sectionId = params.get("section");
  const section = sectionId ? { id: sectionId, fixLogId: params.get("fix") } : null;
  const waiting = view.inbox.filter((i) => i.status === "open").length;

  // New handoffs and parents' activity show up without a reload.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="min-h-dvh bg-[#FBF7F0] text-stone-800 lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-b border-stone-200 bg-white/70 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <CenterLogo centerId={view.center.id} size={40} />
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-tight text-stone-900">{view.center.name}</p>
            <p className="truncate text-xs text-stone-500">Control center</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:px-3 lg:pb-0" aria-label="Control center">
          {NAV.map((n) => (
            <ConsoleLink
              key={n.tab}
              href={`/console?tab=${n.tab}`}
              aria-current={tab === n.tab ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold ${tab === n.tab ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {n.icon}
              {n.label}
              {n.tab === "inbox" && waiting > 0 && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${tab === n.tab ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900"}`}>{waiting}</span>
              )}
            </ConsoleLink>
          ))}
        </nav>
        <div className="hidden items-center justify-between gap-2 border-t border-stone-200 px-5 py-4 lg:mt-auto lg:flex">
          <span className="truncate text-sm font-semibold text-stone-700">{view.me.name}</span>
          <form action={signOut}>
            <button type="submit" className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 lg:px-8 lg:py-7">
        <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
          <p className="text-sm text-stone-600">Signed in as {view.me.name}</p>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1 text-sm font-semibold text-stone-600">
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
        {tab === "inbox" && <Inbox items={view.inbox} me={view.me} selectedId={item} />}
        {tab === "overview" && <OverviewPanel overview={view.overview} />}
        {tab === "source" && <SourceOfTruth knowledge={view.knowledge} focus={section} />}
        {tab === "test" && <TestBox families={view.families} centerName={view.center.shortName} />}
      </main>
    </div>
  );
}
