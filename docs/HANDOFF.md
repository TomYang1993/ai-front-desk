# Handoff: where the project stands

Last updated October 7, 2026. Read this first in a new session, then `docs/PLAN.md` and `docs/SCENARIOS.md`.

## Status

| Item | State |
|---|---|
| Live site | https://ai-front-desk-xi.vercel.app, deployed from `main` |
| Repo | https://github.com/TomYang1993/ai-front-desk |
| `main` | Phases 0 to 2 and the Groq provider, merged through pull requests #1 and #2 |
| `phase-3-parent-app` | Phase 3 is done, in pull request #3: sign-in, removing visitor mode, the front desk home, Maple version 2, and the finishing pass |

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
- "Mateo tiene tos y no va a ir mañana" (a cough plus an absence) is read as an illness question the engine can't settle, so it goes to the director instead of offering the absence button. A plain absence message works. Fixing it means changing how messages are classified, so check the scorecard afterwards.
- Source chips, such as "Attendance and absences", show the handbook's English section titles. That's by design for now: sources stay in the original.

## Sign-in, redesign step 1

- `/signin` has an email and password form and a "Demo accounts" panel that signs in with one click. On phones, a link under the button jumps to the panel.
- The session is a signed, httpOnly cookie, `afd_session`, holding the role, center, family or staff id and an expiry of 7 days. Signing uses HMAC with Web Crypto in `src/lib/session-token.ts`, shared with the proxy. Server helpers are in `src/lib/session.ts`; the sign-in and sign-out actions are in `src/lib/auth-actions.ts`.
- `SESSION_SECRET` sets the signing key. Without it, a fixed demo key is used, which is acceptable only because every account is public. It is not yet set in Vercel.
- `src/proxy.ts` sends signed-out people to `/signin`, parents to `/` and directors to `/console`. `/status` stays public. API routes check the session themselves.
- `/` is the signed-in parent's front desk. The old `/parent/[centerId]/[familyId]` route and the family picker are gone.
- `/console` is a placeholder with sign-out until Phase 4.
- Sign-out sits in the chat header and clears the conversations stored in the browser.
- Checked in the browser: one-click and password sign-in, a wrong password, sign-out, parent and director redirects, a request body naming another family is ignored, a director gets 401 from the parent APIs, a forged cookie is rejected, and the page at phone width.

## Visitor mode removed, redesign step 2

- The parent app always has a family: `ParentView.family` is no longer optional, and the visitor greeting, visitor chips and visitor id tracking are gone.
- The client no longer sends `centerId` or `familyId`; every parent API reads them from the session.
- `/api/requests` serves enrolled families only and no longer takes visitor `ids`.
- Kept on purpose: the engine still answers visitors, and `/api/actions` still books tours, because the engine offers tour times to enrolled parents too, for example for a friend or relative. The tour time picker in the reply card stays.

## Front desk home, redesign step 3

- Motion is pinned at 13.4.1, the newest release at least two weeks old. Its `framer-motion`, `motion-dom` and `motion-utils` dependencies use caret ranges, so `overrides` in `package.json` pins them too. Import from `motion/react`.
- Components: `desk-scene.tsx` draws the desk, `info-cards.tsx` holds the cards (formerly the notice board), `chat.tsx` has the chat header, thread and composer, and `front-desk.tsx` owns the state and both layouts. `lobby.tsx` and `notice-board.tsx` are gone.
- Phones and tablets, below 1024 px: a greeting bar with sign-out, the desk scene with Maple and a speech bubble, quick chips, and the cards. A fixed "Ask Maple" pill sits at the bottom. Tapping Maple, the bubble, a chip or the pill opens the chat card. The pill and the card share `layoutId="chat-card"`, and Maple moves between the desk and the card header with `layoutId="maple"`. Maple's header copy sits outside the card's fading content so she stays visible in flight, and she gets a raised z-index while flying back to the desk. While the card is open, the page behind is `inert` and can't scroll, Escape closes the card, and focus moves into it. Only the pill focuses the text box, because focusing it opens the phone keyboard.
- Laptops, 1024 px and up: the desk and cards in two columns on the left, and the chat docked on the right. Maple stays at the desk, and her bubble shows what she's doing.
- When staff reply, Maple's bubble on phones turns amber and says who replied. Seen replies are stored with the chat; opening the chat or having it visible marks them seen.
- The desk window shows each city: the Sandias and balloons for Albuquerque, rain and evergreens for Seattle. The director's door shows the director's first name and lights up during a handoff.
- `MotionConfig reducedMotion="user"`, plus CSS rules that stop the window and Maple animations for people who prefer reduced motion.
- Checked in the browser at phone and laptop sizes. The pane was hidden, so the motion was checked by sampling positions every 40 ms: Maple travels from the desk to the header in about 300 ms and back, and the card grows from the pill and shrinks back into it. Also checked: chips, the pill, Escape, the scroll lock, `inert`, the unread-reply bubble (with a patched `fetch`), Mandarin and the Seattle window, and no sideways scrolling.

## Maple version 2, redesign step 4

- `src/components/maple.tsx` is redrawn with gradients for soft shading, highlights on the nose and eyes, a belly patch, feet, brows, an "M" name tag and the handbook in the apron pocket. The interface is unchanged: `<Maple state size label />`.
- Separately animated parts: body, shadow, head, each ear, eyes, brows, both arms, the open handbook with a turning page, the reading glasses, and the phone. Each pivots at a fixed point in the 200 x 200 drawing.
- Gotcha: Motion ignores `transformOrigin` in `style` for SVG and builds it from `originX` and `originY`. The `at(x, y)` helper sets those with `transformBox: "view-box"`.
- States: ready (breathing, blinking, an occasional ear twitch), listening (ears perk, head tilts, brows lift), thinking (glasses, the open book held in both paws, a turning page), handoff (phone at her cheek, eyes glancing toward the director's door), done (a happy hop and a nod, happy eyes, arms out), calm (still, closed soft eyes, concerned brows, paw on chest), and the new wave.
- The wave plays when the front desk loads, when Maple arrives in the chat card (not when a chip opened it, and not while she's busy or in calm mode), and on the sign-in page.
- With reduced motion, Maple uses `useReducedMotion` and shows each state's still pose with no loops. Her old CSS animations are removed.
- Checked in a temporary gallery of all states, now removed, and on the desk, in the chat header and on the sign-in page. Sampled the wave's arm angles over time and re-checked the desk-to-card flight. The hidden pane throttles animation frames, so the 0.8-second hop was only seen at its start and end.

## Finishing pass, redesign step 5

- **Cards in the family's language.** `parent-view.ts` builds the cards in the family's language. Fixed wording comes from `i18n.ts`: dates, times (`formatClock`), open status, hours, menu labels, ages, the child line, allergy names and the desk labels. Staff-written text (dish names, closure names, notices) goes through `translateList` in `engine/translate.ts`: one call to the large model per center, language and set of texts, cached for a week under `translate:v3:`. The small model mistranslated a notice, turning "the wet season" into summer. It gives up after 6 seconds and falls back to English, and any item whose numbers change stays in English. Translated text is marked "Translated by Maple", with a "show original" toggle on the closure and notices.
- **Spanish register.** Translations, including Maple's replies, now use the formal "usted" to match the interface.
- **Action strings.** The lunch, tour and Mandarin absence strings no longer fall back to English. `view.dishes` maps English dish names to translations for the lunch button, its confirmation and the requests card.
- **Absences after closing.** With no date given, an absence defaults to today only while the center is open or before it opens; otherwise it goes to the next open day. `/api/actions` refuses days that are already over, with code `day_over`.
- **Backup lunch cutoff.** `/api/actions` now enforces the 10:30 am cutoff (`BACKUP_LUNCH_CUTOFF` in `facts/menu.ts`, shared with the engine), with code `lunch_closed`. The app shows specific messages for both codes. `/api/actions` takes the same `demoNow` test clock as `/api/ask` outside production.
- **Reset protection.** `POST /api/admin/reset` needs a signed-in director in production; locally it stays open.
- **The 404 on first load** no longer happens on a fresh load. It was most likely the old family-picker route.
- **Saved-answer guard.** At the scorecard's test time, the Groq intake model answered "How much is infant care?" with the saved parking answer (scenario 9). In English, a saved answer is now used only when the message contains one of its keywords; other languages still trust the model, so the Spanish "answer once" path isn't blocked.
- **Scorecard** on October 7: 28 passed, scenario 15 pending until Phase 4. Scenario 26 fails only because of local test data: a backup lunch ordered for Priya with the test clock is now her newest $8 charge. `POST /api/admin/reset` clears it, but the local data is shared with other sessions, so it wasn't reset.
- **Checked at phone size:** Rosa's Spanish home and the "show original" toggle; logging an absence in Spanish, including a stale button being refused; Priya's backup-lunch button and the after-cutoff message. The successful lunch order was checked with curl and the test clock.

## Next steps

Decided with the user; details in `docs/PLAN.md`, "Phase 3 redesign."

Phase 3, all done:

1. **Done: simulated sign-in.** A `/signin` page with an email and password form, plus a labeled "Demo accounts" panel for Ana, Rosa, Priya, Wei, Elena and Hannah. Store the role, center and family or staff id in an httpOnly session cookie. Protect app routes with `proxy.ts`. Derive the family from the session, never from the URL. Add sign-out. Directors go to `/console`, which is Phase 4.
2. **Done: remove visitor mode from the interface.** Keep engine support for visitors.
3. **Done: front desk home.** The animated desk scene with Maple is the hero, with information cards. Tapping Maple opens the chat card with a Motion shared-layout animation, Maple acts out states in the chat header, and closing it returns her to the desk. Laptops keep the desk and cards visible with the chat docked.
4. **Done: Maple version 2.** Redraw the SVG with more polish and separately animated parts. Animate with Motion springs and add wave and hop moments. Keep the `<Maple state size />` interface, and respect reduced-motion settings. Pick a Motion version at least two weeks old, and read its current docs.
5. **Done: finish Phase 3.** Test the action buttons at phone size, fix the known gaps, run all checks, and open the pull request.

Then Phase 4, the director console: an inbox with the "answer once" loop, insights, a knowledge editor, a test box and setup from a pasted handbook. Scenario 15 becomes testable then.
