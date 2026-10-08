"use client";

import { useState } from "react";
import { FlaskConical, LoaderCircle, Send } from "lucide-react";
import type { Lane } from "@/content/types";
import type { AskReply } from "@/lib/engine/types";
import { LANGUAGE, post } from "./shared";
import type { Lang } from "@/content/types";

const STEP: Record<Lane, string> = {
  safety: "Safety check, no AI",
  quick_facts: "Center data, no AI",
  understand: "Read the message (AI)",
  lookup: "Looked it up in center data",
  handbook: "Read the handbook (AI)",
  double_check: "Double-checked against the sources (AI)",
  person: "Passed to a person",
};

const MODE: Record<AskReply["mode"], string> = {
  answer: "Answered",
  clarify: "Asked a question back",
  declined: "Declined",
  handoff: "Would pass to staff",
  urgent: "Would pass to staff right away",
  emergency: "Emergency guidance",
};

/** Ask as any family and see what Maple would say. Nothing is logged or sent to staff. */
export function TestBox({ families, centerName }: { families: { id: string; label: string; language: Lang }[]; centerName: string }) {
  const [familyId, setFamilyId] = useState(families[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ question: string; reply: AskReply } | null>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError("");
    try {
      const reply = await post<AskReply>("/api/console/test", { familyId, message });
      setResult({ question: message, reply });
      setOpenSource(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const r = result?.reply;
  const source = r?.sources.find((s) => s.id === openSource);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Test Maple</h1>
        <p className="text-sm text-stone-600">
          Ask as one of {centerName}&apos;s families to check an answer after editing the handbook. Nothing is logged, cached or sent to staff.
        </p>
      </header>

      <form onSubmit={ask} className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-stone-700">
          Ask as
          <select value={familyId} onChange={(e) => setFamilyId(e.target.value)} className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-[15px] font-normal">
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
                {f.language !== "en" ? `, ${LANGUAGE[f.language]}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-stone-700">
          Question
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Are you open on Veterans Day?"
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-[15px] font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy || !message.trim()} className="flex items-center gap-1.5 self-start rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-40">
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} Ask Maple
        </button>
      </form>

      {r && result && (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" aria-live="polite">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
            <FlaskConical size={14} /> Test answer · {MODE[r.mode]}
          </p>
          <p className="mt-1 text-sm text-stone-500">&ldquo;{result.question}&rdquo;</p>
          <p className="mt-3 whitespace-pre-line rounded-2xl bg-[#FBF7F0] px-4 py-3 text-[15px] leading-relaxed text-stone-800">{r.text}</p>

          {r.handoff && <p className="mt-3 text-sm text-stone-700">In real use, this would go to {r.handoff.staffName}. Nothing was sent.</p>}
          {r.actions.length > 0 && (
            <p className="mt-2 text-sm text-stone-700">
              Maple would offer:{" "}
              {r.actions
                .map((a) => (a.type === "log_absence" ? `log ${a.childName}'s absence` : a.type === "order_backup_lunch" ? `a backup lunch for ${a.childName}` : a.type === "book_tour" ? "tour times" : `a button to call ${a.phone}`))
                .join(", ")}
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">How Maple got there</p>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm text-stone-700">
                {r.lanes.map((l) => (
                  <li key={l}>{STEP[l]}</li>
                ))}
                {r.language !== "en" && r.models.length > 0 && <li>Translated into {LANGUAGE[r.language]} (AI)</li>}
              </ol>
              <p className="mt-2 text-xs text-stone-500">
                {r.tokens ? `${r.tokens.toLocaleString()} AI tokens` : "No AI tokens"} · {(r.ms / 1000).toFixed(1)} s
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Sources</p>
              {r.sources.length === 0 ? (
                <p className="mt-1.5 text-sm text-stone-500">None</p>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.sources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setOpenSource(openSource === s.id ? null : s.id)}
                      aria-expanded={openSource === s.id}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${openSource === s.id ? "bg-teal-700 text-white ring-teal-700" : "bg-teal-50 text-teal-800 ring-teal-200"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {source?.excerpt && <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-line rounded-xl bg-stone-50 p-3 text-xs text-stone-600">{source.excerpt}</p>}
        </section>
      )}
    </div>
  );
}
