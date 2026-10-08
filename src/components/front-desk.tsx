"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, RotateCcw, SendHorizontal } from "lucide-react";
import type { Lang } from "@/content/types";
import type { Action, AskReply, ChipId, HistoryTurn } from "@/lib/engine/types";
import type { ParentView } from "@/lib/parent-view";
import { STRINGS } from "@/lib/i18n";
import { signOut } from "@/lib/auth-actions";
import { formatSlot, listDays } from "@/lib/format";
import { Maple, type MapleState } from "./maple";
import { Lobby } from "./lobby";
import { NoticeBoard, type Requests } from "./notice-board";
import { ReplyCard, type ActionResult } from "./reply-card";

type ChatItem =
  | { kind: "greeting"; id: string }
  | { kind: "parent"; id: string; text: string }
  | { kind: "reply"; id: string; reply: AskReply }
  | { kind: "error"; id: string };

interface Saved {
  items: ChatItem[];
  done: Record<string, Record<number, ActionResult>>;
  feedback: Record<string, "up" | "down">;
  visitorIds: string[];
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const storageKey = (view: ParentView) => `afd:chat:${view.center.id}:${view.family?.id ?? "visitor"}`;

/** On sign-out, so the next person on this device doesn't see the conversation. */
function forgetChats() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("afd:chat:")) localStorage.removeItem(key);
  } catch {
    /* Nothing stored. */
  }
}

function load(view: ParentView): Saved {
  const empty: Saved = { items: [{ kind: "greeting", id: "greeting" }], done: {}, feedback: {}, visitorIds: [] };
  try {
    const raw = localStorage.getItem(storageKey(view));
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

export function FrontDesk({ view }: { view: ParentView }) {
  const lang: Lang = view.family?.language ?? "en";
  const s = STRINGS[lang];
  const [saved, setSaved] = useState<Saved>(() => load(view));
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [maple, setMaple] = useState<MapleState>("ready");
  const [handoffName, setHandoffName] = useState("");
  const [requests, setRequests] = useState<Requests | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the conversation in this browser, so a refresh doesn't lose it.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(view), JSON.stringify(saved));
    } catch {
      /* Storage can be unavailable in private windows; the chat still works. */
    }
  }, [saved, view]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [saved.items.length, pending]);

  const moodFor = useCallback((next: MapleState, ms?: number) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setMaple(next);
    if (ms) resetTimer.current = setTimeout(() => setMaple("ready"), ms);
  }, []);

  // The latest visitor ids, read by refresh so a stale timer never sends an old list.
  const visitorIds = useRef(saved.visitorIds);
  useEffect(() => {
    visitorIds.current = saved.visitorIds;
  }, [saved.visitorIds]);

  // Staff replies and requests, for the notice board and the chat.
  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ centerId: view.center.id });
    if (view.family) params.set("familyId", view.family.id);
    else params.set("ids", visitorIds.current.join(","));
    try {
      const res = await fetch(`/api/requests?${params}`);
      if (res.ok) setRequests(await res.json());
    } catch {
      /* The board just stays as it was. */
    }
  }, [view]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const t = setInterval(refresh, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  /** Staff replies to this chat's handoffs, shown right after the handoff. */
  const staffReplies = useMemo(() => {
    const map = new Map<string, { by: string; text: string }>();
    for (const h of requests?.handoffs ?? []) if (h.reply) map.set(h.id, { by: h.reply.by, text: h.reply.text });
    return map;
  }, [requests]);

  const history = (): HistoryTurn[] =>
    saved.items
      .flatMap((i): HistoryTurn[] => {
        if (i.kind === "parent") return [{ role: "parent", text: i.text }];
        if (i.kind !== "reply") return [];
        const staff = i.reply.handoff && staffReplies.get(i.reply.handoff.id);
        return staff ? [{ role: "maple", text: i.reply.text }, { role: "maple", text: `${staff.by}: ${staff.text}` }] : [{ role: "maple", text: i.reply.text }];
      })
      .slice(-6);

  async function send(opts: { text?: string; chip?: ChipId }) {
    const text = opts.chip ? s.chips[opts.chip] : (opts.text ?? "").trim();
    if (!text || pending) return;
    setInput("");
    setPending(true);
    setSlow(false);
    moodFor("thinking");
    const slowTimer = setTimeout(() => setSlow(true), 1200);
    const turnHistory = history();
    setSaved((prev) => ({ ...prev, items: [...prev.items, { kind: "parent", id: uid(), text }] }));
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ centerId: view.center.id, familyId: view.family?.id ?? null, message: opts.chip ? undefined : text, chip: opts.chip, history: turnHistory }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const reply = (await res.json()) as AskReply;
      setSaved((prev) => ({
        ...prev,
        items: [...prev.items, { kind: "reply", id: uid(), reply }],
        visitorIds: !view.family && reply.handoff ? [...prev.visitorIds, reply.handoff.id] : prev.visitorIds,
      }));
      if (reply.mode === "urgent" || reply.mode === "emergency") moodFor("calm");
      else if (reply.handoff) {
        setHandoffName(reply.handoff.staffName);
        moodFor("handoff", 6000);
      } else moodFor("ready");
      if (reply.handoff) setTimeout(refresh, 500);
    } catch {
      setSaved((prev) => ({ ...prev, items: [...prev.items, { kind: "error", id: uid() }] }));
      moodFor("ready");
    } finally {
      clearTimeout(slowTimer);
      setPending(false);
      setSlow(false);
    }
  }

  async function runAction(itemId: string, index: number, action: Action, extra?: { slotId?: string; name?: string }) {
    const body =
      action.type === "log_absence"
        ? { type: action.type, childId: action.childId, dates: action.dates, reason: action.reason }
        : action.type === "order_backup_lunch"
          ? { type: action.type, childId: action.childId }
          : { type: "book_tour", slotId: extra?.slotId, name: extra?.name };
    let result: ActionResult = { ok: false, text: s.actionFailed };
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ centerId: view.center.id, familyId: view.family?.id ?? null, action: body }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.type === "log_absence") {
          const teacher = view.family?.children.find((c) => c.firstName === data.childName)?.teacherName.split(" ")[0] ?? "";
          result = { ok: true, text: s.absenceLogged(data.childName, listDays(data.dates, lang), teacher) };
        } else if (data.type === "order_backup_lunch") {
          result = { ok: true, text: s.lunchOrdered(String(data.item).toLowerCase(), data.childName, `$${data.price}`) };
        } else {
          result = { ok: true, text: s.tourBooked(formatSlot(data.date, data.time, lang)) };
          if (!view.family) setSaved((prev) => ({ ...prev, visitorIds: [...prev.visitorIds, data.id] }));
        }
        moodFor("done", 1600);
      } else if (data.error) {
        result = { ok: false, text: `${s.actionFailed}` };
      }
    } catch {
      /* Keep the failure message. */
    }
    setSaved((prev) => ({ ...prev, done: { ...prev.done, [itemId]: { ...(prev.done[itemId] ?? {}), [index]: result } } }));
    setTimeout(refresh, 300);
  }

  async function giveFeedback(itemId: string, logId: string, value: "up" | "down") {
    setSaved((prev) => ({ ...prev, feedback: { ...prev.feedback, [itemId]: value } }));
    fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ centerId: view.center.id, logId, value }) }).catch(() => {});
  }

  function startOver() {
    setSaved((prev) => ({ items: [{ kind: "greeting", id: "greeting" }], done: {}, feedback: {}, visitorIds: prev.visitorIds }));
    moodFor("ready");
  }

  const mood: MapleState = pending ? "thinking" : maple === "ready" && focused && input.trim() ? "listening" : maple;
  const statusText = useMemo(() => {
    if (pending) return slow ? s.status.checking : s.status.reading;
    if (mood === "listening") return s.status.listening;
    if (mood === "handoff") return s.status.handoff(handoffName);
    if (mood === "calm") return s.status.calm;
    if (mood === "done") return s.status.done;
    return s.status.ready;
  }, [pending, slow, mood, handoffName, s]);

  const greeting = view.family ? s.greetingFamily(view.family.parentFirstName, view.center.shortName) : s.greetingVisitor(view.center.shortName);

  return (
    <div className="flex h-dvh flex-col bg-[#FBF7F0] text-stone-800 lg:grid lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,320px)] lg:gap-6 lg:p-6">
      {/* Lobby, laptop and up */}
      <aside className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-4">
        <Lobby state={mood} centerName={view.center.shortName} directorName={view.center.directorName} />
        <p className="text-center text-sm text-stone-500">{statusText}</p>
      </aside>

      {/* Chat */}
      <main className="flex min-h-0 flex-1 flex-col lg:rounded-3xl lg:border lg:border-stone-200 lg:bg-white/60 lg:shadow-sm">
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:rounded-t-3xl">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#F6EBD9] lg:hidden">
            <Maple state={mood} size={48} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2 font-bold text-stone-900">
              Maple <span className="truncate text-xs font-semibold text-teal-700">{s.aiLabel}</span>
            </p>
            <p className="truncate text-xs text-stone-500" aria-live="polite">
              {view.center.name} · {statusText}
            </p>
          </div>
          <button onClick={startOver} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label={s.startOver} title={s.startOver}>
            <RotateCcw size={18} />
          </button>
          <form action={signOut} onSubmit={forgetChats}>
            <button type="submit" className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label={s.signOut} title={s.signOut}>
              <LogOut size={18} />
            </button>
          </form>
        </header>

        {/* Today, phones and tablets */}
        <div className="border-b border-stone-200 bg-white/70 lg:hidden">
          <button onClick={() => setBoardOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-2 text-left text-sm" aria-expanded={boardOpen}>
            <span className="truncate">
              <span className="font-semibold text-stone-800">{s.board.today}:</span> <span className="text-stone-600">{view.board.statusLine}</span>
            </span>
            <ChevronDown size={16} className={`shrink-0 transition-transform ${boardOpen ? "rotate-180" : ""}`} />
          </button>
          {boardOpen && (
            <div className="max-h-[50dvh] overflow-y-auto px-4 pb-4">
              <NoticeBoard view={view} requests={requests} s={s} lang={lang} />
            </div>
          )}
        </div>

        <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {saved.items.map((item) => {
            if (item.kind === "greeting") {
              return (
                <div key={item.id} className="max-w-[92%] rounded-2xl rounded-tl-md border border-stone-200 bg-white px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                  {greeting}
                </div>
              );
            }
            if (item.kind === "parent") {
              return (
                <div key={item.id} className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-tr-md bg-teal-700 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
                  {item.text}
                </div>
              );
            }
            if (item.kind === "error") {
              return (
                <div key={item.id} className="max-w-[92%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {s.error}
                </div>
              );
            }
            const staff = item.reply.handoff && staffReplies.get(item.reply.handoff.id);
            return (
              <div key={item.id} className="flex flex-col gap-3">
              <ReplyCard
                reply={item.reply}
                lang={lang}
                s={s}
                done={saved.done[item.id] ?? {}}
                onAction={(i, a, extra) => runAction(item.id, i, a, extra)}
                onOption={(o) => send({ text: o })}
                feedback={saved.feedback[item.id]}
                onFeedback={(v) => giveFeedback(item.id, item.reply.logId, v)}
              />
              {staff && (
                <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                  <p className="mb-1 text-xs font-bold text-amber-900">{staff.by}</p>
                  {staff.text}
                </div>
              )}
              </div>
            );
          })}
          {pending && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600" />
              </span>
              {statusText}
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 bg-white/90 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 lg:rounded-b-3xl">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {view.chips.map((c) => (
              <button
                key={c}
                onClick={() => send({ chip: c })}
                disabled={pending}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm font-semibold text-stone-700 hover:border-teal-600 hover:text-teal-700 disabled:opacity-50"
              >
                {s.chips[c]}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send({ text: input });
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send({ text: input });
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={s.placeholder}
              aria-label={s.placeholder}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
            <button type="submit" disabled={pending || !input.trim()} aria-label={s.send} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">
              <SendHorizontal size={18} />
            </button>
          </form>
        </div>
      </main>

      {/* Notice board, laptop and up */}
      <aside className="hidden min-h-0 overflow-y-auto lg:block">
        <NoticeBoard view={view} requests={requests} s={s} lang={lang} />
      </aside>
    </div>
  );
}
