"use client";

import { CalendarX2, Clock, Megaphone, MessageSquareReply, Users, UtensilsCrossed } from "lucide-react";
import type { Lang } from "@/content/types";
import type { ParentView } from "@/lib/parent-view";
import type { Strings } from "@/lib/i18n";
import { formatSlot, listDays } from "@/lib/format";

export interface Requests {
  handoffs: { id: string; createdAt: string; text: string; status: "open" | "answered"; to: string; staffName?: string; reply: { text: string; by: string; at: string } | null }[];
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

/**
 * The information cards on the front desk home: today, food, the next
 * closure, notices, the family's requests and their children.
 */
export function InfoCards({ view, requests, s, lang, className }: { view: ParentView; requests: Requests | null; s: Strings; lang: Lang; className?: string }) {
  const { board, family } = view;
  const items = requests
    ? [
        ...requests.handoffs.map((h) => ({
          key: h.id,
          title: h.text,
          detail: h.status === "answered" && h.reply ? `${s.board.replied(h.reply.by)}: ${h.reply.text}` : s.board.waiting(h.staffName ?? view.center.directorName),
          open: h.status === "open",
        })),
        ...requests.absences.map((a) => ({ key: a.id, title: s.board.absence(a.childName, listDays(a.dates, lang)), detail: "", open: false })),
        ...requests.lunches.map((l) => ({ key: l.id, title: s.board.lunch(l.item.toLowerCase(), l.childName), detail: "", open: false })),
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

      {board.menu && (
        <Section icon={<UtensilsCrossed size={14} />} title={s.board.meals}>
          <ul className="space-y-1">
            {board.menu.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Section>
      )}

      {board.nextClosure && (
        <Section icon={<CalendarX2 size={14} />} title={s.board.nextClosure}>
          <p>{board.nextClosure}</p>
        </Section>
      )}

      {board.announcements.length > 0 && (
        <Section icon={<Megaphone size={14} />} title={s.board.notices}>
          <ul className="space-y-2">
            {board.announcements.map((a) => (
              <li key={a.id}>
                <p className="font-semibold text-stone-800">{a.title}</p>
                <p>{a.body}</p>
                <p className="text-xs text-stone-500">{a.postedBy}</p>
              </li>
            ))}
          </ul>
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
              <span className="font-semibold text-stone-800">{c.firstName}</span>, {c.age}, {c.roomName} with {c.teacherName}
              {c.allergies.length > 0 && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">{c.allergies.join(", ")} allergy</span>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
