"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Lock, Pencil, Trash2 } from "lucide-react";
import type { KnowledgeView } from "@/lib/console-view";
import { Field } from "./inbox";
import { post } from "./shared";

const used = (n: number) => (n === 0 ? "Not used this week" : `Used in ${n} answer${n === 1 ? "" : "s"} this week`);
const updated = (by: string, at: string) => `Updated ${new Date(`${at.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} by ${by}`;

/** What Maple answers from. Edits take effect on the next question. */
export function Knowledge({ knowledge: k }: { knowledge: KnowledgeView }) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Knowledge</h1>
        <p className="text-sm text-stone-600">Everything Maple answers from. Changes take effect on the next question.</p>
      </header>

      <section>
        <h2 className="font-extrabold text-stone-900">Saved answers</h2>
        <p className="mb-3 text-sm text-stone-500">Answers you wrote once from the inbox. Maple gives them to any family who asks the same thing.</p>
        {k.saved.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">No saved answers yet. Reply to a question in the inbox, then save it.</p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {k.saved.map((a) => (
              <SavedAnswerCard key={a.id} answer={a} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-extrabold text-stone-900">Family handbook</h2>
        <p className="mb-3 text-sm text-stone-500">Maple reads these sections for anything the tables below don&apos;t answer.</p>
        <ul className="flex flex-col gap-2">
          {k.sections.map((s) => (
            <SectionRow key={s.id} section={s} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-extrabold text-stone-900">Center data</h2>
        <p className="mb-3 flex items-center gap-1.5 text-sm text-stone-500">
          <Lock size={14} /> Read-only for now. Maple answers dates, prices and menus from these, without AI.
        </p>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {k.tables.map((t) => (
            <li key={t.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="font-bold text-stone-900">{t.label}</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-stone-700">
                {t.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-stone-500">
                {updated(t.updatedBy, t.updatedAt)} · {used(t.uses)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SavedAnswerCard({ answer: a }: { answer: KnowledgeView["saved"][number] }) {
  const router = useRouter();
  const [form, setForm] = useState<{ question: string; answer: string; keywords: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      await post(`/api/console/answers/${a.id}`, { question: form.question, answer: form.answer, keywords: form.keywords.split(",").map((x) => x.trim()).filter(Boolean) }, "PATCH");
      setForm(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/console/answers/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't remove it");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {form ? (
        <div className="flex flex-col gap-3">
          <Field label="Question" value={form.question} onChange={(v) => setForm({ ...form, question: v })} />
          <Field label="Answer" value={form.answer} onChange={(v) => setForm({ ...form, answer: v })} rows={4} />
          <Field label="Words parents might use, separated by commas" value={form.keywords} onChange={(v) => setForm({ ...form, keywords: v })} />
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
              {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Save
            </button>
            <button onClick={() => setForm(null)} className="rounded-full px-4 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-bold text-stone-900">{a.question}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{a.answer}</p>
          {a.keywords.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1">
              {a.keywords.map((w) => (
                <span key={w} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {w}
                </span>
              ))}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-stone-500">
              {updated(a.savedBy, a.savedAt)} · {used(a.uses)}
            </p>
            <div className="flex gap-1">
              {confirming ? (
                <>
                  <button onClick={remove} disabled={busy} className="rounded-full bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50">
                    Remove it
                  </button>
                  <button onClick={() => setConfirming(false)} className="rounded-full px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100">
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setForm({ question: a.question, answer: a.answer, keywords: a.keywords.join(", ") })} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label={`Edit "${a.question}"`} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setConfirming(true)} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label={`Remove "${a.question}"`} title="Remove">
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
          {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </>
      )}
    </li>
  );
}

function SectionRow({ section: s }: { section: KnowledgeView["sections"][number] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      await post(`/api/console/handbook/${s.id}`, form, "PATCH");
      setForm(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block font-bold text-stone-900">{s.title}</span>
          <span className="block text-xs text-stone-500">
            {updated(s.updatedBy, s.updatedAt)} · {used(s.uses)}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-teal-700">{open ? "Close" : "Open"}</span>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-4 py-3">
          {form ? (
            <div className="flex flex-col gap-3">
              <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label="Text (Markdown)" value={form.body} onChange={(v) => setForm({ ...form, body: v })} rows={12} />
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              <div className="flex gap-2">
                <button onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
                  {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Save section
                </button>
                <button onClick={() => setForm(null)} className="rounded-full px-4 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="max-h-72 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-stone-700">{s.body}</p>
              <button onClick={() => setForm({ title: s.title, body: s.body })} className="mt-3 flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                <Pencil size={14} /> Edit section
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
