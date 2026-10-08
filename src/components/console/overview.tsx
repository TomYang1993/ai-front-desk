"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Clock, Lock, MessageCircleQuestion, Moon, ThumbsDown, Timer, UserRound, Wrench } from "lucide-react";
import type { Overview } from "@/lib/console-view";
import { MINUTES_PER_ANSWER } from "@/lib/console-constants";
import { ConsoleLink } from "./console-link";
import { ago, LANGUAGE, post } from "./shared";

/** Chart colors: Maple's teal and the amber staff replies already wear. Validated as a pair for color vision differences. */
const MAPLE = "#0d9488";
const STAFF = "#d97706";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const hours = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim());

function delta(now: number, before: number, format: (n: number) => string = String) {
  if (!before) return null;
  const d = now - before;
  if (Math.abs(d) < 1e-9) return "Same as last week";
  return `${d > 0 ? "Up" : "Down"} ${format(Math.abs(d))} from last week`;
}

function Tile({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string | null }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold text-stone-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
    </div>
  );
}

export function OverviewPanel({ overview: o }: { overview: Overview }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Overview</h1>
        <p className="text-sm text-stone-600">The last 7 days, compared with the 7 days before.</p>
        {o.toFix.unhelpful > 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
            <Wrench size={16} className="shrink-0" />
            <span className="font-bold">To fix:</span>
            <a href="#unhelpful" className="underline-offset-2 hover:underline">
              {o.toFix.unhelpful} answer{o.toFix.unhelpful === 1 ? "" : "s"} parents found unhelpful
            </a>
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
            <CheckCircle2 size={16} /> Nothing to fix. Every unhelpful answer has been handled.
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Tile icon={<MessageCircleQuestion size={14} />} label="Questions" value={String(o.questions)} note={delta(o.questions, o.questionsBefore)} />
        <Tile icon={<Check size={14} />} label="Answered by Maple" value={pct(o.handledShare)} note={delta(o.handledShare, o.handledShareBefore, (n) => `${Math.round(n * 100)} points`)} />
        <Tile icon={<Timer size={14} />} label="Staff time saved" value={hours(o.minutesSaved)} note={`About ${MINUTES_PER_ANSWER} minutes per answered question`} />
        <Tile icon={<Moon size={14} />} label="After-hours answers" value={String(o.afterHours)} note="Answered while the center was closed" />
        <Tile icon={<UserRound size={14} />} label="Waiting for you" value={String(o.openHandoffs)} note={o.urgentOpen ? `${o.urgentOpen} urgent` : "None urgent"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-stone-900">Questions each week</h2>
          <p className="text-sm text-stone-500">Who answered them over the last 8 weeks.</p>
          <WeeklyChart weeks={o.weeks} />
        </section>
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-stone-900">What families asked about</h2>
          <p className="text-sm text-stone-500">Top topics this week.</p>
          <TopicBars topics={o.topics} />
          {o.languages.length > 1 && (
            <p className="mt-4 text-sm text-stone-600">
              <span className="font-semibold text-stone-800">Languages: </span>
              {o.languages.map((l) => `${LANGUAGE[l.language]} ${l.count}`).join(" · ")}
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="unhelpful" className="scroll-mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-extrabold text-stone-900">
            <ThumbsDown size={16} className="text-stone-500" /> Answers parents found unhelpful
          </h2>
          <p className="text-sm text-stone-500">From the thumbs down under Maple&apos;s answers, last 4 weeks. Fix the source Maple used. New answers are saved from the inbox.</p>
          {o.notHelpful.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No thumbs down yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {o.notHelpful.map((n) => (
                <UnhelpfulItem key={n.id} item={n} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Stacked columns: answered by Maple at the base, went to staff on top. */
function WeeklyChart({ weeks }: { weeks: Overview["weeks"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((w) => w.byMaple + w.byStaff));
  const H = 180;
  const scale = (n: number) => (n / max) * H;
  const last = weeks.length - 1;
  return (
    <figure className="mt-4">
      <div className="mb-3 flex gap-4 text-xs text-stone-600" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MAPLE }} /> Answered by Maple
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STAFF }} /> Went to staff
        </span>
      </div>
      <div className="relative flex items-end gap-2 border-b border-stone-200 sm:gap-3" style={{ height: H + 24 }} aria-hidden>
        {weeks.map((w, i) => {
          const total = w.byMaple + w.byStaff;
          return (
            <div
              key={w.label}
              className="relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {i === last && (
                <span className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-stone-700" style={{ bottom: scale(total) + 4 }}>
                  {total}
                </span>
              )}
              {w.byStaff > 0 && <div className="mx-auto w-full max-w-10 rounded-t" style={{ height: Math.max(2, scale(w.byStaff) - 2), background: STAFF, marginBottom: 2 }} />}
              <div className={`mx-auto w-full max-w-10 ${w.byStaff > 0 ? "" : "rounded-t"}`} style={{ height: scale(w.byMaple), background: MAPLE }} />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max -translate-x-1/2 rounded-xl bg-stone-900 px-3 py-2 text-xs text-white shadow-lg">
                  <p className="font-bold">Week of {w.label}</p>
                  <p>{total} questions</p>
                  <p>{w.byMaple} answered by Maple</p>
                  <p>{w.byStaff} went to staff</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2 sm:gap-3" aria-hidden>
        {weeks.map((w, i) => (
          <span key={w.label} className={`flex-1 text-center text-[11px] ${i === last ? "font-semibold text-stone-700" : "text-stone-500"}`}>
            {w.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Questions each week, by who answered them</caption>
        <thead>
          <tr>
            <th>Week of</th>
            <th>Answered by Maple</th>
            <th>Went to staff</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.label}>
              <td>{w.label}</td>
              <td>{w.byMaple}</td>
              <td>{w.byStaff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** One series, so one hue and no legend; the values sit at the end of each bar. */
function TopicBars({ topics }: { topics: Overview["topics"] }) {
  const max = Math.max(1, ...topics.map((t) => t.count));
  if (!topics.length) return <p className="mt-4 text-sm text-stone-500">No questions this week yet.</p>;
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {topics.map((t) => (
        <li key={t.topic} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 text-sm" title={`${t.label}: ${t.count} this week, ${t.before} the week before`}>
          <span className="truncate text-stone-700">{t.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 rounded-r" style={{ width: `${(t.count / max) * 80}%`, background: MAPLE }} />
            <span className="whitespace-nowrap font-semibold text-stone-800">{t.count}</span>
            <span className="whitespace-nowrap text-xs text-stone-500">({t.before} before)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One unhelpful answer, with what Maple said and the ways to fix it. */
function UnhelpfulItem({ item: n }: { item: Overview["notHelpful"][number] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const section = n.sources.find((x) => x.sectionId);
  const savedAnswer = n.sources.find((x) => x.id.startsWith("saved:"));
  // Hours, tuition and the like are center data, read-only for now: there is nothing to edit, but the director can check what Maple read.
  const table = !section && !savedAnswer ? n.sources.find((x) => x.id.startsWith("table:")) : undefined;
  // Every other answer is fixed in Source of truth: the handbook section or saved answer Maple used, or the tab itself.
  const fixHref = section
    ? `/console?tab=source&section=${section.sectionId}&fix=${n.id}`
    : savedAnswer
      ? `/console?tab=source#answer-${savedAnswer.id.slice(6)}`
      : table
        ? null
        : "/console?tab=source";

  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (n.handled) {
    return (
      <li className="flex items-start gap-2 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700" />
        <span>
          <span className="line-clamp-1 text-stone-700">{n.textEnglish ?? n.text}</span>
          {n.handled.how === "answer" ? "Better answer saved" : n.handled.how === "source" ? "Source fixed" : "Reviewed"} by {n.handled.by} · {ago(n.handled.at)}
        </span>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-stone-200 px-4 py-3">
      <p className="text-sm font-semibold text-stone-900">{n.textEnglish ?? n.text}</p>
      <p className="flex items-center gap-1 text-xs text-stone-500">
        <Clock size={12} /> {ago(n.at)} · {n.topic}
      </p>
      {n.answer && (
        <p className="mt-2 line-clamp-3 rounded-xl bg-[#FBF7F0] px-3 py-2 text-sm text-stone-700">
          <span className="font-semibold text-stone-800">Maple said: </span>
          {n.answer}
        </p>
      )}
      {n.sources.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          Maple used: {n.sources.map((x) => x.label).join(", ")}
        </p>
      )}
      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
        {fixHref && (
          <ConsoleLink href={fixHref} className="flex items-center gap-1.5 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800">
            <Wrench size={13} /> Fix source of truth
          </ConsoleLink>
        )}
        {table && (
          <ConsoleLink href={`/console?tab=source#table-${table.id.slice(6)}`} className="flex items-center gap-1.5 rounded-full border border-teal-700 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50">
            <Lock size={13} /> Read only for now, check &ldquo;{table.label}&rdquo;
          </ConsoleLink>
        )}
        <button
          onClick={() => act(() => post(`/api/console/feedback/${n.id}`, { how: "reviewed" }))}
          disabled={busy}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-100 disabled:opacity-50"
        >
          Mark as handled
        </button>
      </div>
    </li>
  );
}
