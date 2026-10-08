# Handoff: where the project stands

Last updated October 7, 2026. Read this first in a new session, then `docs/PLAN.md` and `docs/SCENARIOS.md`.

## Status

| Item | State |
|---|---|
| Live site | https://ai-front-desk-xi.vercel.app, deployed from `main` |
| Repo | https://github.com/TomYang1993/ai-front-desk |
| `main` | Phases 0 to 2 and the Groq provider, merged through pull requests #1 and #2 |
| `phase-3-parent-app` | Pushed, no pull request yet. First version of the parent app, now being redesigned. Redesign step 1, sign-in, is done |

## How we work

- One branch per phase, pushed with a pull request. The user reviews and merges, or asks me to merge.
- Commit messages end with the `Co-Authored-By` trailer the session provides.
- All centers, families and data are fictional.
- This version of Next.js has breaking changes. Read the guides in `node_modules/next/dist/docs/` before using an API; see `AGENTS.md`. For example, middleware is now `proxy.ts`, and route params are promises typed with the global `PageProps` and `RouteContext` helpers. After adding a route, run `npx next typegen`.

## Running and testing

- Node 24 is pinned with Volta. `npm run dev` also converts the Markdown handbooks into code.
- The browser pane's launch config lives in the parent folder: `/Users/yxyxtx/code/.claude/launch.json`, server name `ai-front-desk`. It uses `autoPort`, but Next allows only one dev server per folder, so if another session already runs one, open `http://localhost:3000` in the pane instead.
- Environment variables come from Vercel: `npx vercel env pull .env.local --yes`. Never print key values.
- AI providers: Groq first, then Gemini. Groq's free tier allows 1,000 requests a day and 8,000 tokens a minute per model. Gemini's free tier can be as low as 20 requests a day per model. Avoid unnecessary AI calls; button questions cost nothing.
- Local data lives in the shared Redis under the `afd:local:` prefix, separate from production. Reset it with `POST /api/admin/reset`.
- Checks: `npm run typecheck`, `npm run lint`, `npm run check:content`, `npm run build`.
- Scorecard: `npm run scorecard`, or `npm run scorecard -- 4 21` for specific scenarios. `PACE_MS` spaces requests; `SCORECARD_SMALL` and `SCORECARD_LARGE` pick models. Reports go to the git-ignored `scorecard-results/` folder.
- Health: `/api/health?live=all&provider=groq` calls each Groq model once.
- Test controls on `/api/ask`, ignored in production: `demoNow`, `simulateOutage`, `noCache`, `models`.
- Sign-in: every demo account uses the password `maple-demo`, listed in `src/content/accounts.ts`. Parent APIs take the family from the session. Outside production, a request with no session may still name `centerId` and `familyId` in the body, which is how the scorecard and curl tests work.

## What the first parent app has (on the Phase 3 branch)

Working and checked in the browser:
- Parent chat with Maple's states, reply cards with sources, action buttons, handoff and calm styling, and feedback.
- English, Spanish and Mandarin interface text, chosen by the family's language.
- A laptop layout with a lobby scene and a notice board.
- Endpoints: `/api/actions` for absences, backup lunches and tours, `/api/feedback`, and `/api/requests`. Staff replies to a family's handoffs show inline in the chat.
- Engine fixes: "last night" and "yesterday" pin symptom times to the previous day, symptom times can't be in the future, and after-hours wording no longer says "Not today."

Known gaps:
- The absence and backup lunch buttons haven't been tested at phone size.
- The children list on the notice board says "with" in English for all languages, and the board's data, such as menus, is English for Spanish and Mandarin families.
- One unidentified 404 appeared in the dev console on first load.
- `POST /api/admin/reset` has no protection, so anyone can reset the live data. Limit it to directors or to non-production.
- The client still sends `centerId` and `familyId` in request bodies. Signed-in requests ignore them; step 3 can drop them.

## Sign-in, redesign step 1

- `/signin` has an email and password form and a "Demo accounts" panel that signs in with one click. On phones, a link under the button jumps to the panel.
- The session is a signed, httpOnly cookie, `afd_session`, holding the role, center, family or staff id and an expiry of 7 days. Signing uses HMAC with Web Crypto in `src/lib/session-token.ts`, shared with the proxy. Server helpers are in `src/lib/session.ts`; the sign-in and sign-out actions are in `src/lib/auth-actions.ts`.
- `SESSION_SECRET` sets the signing key. Without it, a fixed demo key is used, which is acceptable only because every account is public. It is not yet set in Vercel.
- `src/proxy.ts` sends signed-out people to `/signin`, parents to `/` and directors to `/console`. `/status` stays public. API routes check the session themselves.
- `/` is the signed-in parent's front desk. The old `/parent/[centerId]/[familyId]` route and the family picker are gone.
- `/console` is a placeholder with sign-out until Phase 4.
- Sign-out sits in the chat header and clears the conversations stored in the browser.
- Checked in the browser: one-click and password sign-in, a wrong password, sign-out, parent and director redirects, a request body naming another family is ignored, a director gets 401 from the parent APIs, a forged cookie is rejected, and the page at phone width.

## Next steps: the Phase 3 redesign

Decided with the user; details in `docs/PLAN.md`, "Phase 3 redesign."

1. **Done: simulated sign-in.** A `/signin` page with an email and password form, plus a labeled "Demo accounts" panel for Ana, Rosa, Priya, Wei, Elena and Hannah. Store the role, center and family or staff id in an httpOnly session cookie. Protect app routes with `proxy.ts`. Derive the family from the session, never from the URL. Add sign-out. Directors go to `/console`, which is Phase 4.
2. **Remove visitor mode from the interface.** Keep engine support for visitors.
3. **Front desk home.** The animated desk scene with Maple is the hero, with information cards. Tapping Maple opens the chat card with a Motion shared-layout animation, Maple acts out states in the chat header, and closing it returns her to the desk. Laptops keep the desk and cards visible with the chat docked.
4. **Maple version 2.** Redraw the SVG with more polish and separately animated parts. Animate with Motion springs and add wave and hop moments. Keep the `<Maple state size />` interface, and respect reduced-motion settings. Pick a Motion version at least two weeks old, and read its current docs.
5. **Finish Phase 3.** Test the action buttons at phone size, fix the known gaps, run all checks, and open the pull request.

Then Phase 4, the director console: an inbox with the "answer once" loop, insights, a knowledge editor, a test box and setup from a pasted handbook. Scenario 15 becomes testable then.
