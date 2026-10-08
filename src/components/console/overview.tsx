"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, MessageCircleQuestion, Moon, ThumbsDown, Timer, UserRound } from "lucide-react";
import type { Overview } from "@/lib/console-view";
import { MINUTES_PER_ANSWER } from "@/lib/console-constants";
import { ago, LANGUAGE } from "./shared";

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
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-stone-900">Gaps Maple couldn&apos;t answer</h2>
          <p className="text-sm text-stone-500">The last 4 weeks. Answer one once and save it, and Maple handles it from then on.</p>
          {o.gaps.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No gaps. Maple answered everything it was asked.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {o.gaps.map((g) => (
                <li key={g.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm text-stone-800">{g.textEnglish ?? g.text}</span>
                    <span className="text-xs text-stone-500">
                      {g.count > 1 ? `Asked ${g.count} times · ${ago(g.at)}` : ago(g.at)}
                    </span>
                  </span>
                  {g.saved ? (
                    <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">Saved answer</span>
                  ) : g.status === "open" ? (
                    <Link href={`/console?tab=inbox&item=${g.id}`} className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200">
                      Answer it
                    </Link>
                  ) : (
                    <Link href={`/console?tab=inbox&item=${g.id}`} className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-200">
                      Save it
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-extrabold text-stone-900">
            <ThumbsDown size={16} className="text-stone-500" /> Answers parents found unhelpful
          </h2>
          <p className="text-sm text-stone-500">Worth a look: the handbook may need a clearer section.</p>
          {o.notHelpful.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No thumbs down yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {o.notHelpful.map((n) => (
                <li key={n.id} className="py-2.5">
                  <p className="line-clamp-2 text-sm text-stone-800">{n.textEnglish ?? n.text}</p>
                  <p className="flex items-center gap-1 text-xs text-stone-500">
                    <Clock size={12} /> {ago(n.at)} · {n.topic}
                  </p>
                </li>
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
