"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";
import { LogOut, MessageCircle } from "lucide-react";
import type { Lang } from "@/content/types";
import type { Action, AskReply, ChipId, HistoryTurn } from "@/lib/engine/types";
import type { ParentView } from "@/lib/parent-view";
import { STRINGS, type DayPart } from "@/lib/i18n";
import { signOut } from "@/lib/auth-actions";
import { formatSlot, listDays } from "@/lib/format";
import { Maple, type MapleState } from "./maple";
import { DeskScene } from "./desk-scene";
import { InfoCards, type Requests } from "./info-cards";
import { ChatHeader, ChatThread, Composer, type ChatItem } from "./chat";
import type { ActionResult } from "./reply-card";

interface Saved {
  items: ChatItem[];
  done: Record<string, Record<number, ActionResult>>;
  feedback: Record<string, "up" | "down">;
  /** Handoffs whose staff reply the parent has already seen. */
  seenReplies: string[];
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const storageKey = (view: ParentView) => `afd:chat:${view.center.id}:${view.family.id}`;

/** Springs for the chat card and for Maple moving between the desk and the card. */
const CARD_SPRING: Transition = { type: "spring", stiffness: 380, damping: 36 };
const MAPLE_SPRING: Transition = { type: "spring", stiffness: 260, damping: 26 };

/** Laptops dock the chat beside the desk; smaller screens open it as a card. */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(WIDE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => matchMedia(WIDE).matches,
    () => false,
  );
}

function dayPart(timeZone: string): DayPart {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

/** On sign-out, so the next person on this device doesn't see the conversation. */
function forgetChats() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("afd:chat:")) localStorage.removeItem(key);
  } catch {
    /* Nothing stored. */
  }
}

function load(view: ParentView): Saved {
  const empty: Saved = { items: [{ kind: "greeting", id: "greeting" }], done: {}, feedback: {}, seenReplies: [] };
  try {
    const raw = localStorage.getItem(storageKey(view));
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

export function FrontDesk({ view }: { view: ParentView }) {
  const lang: Lang = view.family.language;
  const s = STRINGS[lang];
  const wide = useWide();
  const [saved, setSaved] = useState<Saved>(() => load(view));
  const [open, setOpen] = useState(false);
  const [flying, setFlying] = useState(false);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [maple, setMaple] = useState<MapleState>("ready");
  const [handoffName, setHandoffName] = useState("");
  const [requests, setRequests] = useState<Requests | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatVisible = wide || open;

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
  }, [saved.items.length, pending, chatVisible]);

  // While the card is open on a phone, the page behind it stays put, and Escape closes it.
  useEffect(() => {
    if (!open || wide) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeChat();
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, wide]);

  const moodFor = useCallback((next: MapleState, ms?: number) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setMaple(next);
    if (ms) resetTimer.current = setTimeout(() => setMaple("ready"), ms);
  }, []);

  /** Seeing the chat counts as reading the staff replies in it. */
  const markRepliesSeen = useCallback((data: Requests | null) => {
    const ids = (data?.handoffs ?? []).filter((h) => h.reply).map((h) => h.id);
    if (ids.length) setSaved((prev) => (ids.every((id) => prev.seenReplies.includes(id)) ? prev : { ...prev, seenReplies: [...new Set([...prev.seenReplies, ...ids])] }));
  }, []);

  // Whether the chat is on screen, read by refresh without restarting its timer.
  const chatVisibleRef = useRef(chatVisible);
  useEffect(() => {
    chatVisibleRef.current = chatVisible;
  }, [chatVisible]);

  // Staff replies and requests, for the cards and the chat.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests");
      if (!res.ok) return;
      const data = (await res.json()) as Requests;
      setRequests(data);
      if (chatVisibleRef.current) markRepliesSeen(data);
    } catch {
      /* The cards just stay as they were. */
    }
  }, [markRepliesSeen]);

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
        body: JSON.stringify({ message: opts.chip ? undefined : text, chip: opts.chip, history: turnHistory }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const reply = (await res.json()) as AskReply;
      setSaved((prev) => ({ ...prev, items: [...prev.items, { kind: "reply", id: uid(), reply }] }));
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
        body: JSON.stringify({ action: body }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.type === "log_absence") {
          const teacher = view.family.children.find((c) => c.firstName === data.childName)?.teacherName.split(" ")[0] ?? "";
          result = { ok: true, text: s.absenceLogged(data.childName, listDays(data.dates, lang), teacher) };
        } else if (data.type === "order_backup_lunch") {
          result = { ok: true, text: s.lunchOrdered(String(data.item).toLowerCase(), data.childName, `$${data.price}`) };
        } else {
          result = { ok: true, text: s.tourBooked(formatSlot(data.date, data.time, lang)) };
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
    fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ logId, value }) }).catch(() => {});
  }

  function startOver() {
    setSaved((prev) => ({ ...prev, items: [{ kind: "greeting", id: "greeting" }], done: {}, feedback: {} }));
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

  const greeting = s.greetingFamily(view.family.parentFirstName, view.center.shortName);
  const [part] = useState(() => dayPart(view.center.timeZone));
  const directorFirstName = view.center.directorName.split(" ")[0];

  // Staff replies the parent hasn't seen yet, announced in Maple's bubble on phones.
  const unread = (requests?.handoffs ?? []).filter((h) => h.reply && !saved.seenReplies.includes(h.id));

  function openChat(opts: { focus?: boolean } = {}) {
    markRepliesSeen(requests);
    setOpen(true);
    // Typing opens the keyboard, so only the "Ask Maple" bar focuses the text box.
    setTimeout(() => (opts.focus ? textarea.current : dialog.current)?.focus({ preventScroll: true }), opts.focus ? 380 : 50);
  }

  function closeChat() {
    setFlying(true);
    setOpen(false);
    // Reduced motion skips the flight, so don't wait for it to finish.
    setTimeout(() => setFlying(false), 900);
  }

  function askFromHome(chip: ChipId) {
    if (!wide) openChat();
    send({ chip });
  }

  /** Maple herself. The shared layoutId moves her between the desk and the chat card. */
  const mapleFigure = (
    <motion.div
      layoutId="maple"
      transition={MAPLE_SPRING}
      onLayoutAnimationComplete={() => setFlying(false)}
      className="relative h-full w-full [&>svg]:h-full [&>svg]:w-full"
      style={{ zIndex: flying ? 60 : undefined }}
    >
      <Maple state={mood} size={120} />
    </motion.div>
  );

  const bubbleText = wide ? statusText : unread[0]?.reply ? s.home.replied(unread[0].reply.by.split(" ")[0]) : s.home.bubble;
  const bubble = (
    <motion.button
      key={bubbleText}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => (wide ? textarea.current?.focus() : openChat())}
      className={`absolute left-1/2 top-[3%] max-w-[44%] -translate-x-1/2 rounded-2xl px-2.5 py-1.5 text-center text-[11px] font-semibold leading-snug shadow-sm ring-1 sm:text-sm ${
        unread.length && !wide ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-white text-stone-700 ring-stone-200"
      }`}
      aria-live="polite"
    >
      {unread.length > 0 && !wide && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" aria-hidden />}
      {bubbleText}
    </motion.button>
  );

  const desk = (
    <DeskScene
      centerId={view.center.id}
      centerName={view.center.shortName}
      directorFirstName={directorFirstName}
      doorLit={mood === "handoff" || mood === "calm"}
      bubble={open && !wide ? null : bubble}
      maple={
        open && !wide ? null : (
          <button
            onClick={() => (wide ? textarea.current?.focus() : openChat())}
            aria-label={s.home.chatWith}
            className="h-full w-full rounded-full outline-offset-4 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {mapleFigure}
          </button>
        )
      }
    />
  );

  const topBar = (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-teal-700">{view.center.name}</p>
        <h1 className="truncate text-xl font-extrabold text-stone-900 sm:text-2xl">{s.home.greeting(view.family.parentFirstName, part)}</h1>
      </div>
      <form action={signOut} onSubmit={forgetChats}>
        <button type="submit" className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white/70 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-white" aria-label={s.signOut}>
          <LogOut size={16} />
          <span className="hidden sm:inline">{s.signOut}</span>
        </button>
      </form>
    </header>
  );

  const thread = (
    <ChatThread
      items={saved.items}
      greeting={greeting}
      s={s}
      lang={lang}
      done={saved.done}
      feedback={saved.feedback}
      staffReplies={staffReplies}
      pending={pending}
      statusText={statusText}
      scroller={scroller}
      onAction={runAction}
      onOption={(o) => send({ text: o })}
      onFeedback={giveFeedback}
    />
  );

  const composer = (
    <Composer s={s} chips={view.chips} pending={pending} input={input} textarea={textarea} onInput={setInput} onFocusChange={setFocused} onSend={send} />
  );

  if (wide) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="grid h-dvh grid-cols-[minmax(0,1fr)_minmax(380px,440px)] gap-6 bg-[#FBF7F0] p-6 text-stone-800">
          <main className="min-h-0 overflow-y-auto pr-1">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {topBar}
              <div className="mx-auto w-full max-w-[560px]">{desk}</div>
              <InfoCards view={view} requests={requests} s={s} lang={lang} className="columns-2 gap-3" />
            </div>
          </main>
          <section aria-label={s.home.chatWith} className="flex min-h-0 flex-col rounded-[28px] border border-stone-200 bg-white/60 shadow-sm">
            <ChatHeader s={s} centerName={view.center.name} statusText={statusText} onStartOver={startOver} />
            {thread}
            {composer}
          </section>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[#FBF7F0] px-4 pb-28 pt-5 text-stone-800" inert={open}>
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {topBar}
          {desk}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {view.chips.map((c) => (
              <button
                key={c}
                onClick={() => askFromHome(c)}
                disabled={pending}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-stone-700 hover:border-teal-600 hover:text-teal-700 disabled:opacity-50"
              >
                {s.chips[c]}
              </button>
            ))}
          </div>
          <InfoCards view={view} requests={requests} s={s} lang={lang} />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-stone-900/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            aria-hidden
          />
        )}
        {open && (
          <motion.section
            key="chat"
            ref={dialog}
            tabIndex={-1}
            layoutId="chat-card"
            transition={CARD_SPRING}
            role="dialog"
            aria-modal="true"
            aria-label={s.home.chatWith}
            className="fixed inset-x-2 bottom-2 top-2 z-50 mx-auto flex max-w-xl flex-col bg-[#FBF7F0] shadow-2xl outline-none sm:inset-x-4 sm:bottom-4 sm:top-4"
            style={{ borderRadius: 28 }}
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.18 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <ChatHeader
                s={s}
                centerName={view.center.name}
                statusText={statusText}
                avatar={<span className="h-12 w-12 shrink-0 rounded-full bg-[#F6EBD9]" aria-hidden />}
                onStartOver={startOver}
                onClose={closeChat}
              />
              {thread}
              {composer}
            </motion.div>
            {/* Maple sits over the avatar circle, outside the fade, so she is visible the whole way from the desk. */}
            <div className="pointer-events-none absolute left-4 top-3 h-12 w-12">{mapleFigure}</div>
          </motion.section>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          layoutId="chat-card"
          transition={CARD_SPRING}
          onClick={() => openChat({ focus: true })}
          className="fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),16px)] z-30 mx-auto flex h-14 max-w-xl items-center gap-3 bg-white px-5 text-left text-[15px] text-stone-500 shadow-lg ring-1 ring-stone-200"
          style={{ borderRadius: 28 }}
        >
          <motion.span className="flex flex-1 items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }}>
            <MessageCircle size={20} className="text-teal-700" />
            {s.home.ask}
          </motion.span>
        </motion.button>
      )}
    </MotionConfig>
  );
}
