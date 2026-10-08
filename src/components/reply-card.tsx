"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Lang } from "@/content/types";
import type { Action, AskReply } from "@/lib/engine/types";
import type { Strings } from "@/lib/i18n";
import { formatSlot, listDays, shortDate } from "@/lib/format";

export type ActionResult = { ok: boolean; text: string };

function howLine(reply: AskReply, s: Strings) {
  const l = reply.lanes;
  const how = l.includes("quick_facts")
    ? s.how.facts
    : l.includes("handbook")
      ? s.how.handbook
      : l.includes("person") && !l.includes("understand")
        ? s.how.safety
        : l.includes("person")
          ? s.how.person
          : reply.sources.some((x) => x.id.startsWith("saved:"))
            ? s.how.saved
            : s.how.lookup;
  return `${how} · ${s.seconds((reply.ms / 1000).toFixed(1))}`;
}

const MODE_STYLE: Record<AskReply["mode"], string> = {
  answer: "bg-white border-stone-200",
  clarify: "bg-white border-stone-200",
  declined: "bg-white border-stone-200",
  handoff: "bg-amber-50 border-amber-200",
  urgent: "bg-slate-50 border-slate-300",
  emergency: "bg-red-50 border-red-300",
};

export function ReplyCard({
  reply,
  lang,
  s,
  done,
  onAction,
  onOption,
  feedback,
  onFeedback,
  dish = (name) => name,
}: {
  reply: AskReply;
  lang: Lang;
  s: Strings;
  done: Record<number, ActionResult | undefined>;
  onAction: (index: number, action: Action, extra?: { slotId?: string; name?: string }) => void;
  onOption: (text: string) => void;
  feedback?: "up" | "down";
  onFeedback: (value: "up" | "down") => void;
  /** A dish name in the family's language. */
  dish?: (name: string) => string;
}) {
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [tourName, setTourName] = useState("");
  const source = reply.sources.find((x) => x.id === openSource);

  return (
    <div className={`max-w-[92%] rounded-2xl rounded-tl-md border px-4 py-3 text-[15px] leading-relaxed text-stone-800 shadow-sm ${MODE_STYLE[reply.mode]}`}>
      {reply.mode === "emergency" && (
        <a href="tel:911" className="mb-2 flex items-center justify-center rounded-xl bg-red-700 px-4 py-2.5 text-base font-bold text-white">
          {s.call911}
        </a>
      )}
      <p className="whitespace-pre-line">{reply.text}</p>

      {reply.handoff && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-stone-700 ring-1 ring-amber-200">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
            {reply.handoff.staffName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </span>
          <span>{s.sentTo(reply.handoff.staffName)}</span>
        </div>
      )}

      {reply.options && reply.options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {reply.options.map((o) => (
            <button key={o} onClick={() => onOption(o)} className="rounded-full border border-teal-600 px-3 py-1 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              {o}
            </button>
          ))}
        </div>
      )}

      {reply.actions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {reply.actions.map((a, i) => {
            const result = done[i];
            if (result) {
              return (
                <p key={i} className={`rounded-xl px-3 py-2 text-sm ${result.ok ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-800"}`}>
                  {result.text}
                </p>
              );
            }
            if (a.type === "call_center") {
              return reply.mode === "emergency" || reply.mode === "urgent" || reply.mode === "declined" || reply.mode === "answer" ? (
                <a key={i} href={`tel:${a.phone}`} className="self-start rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                  {s.call(a.phone)}
                </a>
              ) : null;
            }
            if (a.type === "log_absence") {
              return (
                <button key={i} onClick={() => onAction(i, a)} className="self-start rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">
                  {s.logAbsence(a.childName, listDays(a.dates, lang))}
                </button>
              );
            }
            if (a.type === "order_backup_lunch") {
              return (
                <button key={i} onClick={() => onAction(i, a)} className="self-start rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">
                  {s.orderLunch(dish(a.item).toLowerCase(), a.childName, `$${a.price}`)}
                </button>
              );
            }
            return (
              <div key={i} className="flex flex-col gap-2 rounded-xl bg-stone-50 p-3">
                <label className="text-sm font-semibold text-stone-700">
                  {s.yourName}
                  <input
                    value={tourName}
                    onChange={(e) => setTourName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-normal"
                    placeholder="Jordan Smith"
                    maxLength={80}
                  />
                </label>
                <span className="text-sm font-semibold text-stone-700">{s.pickTour}</span>
                <div className="flex flex-wrap gap-2">
                  {a.slots.map((slot) => (
                    <button
                      key={slot.id}
                      disabled={!tourName.trim()}
                      onClick={() => onAction(i, a, { slotId: slot.id, name: tourName.trim() })}
                      className="rounded-full border border-teal-600 px-3 py-1 text-sm font-semibold text-teal-700 enabled:hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {formatSlot(slot.date, slot.time, lang)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reply.sources.length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{s.sources}</span>
            {reply.sources.map((src) => (
              <button
                key={src.id}
                onClick={() => setOpenSource(openSource === src.id ? null : src.id)}
                aria-expanded={openSource === src.id}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${openSource === src.id ? "bg-teal-700 text-white ring-teal-700" : "bg-teal-50 text-teal-800 ring-teal-200 hover:bg-teal-100"}`}
              >
                {src.label}
              </button>
            ))}
          </div>
          {source && (
            <div className="mt-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
              {source.updatedAt && <p className="mb-1 font-semibold text-stone-700">{s.updated(shortDate(source.updatedAt, lang), source.updatedBy)}</p>}
              {source.excerpt && <p className="max-h-40 overflow-y-auto whitespace-pre-line">{source.excerpt}</p>}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span>{howLine(reply, s)}</span>
        {reply.mode === "answer" && (
          <span className="flex items-center gap-1">
            {feedback ? (
              <span>{s.thanks}</span>
            ) : (
              <>
                <span className="mr-1">{s.helpful}</span>
                <button aria-label="Helpful" onClick={() => onFeedback("up")} className="rounded-full p-1 hover:bg-stone-100 hover:text-teal-700">
                  <ThumbsUp size={14} />
                </button>
                <button aria-label="Not helpful" onClick={() => onFeedback("down")} className="rounded-full p-1 hover:bg-stone-100 hover:text-red-700">
                  <ThumbsDown size={14} />
                </button>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
