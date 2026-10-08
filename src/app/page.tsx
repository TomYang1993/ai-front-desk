import { connection } from "next/server";
import { hasRedis } from "@/lib/env";
import { configuredProviders, modelFor } from "@/lib/llm";

// Temporary setup page for Phase 0. Replaced by the parent app in Phase 3.
export default async function Home() {
  await connection();
  const items = [
    {
      label: "AI providers",
      ok: configuredProviders().length > 0,
      hint: "Add GEMINI_API_KEY or GROQ_API_KEY in Vercel, then pull the env vars",
    },
    {
      label: "Shared database",
      ok: hasRedis(),
      hint: "Optional locally. Add Upstash for Redis in Vercel, then pull the env vars",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <p className="text-sm text-neutral-500">Phase 0 · project setup</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">AI Front Desk</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        Piñon Grove Early Learning in Albuquerque and Quail Ridge Early Learning in Seattle.
        Fictional centers, fictional families.
      </p>

      <ul className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 p-4">
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                item.ok ? "bg-emerald-500" : "bg-amber-400"
              }`}
              aria-hidden
            />
            <div>
              <p className="font-medium">
                {item.label}: {item.ok ? "connected" : "not set up yet"}
              </p>
              {!item.ok && <p className="text-sm text-neutral-500">{item.hint}</p>}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-neutral-500">
        Providers: {configuredProviders().join(", ") || "none"}. First choices: {modelFor("small")} for
        understanding, {modelFor("large")} for the handbook. Run a live check at{" "}
        <a className="underline" href="/api/health?live=1">
          /api/health?live=1
        </a>
        .
      </p>
    </main>
  );
}
