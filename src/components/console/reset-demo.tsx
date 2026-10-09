"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { goTo } from "./console-link";
import { post } from "./shared";

/**
 * Puts both centers back to their starting state, for a fresh demo or another take of the video.
 * Asks first, because it clears every reply, edit and booking made since the last reset.
 */
export function ResetDemo() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reset() {
    setBusy(true);
    setError("");
    try {
      await post("/api/admin/reset", {});
      setConfirming(false);
      // The new seed time remounts every tab, so nothing from before the reset stays open.
      goTo("/console?tab=inbox");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-stone-500 hover:bg-stone-100"
      >
        <RotateCcw size={14} /> Reset demo data
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby="reset-title" className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p id="reset-title" className="font-bold">Reset the demo?</p>
      <p className="mt-1 text-amber-900">
        Both centers go back to where they started: the waiting questions, history, handbooks and saved answers. Replies, edits, bookings and absences
        made since are cleared. Parents&apos; chats stay on their phones until they sign out.
      </p>
      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={13} className="animate-spin" /> : <RotateCcw size={13} />} Reset demo
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
