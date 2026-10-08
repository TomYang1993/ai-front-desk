"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, Languages, LoaderCircle, RotateCcw, SendHorizontal, UserRound } from "lucide-react";
import type { Lang } from "@/content/types";
import type { Action, AskReply, ChipId } from "@/lib/engine/types";
import type { Strings } from "@/lib/i18n";
import { ReplyCard, type ActionResult } from "./reply-card";

/** A staff reply to one of the family's handoffs, in their language when it isn't English. */
export interface StaffReply {
  by: string;
  text: string;
  original: string | null;
}

/** Staff appear as people, never as Maple, so it's always clear who is AI and who is human. */
function StaffBubble({ reply, s }: { reply: StaffReply; s: Strings }) {
  const [showOriginal, setShowOriginal] = useState(false);
  return (
    <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] leading-relaxed shadow-sm">
      <p className="mb-1 text-xs font-bold text-amber-900">{reply.by}</p>
      <p className="whitespace-pre-line">{showOriginal && reply.original ? reply.original : reply.text}</p>
      {reply.original && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-900/70">
          <Languages size={13} aria-hidden />
          {s.board.translated} ·{" "}
          <button onClick={() => setShowOriginal((o) => !o)} className="font-semibold underline-offset-2 hover:underline">
            {showOriginal ? s.board.showTranslation : s.board.showOriginal}
          </button>
        </p>
      )}
    </div>
  );
}

export type ChatItem =
  | { kind: "greeting"; id: string }
  | { kind: "parent"; id: string; text: string }
  | { kind: "reply"; id: string; reply: AskReply }
  | { kind: "error"; id: string };

/** Maple's name, the AI label and what she is doing. `avatar` reserves room for Maple on phones. */
export function ChatHeader({
  s,
  centerName,
  statusText,
  avatar,
  onStartOver,
  onClose,
}: {
  s: Strings;
  centerName: string;
  statusText: string;
  avatar?: ReactNode;
  onStartOver: () => void;
  onClose?: () => void;
}) {
  return (
    <header className="flex items-center gap-3 rounded-t-[28px] border-b border-stone-200 bg-white/90 px-4 py-3">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 font-bold text-stone-900">
          Maple <span className="truncate text-xs font-semibold text-teal-700">{s.aiLabel}</span>
        </p>
        <p className="truncate text-xs text-stone-500" aria-live="polite">
          {centerName} · {statusText}
        </p>
      </div>
      <button onClick={onStartOver} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label={s.startOver} title={s.startOver}>
        <RotateCcw size={18} />
      </button>
      {onClose && (
        <button onClick={onClose} className="rounded-full bg-stone-100 p-2 text-stone-600 hover:bg-stone-200" aria-label={s.home.close} title={s.home.close}>
          <ChevronDown size={20} />
        </button>
      )}
    </header>
  );
}

export function ChatThread({
  items,
  greeting,
  s,
  lang,
  done,
  feedback,
  staffReplies,
  pending,
  statusText,
  scroller,
  onAction,
  onOption,
  onFeedback,
  dish,
}: {
  items: ChatItem[];
  greeting: string;
  s: Strings;
  lang: Lang;
  done: Record<string, Record<number, ActionResult>>;
  feedback: Record<string, "up" | "down">;
  staffReplies: Map<string, StaffReply>;
  pending: boolean;
  statusText: string;
  scroller: RefObject<HTMLDivElement | null>;
  onAction: (itemId: string, index: number, action: Action, extra?: { slotId?: string; name?: string }) => void;
  onOption: (text: string) => void;
  onFeedback: (itemId: string, logId: string, value: "up" | "down") => void;
  dish: (name: string) => string;
}) {
  return (
    <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
      {items.map((item) => {
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
              done={done[item.id] ?? {}}
              onAction={(i, a, extra) => onAction(item.id, i, a, extra)}
              onOption={onOption}
              feedback={feedback[item.id]}
              onFeedback={(v) => onFeedback(item.id, item.reply.logId, v)}
              dish={dish}
            />
            {staff && <StaffBubble reply={staff} s={s} />}
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
  );
}

export function Composer({
  s,
  chips,
  pending,
  input,
  textarea,
  onInput,
  onFocusChange,
  onSend,
  person,
}: {
  s: Strings;
  chips: ChipId[];
  pending: boolean;
  input: string;
  textarea: RefObject<HTMLTextAreaElement | null>;
  onInput: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  onSend: (opts: { text?: string; chip?: ChipId }) => void;
  /** The always-visible way to reach the director, bypassing Maple. */
  person: { directorName: string; prefill: () => string; onSend: (text: string) => Promise<boolean> };
}) {
  const [personText, setPersonText] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const first = person.directorName.split(" ")[0];

  async function sendToPerson() {
    if (!personText?.trim()) return;
    setSending(true);
    const ok = await person.onSend(personText.trim());
    setSending(false);
    if (ok) setPersonText(null);
  }

  return (
    <div className="rounded-b-[28px] border-t border-stone-200 bg-white/90 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => setPersonText((t) => (t === null ? person.prefill() : null))}
          aria-expanded={personText !== null}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${personText !== null ? "bg-amber-100 text-amber-900 ring-amber-300" : "bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100"}`}
        >
          <UserRound size={15} aria-hidden />
          {s.person.button}
        </button>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 pt-1">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onSend({ chip: c })}
            disabled={pending}
            className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm font-semibold text-stone-700 hover:border-teal-600 hover:text-teal-700 disabled:opacity-50"
          >
            {s.chips[c]}
          </button>
        ))}
        </div>
      </div>
      {personText !== null ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">{s.person.direct(person.directorName)}</p>
          <label className="mt-1 block text-sm font-semibold text-stone-800">
            {s.person.prompt(first)}
            <textarea
              value={personText}
              onChange={(e) => setPersonText(e.target.value)}
              rows={3}
              maxLength={1000}
              autoFocus
              className="mt-1 w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-[15px] font-normal outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button onClick={sendToPerson} disabled={sending || !personText.trim()} className="flex items-center gap-1.5 rounded-full bg-amber-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-40">
              {sending ? <LoaderCircle size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
              {s.person.send(first)}
            </button>
            <button onClick={() => setPersonText(null)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-white">
              {s.person.cancel}
            </button>
          </div>
        </div>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend({ text: input });
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={textarea}
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend({ text: input });
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
      )}
    </div>
  );
}
