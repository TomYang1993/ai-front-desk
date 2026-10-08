"use client";

import { useState } from "react";
import { CalendarX2, Clock, Info, Languages, Megaphone, MessageSquareReply, ShieldCheck, TriangleAlert, Users, UtensilsCrossed } from "lucide-react";
import type { Lang } from "@/content/types";
import type { ParentView } from "@/lib/parent-view";
import type { Strings } from "@/lib/i18n";
import { formatSlot, listDays } from "@/lib/format";

export interface Requests {
  handoffs: { id: string; createdAt: string; text: string; status: "open" | "answered"; to: string; staffName?: string; reply: { text: string; original: string | null; by: string; at: string } | null }[];
  absences: { id: string; childName: string; dates: string[] }[];
  lunches: { id: string; childName: string; item: string }[];
  tours: { id: string; slotId: string; name: string }[];
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 break-inside-avoid rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500">
        {icon}
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-stone-700">{children}</div>
    </section>
  );
}

/** Marks text Maple translated, with a toggle to read what staff actually wrote. */
function TranslatedNote({ s, showing, onToggle }: { s: Strings; showing?: "original" | "translation"; onToggle?: () => void }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
      <Languages size={13} aria-hidden />
      {s.board.translated}
      {onToggle && (
        <>
          {" · "}
          <button onClick={onToggle} className="font-semibold text-teal-700 underline-offset-2 hover:underline">
            {showing === "original" ? s.board.showTranslation : s.board.showOriginal}
          </button>
        </>
      )}
    </p>
  );
}

/** The week's lunches, folded away under "This week" unless today has no menu. */
function WeekMenu({ week, s, startOpen }: { week: ParentView["board"]["week"]; s: Strings; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  if (!week.days.some((d) => d.dish)) return null;
  return (
    <div className="mt-3 border-t border-stone-100 pt-2">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline">
        {s.board.thisWeek} {open ? "−" : "+"}
      </button>
      {open && (
        <>
          <p className="mt-1 text-xs text-stone-500">{week.label}</p>
          <ul className="mt-1 divide-y divide-stone-100">
            {week.days.map((d) => (
              <li key={d.date} className={`flex gap-3 py-1.5 ${d.today ? "font-semibold text-stone-900" : ""}`}>
                <span className="w-24 shrink-0 capitalize text-stone-500">{d.day}</span>
                <span className="min-w-0">
                  {d.dish ?? <span className="text-stone-400">{s.board.closedDay}</span>}
                  {d.notSafeFor.length > 0 && (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                      {s.board.notSafeFor(d.notSafeFor.join(", "))}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * The information cards on the front desk home: today, food, the next
 * closure, notices, the family's requests and their children.
 */
export function InfoCards({ view, requests, s, lang, className }: { view: ParentView; requests: Requests | null; s: Strings; lang: Lang; className?: string }) {
  const { board, family } = view;
  const [original, setOriginal] = useState(false);
  const pick = (t: { text: string; original: string | null }) => (original && t.original ? t.original : t.text);
  const noticesTranslated = board.announcements.some((a) => a.title.original || a.body.original);
  const items = requests
    ? [
        ...requests.handoffs.map((h) => ({
          key: h.id,
          title: h.text,
          detail: h.status === "answered" && h.reply ? `${s.board.replied(h.reply.by)}: ${h.reply.text}` : s.board.waiting(h.staffName ?? view.center.directorName),
          open: h.status === "open",
        })),
        ...requests.absences.map((a) => ({ key: a.id, title: s.board.absence(a.childName, listDays(a.dates, lang)), detail: "", open: false })),
        ...requests.lunches.map((l) => ({ key: l.id, title: s.board.lunch((view.dishes[l.item] ?? l.item).toLowerCase(), l.childName), detail: "", open: false })),
        ...requests.tours.map((t) => ({ key: t.id, title: s.board.tour(formatSlot(t.slotId.slice(0, 10), t.slotId.slice(11), lang)), detail: "", open: false })),
      ]
    : [];

  return (
    <div className={className}>
      <Section icon={<Clock size={14} />} title={s.board.today}>
        <p className="font-semibold text-stone-800">{board.dateLabel}</p>
        <p className={board.open ? "text-teal-700" : "text-stone-500"}>{board.statusLine}</p>
        <p className="mt-1 text-xs text-stone-500">{view.center.hoursLine}</p>
      </Section>

      {(board.menu || board.week.days.some((d) => d.dish)) && (
        <Section icon={<UtensilsCrossed size={14} />} title={s.board.meals}>
          {board.menu && (
          <>
          <ul className="space-y-1">
            {board.menu.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {board.menu.notes.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {board.menu.notes.map((n) => (
                <li
                  key={n.text}
                  className={`flex gap-2 rounded-xl px-3 py-2 text-sm ${n.tone === "safe" ? "bg-teal-50 text-teal-900" : n.tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-stone-50 text-stone-700"}`}
                >
                  {n.tone === "safe" ? <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden /> : n.tone === "warn" ? <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> : <Info size={16} className="mt-0.5 shrink-0" aria-hidden />}
                  {n.text}
                </li>
              ))}
            </ul>
          )}
          {board.menu.translated && <TranslatedNote s={s} />}
          </>
          )}
          <WeekMenu week={board.week} s={s} startOpen={!board.menu} />
        </Section>
      )}

      {board.nextClosure && (
        <Section icon={<CalendarX2 size={14} />} title={s.board.nextClosure}>
          <p>{pick(board.nextClosure)}</p>
          {board.nextClosure.original && <TranslatedNote s={s} showing={original ? "original" : "translation"} onToggle={() => setOriginal((o) => !o)} />}
        </Section>
      )}

      {board.announcements.length > 0 && (
        <Section icon={<Megaphone size={14} />} title={s.board.notices}>
          <ul className="space-y-2">
            {board.announcements.map((a) => (
              <li key={a.id}>
                <p className="font-semibold text-stone-800">{pick(a.title)}</p>
                <p>{pick(a.body)}</p>
                <p className="text-xs text-stone-500">{a.postedBy}</p>
              </li>
            ))}
          </ul>
          {noticesTranslated && <TranslatedNote s={s} showing={original ? "original" : "translation"} onToggle={() => setOriginal((o) => !o)} />}
        </Section>
      )}

      <Section icon={<MessageSquareReply size={14} />} title={s.board.requests}>
        {items.length === 0 ? (
          <p className="text-stone-500">{s.board.noRequests}</p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 6).map((i) => (
              <li key={i.key} className="border-l-2 pl-2" style={{ borderColor: i.open ? "#F2B84B" : "#5DCAA5" }}>
                <p className="line-clamp-2 font-medium text-stone-800">{i.title}</p>
                {i.detail && <p className="text-xs text-stone-500">{i.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Users size={14} />} title={s.board.children}>
        <ul className="space-y-1.5">
          {family.children.map((c) => (
            <li key={c.id}>
              <span className="font-semibold text-stone-800">{c.firstName}</span>
              {s.board.child("", c.age, c.roomName, c.teacherName)}
              {c.allergies.length > 0 && (
                <span className="ml-1 whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                  {s.board.allergy(c.allergies.map((a) => s.board.allergens[a]))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
