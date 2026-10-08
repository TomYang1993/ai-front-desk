"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, CircleAlert, Languages, LoaderCircle, Send, Sparkles } from "lucide-react";
import type { InboxItem } from "@/lib/console-view";
import { ago, LANGUAGE, post } from "./shared";

/** Questions anyone might ask again. Replies about one family's child, pickup or safety stay private. */
const GENERAL_REASONS = new Set(["Not covered by the handbook", "Maple wasn't sure", "AI unavailable"]);

export function Inbox({ items, me, selectedId }: { items: InboxItem[]; me: { name: string; firstName: string }; selectedId: string | null }) {
  const [filter, setFilter] = useState<"open" | "answered">(() => (items.find((i) => i.id === selectedId)?.status ?? "open"));
  const [openId, setOpenId] = useState<string | null>(selectedId);
  const list = items.filter((i) => i.status === filter);
  const selected = items.find((i) => i.id === openId) ?? (openId ? null : list[0]) ?? null;
  const waiting = items.filter((i) => i.status === "open").length;

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-stone-900">Inbox</h1>
        <p className="text-sm text-stone-600">Questions Maple passed to staff. Urgent first, then whoever has waited longest.</p>
      </header>
      <div className="lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-6">
        <section className={`${openId ? "hidden lg:block" : ""}`} aria-label="Messages">
          <div className="mb-3 flex gap-2" role="tablist">
            {(["open", "answered"] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => {
                  setFilter(f);
                  setOpenId(null);
                }}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === f ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
              >
                {f === "open" ? `Waiting (${waiting})` : "Answered"}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
              {filter === "open" ? "Nothing waiting. Maple is handling the rest." : "No replies yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => setOpenId(i.id)}
                    aria-current={selected?.id === i.id}
                    aria-label={`${i.priority === "urgent" && i.status === "open" ? "Urgent. " : ""}${i.from}${i.childName ? `, ${i.childName}` : ""}: ${i.textEnglish ?? i.text}`}
                    className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm ${selected?.id === i.id ? "border-teal-600 bg-teal-50/60" : "border-stone-200 bg-white hover:border-stone-300"}`}
                  >
                    <span className="flex items-center gap-2 text-xs text-stone-500">
                      {i.priority === "urgent" && i.status === "open" && <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700 ring-1 ring-red-200">Urgent</span>}
                      {i.language !== "en" && <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-600">{LANGUAGE[i.language]}</span>}
                      <span className="ml-auto">{ago(i.status === "answered" && i.reply ? i.reply.at : i.createdAt)}</span>
                    </span>
                    <span className="mt-1 block font-bold text-stone-900">
                      {i.from}
                      {i.childName && <span className="font-normal text-stone-500"> · {i.childName}</span>}
                    </span>
                    <span className="line-clamp-2 block text-sm text-stone-700">{i.textEnglish ?? i.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${openId ? "" : "hidden lg:block"} mt-4 lg:mt-0`} aria-label="Message">
          {selected ? (
            <Detail key={selected.id} item={selected} me={me} onBack={() => setOpenId(null)} />
          ) : (
            <p className="rounded-3xl border border-dashed border-stone-300 p-10 text-center text-stone-500">Pick a message to read and reply.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({ item, me, onBack }: { item: InboxItem; me: { name: string; firstName: string }; onBack: () => void }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState("");
  const [drafted, setDrafted] = useState<string[] | null>(null);
  const parentFirst = item.from.split(" ")[0];
  const foreign = item.language !== "en";

  async function draft() {
    setBusy("draft");
    setError("");
    try {
      const d = await post<{ reply: string; notInSources: string[] }>(`/api/console/handoffs/${item.id}/draft`, {});
      setReply(d.reply);
      setDrafted(d.notInSources);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!reply.trim()) return;
    setBusy("send");
    setError("");
    try {
      await post(`/api/console/handoffs/${item.id}/reply`, { text: reply });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-semibold text-teal-700 lg:hidden">
        <ArrowLeft size={16} /> All messages
      </button>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900">{item.from}</h2>
          <p className="text-sm text-stone-500">
            {[item.childName && `${item.childName}${item.roomName ? `, ${item.roomName}` : ""}`, LANGUAGE[item.language], ago(item.createdAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {item.priority === "urgent" && item.status === "open" && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">Urgent</span>}
      </header>

      <p className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
        <CircleAlert size={16} className="shrink-0 text-amber-600" />
        <span>
          <span className="font-semibold text-stone-800">Why Maple handed this off:</span> {item.reason}.{" "}
          {item.to === "teacher" ? `It's for ${item.toName}.` : ""}
        </span>
      </p>

      <blockquote className="mt-4 rounded-2xl bg-[#FBF7F0] px-4 py-3 text-[15px] leading-relaxed text-stone-800">
        {item.text}
        {item.textEnglish && (
          <p className="mt-2 border-t border-stone-200 pt-2 text-sm text-stone-600">
            <span className="flex items-center gap-1 text-xs font-semibold text-stone-500">
              <Languages size={13} /> In English, translated by Maple
            </span>
            {item.textEnglish}
          </p>
        )}
      </blockquote>

      {item.status === "open" ? (
        <div className="mt-5">
          <label htmlFor="reply" className="text-sm font-bold text-stone-800">
            Your reply
          </label>
          <textarea
            id="reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder={`Write to ${parentFirst} in English.`}
            className="mt-1.5 w-full rounded-2xl border border-stone-300 px-4 py-3 text-[15px] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
          {drafted && <p className="mt-1 text-xs text-stone-500">Drafted by Maple from the handbook. Choose or fill in anything in [brackets] before sending.</p>}
          {drafted && drafted.length > 0 && (
            <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-semibold">Not in the handbook. Keep these only if they&apos;re true:</p>
              <ul className="mt-1 list-disc pl-5">
                {drafted.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {foreign && <p className="mt-1 text-xs text-stone-500">{parentFirst} will get it in {LANGUAGE[item.language]}, with your English one tap away.</p>}
          {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={draft} disabled={busy !== null} className="flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">
              {busy === "draft" ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Draft with Maple
            </button>
            <button onClick={send} disabled={busy !== null || !reply.trim()} className="flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-40">
              {busy === "send" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              Send to {parentFirst}
            </button>
          </div>
        </div>
      ) : (
        item.reply && (
          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-sm font-bold text-teal-800">
              <CheckCircle2 size={16} /> {item.reply.by === me.name ? "You replied" : `${item.reply.by} replied`} · {ago(item.reply.at)}
            </p>
            <p className="mt-2 whitespace-pre-line rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-[15px] leading-relaxed">{item.reply.text}</p>
            {item.reply.translated && (
              <div className="mt-2 rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-600">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-stone-500">
                  <Languages size={13} /> What {parentFirst} sees, in {LANGUAGE[item.language]}
                </p>
                {item.reply.translated}
              </div>
            )}
            {GENERAL_REASONS.has(item.reason) && <SaveAsAnswer item={item} />}
          </div>
        )
      )}
    </article>
  );
}

/** The "answer once" step: turn this reply into an answer Maple gives every family. */
function SaveAsAnswer({ item }: { item: InboxItem }) {
  const router = useRouter();
  const [form, setForm] = useState<{ question: string; answer: string; keywords: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (item.savedAnswerId) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
        <Check size={16} />
        <span>
          Saved as an answer. Maple gives it to every family from now on.{" "}
          <Link href="/console?tab=knowledge" className="font-semibold underline">
            See it in Knowledge
          </Link>
        </span>
      </p>
    );
  }

  async function startDraft() {
    setBusy(true);
    setError("");
    try {
      const d = await post<{ question: string; answer: string; keywords: string[] }>("/api/console/answers/draft", { handoffId: item.id });
      setForm({ question: d.question, answer: d.answer, keywords: d.keywords.join(", ") });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/console/answers", {
        question: form.question,
        answer: form.answer,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        fromHandoffId: item.id,
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-dashed border-teal-700/40 p-4">
      <p className="font-bold text-stone-900">Will other families ask this too?</p>
      <p className="text-sm text-stone-600">Save it as an answer, and Maple answers it next time without coming to you.</p>
      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {!form ? (
        <button onClick={startDraft} disabled={busy} className="mt-3 flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Save as an answer for everyone
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-stone-500">Maple drafted this without any family&apos;s names. Edit anything before saving.</p>
          <Field label="Question" value={form.question} onChange={(v) => setForm({ ...form, question: v })} />
          <Field label="Answer" value={form.answer} onChange={(v) => setForm({ ...form, answer: v })} rows={4} />
          <Field label="Words parents might use, separated by commas" value={form.keywords} onChange={(v) => setForm({ ...form, keywords: v })} />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !form.question.trim() || !form.answer.trim()} className="flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-40">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              Save answer
            </button>
            <button onClick={() => setForm(null)} disabled={busy} className="rounded-full px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const cls = "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-[15px] font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
  return (
    <label className="text-sm font-semibold text-stone-700">
      {label}
      {rows ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cls} /> : <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />}
    </label>
  );
}
