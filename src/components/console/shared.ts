import type { Lang } from "@/content/types";

export const TABS = ["inbox", "overview", "source", "test"] as const;
export type Tab = (typeof TABS)[number];

export const LANGUAGE: Record<Lang, string> = { en: "English", es: "Spanish", zh: "Mandarin", hi: "Hindi" };

/** "12 min ago", "3 hours ago", "Yesterday" or "Oct 5". */
export function ago(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Sends JSON to a console route and returns the parsed body, or throws with the server's message. */
export async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data as T;
}
