@AGENTS.md

## Project notes

- Start with `docs/HANDOFF.md` for current status and next steps. The agreed build plan is `docs/PLAN.md`. Behavior scenarios and the test set are in `docs/SCENARIOS.md`.
- All centers, families and data are fictional. Never add real personal data.
- Server-only modules live in `src/lib` and import `server-only`. The AI adapter is `src/lib/llm.ts`, with provider calls in `src/lib/providers.ts`; storage is `src/lib/store.ts`.
