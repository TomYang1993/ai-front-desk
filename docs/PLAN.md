# AI Front Desk: build plan

A brightwheel take-home prototype. Hosted on Vercel, presented in a two-minute video.

## 1. The pitch

> A front desk that knows your child, shows its sources, hands off when it should, and learns from every handoff.

Four behaviors carry the whole product:

1. **Knows the family.** Answers use data brightwheel already holds: child, classroom, allergies, pickup list, billing.
2. **Shows its sources.** Every answer cites the handbook section or table it came from, plus who last updated it and when. Dates, prices and menus come from structured data, never from model memory.
3. **Knows its limits.** Three response modes: answer, hand off to a named staff member with an expected reply time, or immediate human handoff for urgent and sensitive topics.
4. **Learns from every handoff.** The director's reply reaches the parent and, with one click, becomes a saved answer. The next parent gets it instantly.

Who we design for, from the brightwheel primer:

- **Director or owner.** Our operator. Usually the buyer. Runs a small independent business with no spare time.
- **Parents.** Anxious, caring, on their phones, already opening the parent app every day. Childcare is a top household expense.
- **Teachers.** Heaviest daily app users. Receive same-day child questions, but should not be interrupted for policy questions.

## 2. Scope

**In scope**
- Parent experience for five enrolled families, behind a simulated sign-in. Visitor mode is deferred; see the Phase 3 redesign.
- Operator console per center: overview, handoff inbox with the "answer once" loop, knowledge editor, test box.
- Two fictional centers in different regions with realistic local rules.
- Replies in the parent's language: English, Spanish, Mandarin, Hindi.
- A scorecard of tricky test questions run against the answer engine.
- Demo mode: parent phone and operator console side by side, for the video.

**Out of scope for now, candidates for the bonus**
- Voice, SMS and phone channels.
- "Network suggestions": draft an answer from how similar centers answered.
- Real login, roles, push notifications, brightwheel support tooling.
- Onboarding a new center by pasting its handbook. Dropped on October 7 in favor of debugging and organizing the app; see the build phases.

**Cut list if time runs short, in order**
1. Mandarin replies, keeping Spanish.
2. Knowledge test box.
3. Eight weeks of seeded history down to two.

## 3. The centers

All facts below become each center's own handbook and tables, stated as center policy with an "updated" date. The AI quotes the handbook, not live law.

| | Piñon Grove Early Learning | Quail Ridge Early Learning |
|---|---|---|
| City, time zone | Albuquerque, NM, Mountain | Seattle, WA, Pacific |
| Size, rooms | About 90 children. Infants, Toddlers, Twos, Preschool, Pre-K | About 70 children. Infants, Toddlers, Preschool, Pre-K |
| Hours | 7:00 am to 6:00 pm | 7:30 am to 6:00 pm |
| Infant tuition | Listed about $950/month. NM Child Care Assistance pays the full cost for qualifying families with no copay | About $2,600/month. Infant waitlist about a year, $100 non-refundable waitlist fee |
| Other money | No add-on fees for assistance families. Late pickups lead to a conference after three | Sibling discount 10%. Late pickup $1 per minute after 6:00. Working Connections subsidy accepted |
| Meals | Breakfast, lunch and snack provided through the federal food program. Nut-aware | Families pack lunch. Center provides snacks and milk. Backup lunch $8, with allergens listed |
| Fever rule | Stay home after a fever of 100.4°F or higher in the last 24 hours. Return after 24 hours fever-free without fever reducers | Stay home at 101°F or higher with other symptoms, per WA licensing. Return after 24 hours fever-free without fever reducers |
| Weather | Follows Albuquerque Public Schools: two-hour delay means opening at 9:00 with no breakfast. Sunscreen required | Outdoor play in the rain, rain suit and boots stay at school. AQI 101+ from wildfire smoke moves play indoors. Follows Seattle Public Schools snow closures and late starts |
| Veterans Day, Wed Nov 11 | **Open** | **Closed** |
| Other closures | Labor Day, Thanksgiving Thu and Fri, Dec 24 to Jan 1, MLK Day, Memorial Day, July 5, one staff training day | Labor Day, Veterans Day, Thanksgiving and Native American Heritage Day Nov 26 and 27, Dec 24 to Jan 1, MLK Day, Presidents Day, Memorial Day, Juneteenth observed Fri Jun 18, July 5 |
| Local life | Balloon Fiesta Oct 3 to 11, flexible drop-off until 9:30 that week. Indigenous Peoples' Day and Día de los Muertos in class | Lunar New Year in class. Grandparents often visit for months to help |
| Languages | English, Spanish | English, Mandarin, Hindi |
| Tours | Tue and Thu, 9:30 am and 4:00 pm | Wed 10:00 am, Fri 3:30 pm |
| Staff | Owner-director, assistant director for enrollment, lead teacher per room | Same structure |

Every center also has: pickup authorization rules, medication rules, illness exclusion list, allergy plans, custody documentation rules, a grievance path, and an emergency procedure. These drive the handoff rules.

## 4. Demo families

| Center | Parent | Children | Demonstrates |
|---|---|---|---|
| Piñon Grove | Ana Martínez | Mia, 3, Preschool, peanut allergy. Leo, 10 months, Infants | State-covered care, fever rule, peanut-safe lunch, choosing between two children |
| Piñon Grove | Rosa Chávez | Mateo, 4, Pre-K | Spanish. Halloween question that starts the "answer once" loop. Balloon Fiesta drop-off |
| Quail Ridge | Priya Raman | Anika, 2, Toddlers, dairy allergy | Backup lunch with allergy check and fee, rain gear, fever rule under WA policy |
| Quail Ridge | Wei Chen | Ethan, 4, Pre-K | Mandarin. Visiting grandparent not on the pickup list goes to staff |
| Quail Ridge | Meera Sharma | Kabir, 3, Preschool, egg allergy | Hindi. Fever rule under WA policy. Visiting grandmother is on the pickup list, yet pickup still goes to staff |

Visitor mode per center covers prospective families: tuition, waitlist, tours.

## 5. Planted scenarios

**Same question, different correct answers**
- "Are you open on Veterans Day?" Piñon Grove open, Quail Ridge closed.
- "I forgot to pack lunch." Piñon Grove: lunch is provided, here is Mia's peanut-safe meal. Quail Ridge: order a backup lunch, checked against Anika's dairy allergy, $8 added to the account.
- "What is infant tuition?" Piñon Grove: listed price plus the state program, without promising eligibility. Quail Ridge: price plus waitlist and fee.
- "100.6 this morning but acting fine." Piñon Grove: stay home, return time computed. Quail Ridge: may attend under policy if no other symptoms, teachers will call if anything changes.

**One-center moments**
- Halloween is Saturday Oct 31. "Can Mateo wear a costume Friday?" is not in the handbook, so it goes to the director. The director replies in English, Rosa receives it in Spanish, and the reply becomes a saved answer. Ana then asks and gets it instantly.
- "My mother is visiting from China and will pick up Ethan today." Pickup permission is never the AI's call. Goes straight to staff with the next step: written authorization in the app plus photo ID.

**Never answered by the AI, always handed off**
Custody and restraining orders, pickup authorization changes, suspected abuse or neglect, injuries and incidents, behavior and expulsion, medication, complaints about staff, billing disputes, and anything about another family. Emergencies get "call 911" first, then a human.

## 6. Parent experience

- **Entry.** Pick a center and a family, or visitor mode. No real login, by design.
- **Home.** Child cards, today's status, and quick-reply chips for common questions.
- **Answer card.** Answer text, personalized facts, a source chip that opens the cited excerpt with "updated by" and date, an optional action button, and thumbs up or down.
- **Three modes, visually distinct.**
  - Answer, with source.
  - "Not sure": names who will reply and when, based on the center's hours and time zone.
  - Urgent or sensitive: immediate human handoff, with emergency guidance when relevant.
- **Actions.** Report an absence with a computed return time. Order a backup lunch. Book a tour in visitor mode. Each action shows a confirmation and appears in the operator console.
- **Two children.** When a question could apply to either child, the app asks which one with chips.
- **Language.** Replies in the language the parent writes in. Source excerpts stay in the original with a translation toggle.

### Look and feel

- **Web only.** One responsive web app. No native apps for the demo.
- **Phone layout.** Chat first. A small animated clerk sits in the header, with a status line that says what it is doing.
- **Laptop and tablet layout.** Three panes: a simple lobby scene with the clerk at the desk, the chat, and a notice board. The notice board shows today's hours, today's menu, the next closure and the parent's open requests. It is the digital version of the parent bulletin board the Albuquerque handbook describes.
- **One clerk, not several.** Parents build trust with one character. Real staff appear as people with names and initials, never as cartoons, so it is always clear who is AI and who is human.
- **Character: Maple the bear.** A round, soft brown bear in a teal apron with the center's name tag and the handbook tucked in the apron pocket. Same Maple at both centers. Kept deliberately unthreatening: rounded shapes, small eyes, rosy cheeks, no teeth or claws.
- **Maple's voice.** Warm, steady and plain. Short sentences, no baby talk, no exclamation marks in serious answers.
- **Maple's states.** Ready: slow breathing and blinking. Listening: ears perk and head tilts while the parent types. Checking the handbook: reading glasses on, pages turning. Getting a person: holds a phone and gestures toward the director's door. Done: a small nod after an action is confirmed. Calm mode: still, soft eyes, paw on chest.
- **Animation explains the work.** Each state maps to what the system is doing: ready, listening while the parent types, checking the handbook, getting a person during a handoff, and calm mode.
- **Calm mode for hard moments.** On urgent or sensitive topics the clerk stops bouncing, the copy turns plain, and the human handoff takes center stage.
- **Always labeled as AI.** The clerk never claims to be a person.
- **Built as SVG with CSS animation.** Light, fully controllable, and respects reduced-motion settings. No 3D.

### Phase 3 redesign, decided October 7

Feedback on the first parent app: treat it as a real product, not a demo router.

- **Sign-in is the front door.** An email and password form simulates sign-in, and a session cookie decides what each person sees. A clearly labeled "Demo accounts" panel signs reviewers in with one click as any parent or director. Real authentication can replace the mock later without changing the pages.
- **Parents see only their own family.** The family comes from the session, never from the URL. Directors land in their center's console.
- **No visitor mode for now.** Prospective-family flows are hidden from the interface. The engine still supports visitors, so they can return later as a public page per center.
- **The front desk is the home screen.** On phones, the animated front desk with Maple is the hero, with information cards below: today, food, next closure, notices, your requests and your children. Tapping Maple opens the chat as a card that springs up while Maple moves from the desk into its header, using Motion's shared-layout animation. Maple acts out each state during the conversation, and closing the card returns her to the desk. On laptops, the desk and cards stay in view with the chat docked beside them.
- **Maple, version 2.** Redrawn in code with more polish: softer shading, highlights and rounder proportions, with the same design and separately animated parts. Animated with the Motion library using springs, and a wave hello and happy hop added to the existing states. The component keeps its `state` and `size` interface, so a Rive-made Maple could replace it later.

## 7. Operator console

- **Center switcher** for the demo only.
- **Overview.** Questions this week, share answered without staff, estimated staff hours saved, after-hours answers, open handoffs, top topics over time, and a "gaps" list of questions the AI could not answer.
- **Inbox.** Handoffs sorted urgent first. Each shows the family, child, the parent's words, why the AI handed off, and a suggested reply. Sending a reply delivers it to the parent, translated if needed, and offers "Save as answer", which drafts a general Q&A for the director to approve.
- **Knowledge.** Handbook sections, structured tables for calendar, menu, tuition, hours and tour slots, and saved answers. Each item shows who updated it, when, and how many answers used it this week.
- **Test box.** Ask as any family and see the answer and sources without logging it.
- **Set up a new center.** Not planned for now. The idea was to paste a handbook, have the AI split it into sections and tables with the quote each fact came from, and let the director approve it.

### Phase 4 decisions, October 7

- **Directors see only their own center.** No center switcher: sign out and pick the other director from Demo accounts, like a real product.
- **Laptop first.** The inbox and replies still work on a phone.
- **Knowledge editing.** Directors edit handbook sections and saved answers. The calendar, menu, tuition, hours and tour tables are read-only for now, each showing who updated it and when.
- **Suggested replies on request.** A "Draft a reply" button asks Maple for a draft from the handbook. Where the handbook is silent, the draft leaves a bracketed blank for the director instead of inventing an answer.
- **Replies reach parents in their language.** The parent sees the translation, with the original one tap away. The director sees what the parent got.

## 8. Answer engine: a router with lanes

Code handles everything that is well defined. AI is used only to understand free text and to read the handbook when a question needs it. Each message takes the cheapest lane that can answer it correctly.

| Lane | Who does the work | Used for | Rough tokens |
|---|---|---|---|
| Safety check | Code keyword rules, in English, Spanish, Mandarin and Hindi | Emergencies, custody, abuse, injuries, pickup changes | 0 |
| Quick facts | Code | Buttons and chips: today's lunch, hours, next closure, tuition | 0 |
| Understand | Small, fast AI model | Every typed message. Returns intent, child, dates, symptoms and times, language, sensitive flags, and a matching saved answer if one exists | about 2,000 |
| Look up | Code | Closures, menus and allergens, tuition and waitlist, tour slots, illness return times, billing items | 0 |
| Read the handbook | Larger AI model with the whole handbook | Open policy questions that no table answers | about 5,000 |
| Double-check | Code, then a small AI claim check | Citations must exist. Every price, date and percentage must appear in a cited source. Every claim must be stated in the cited text. Failures become handoffs | about 1,000 |
| A person | Inbox | Sensitive topics, low confidence, not covered, failed checks, AI outages | 0 |

How the lanes connect:

1. **Safety check** runs first on every message. A match skips straight to a person, with "call 911" first for emergencies.
2. **Quick facts** answer button taps with no AI at all.
3. **Understand** runs on typed messages. Its sensitive flags back up the keyword list, because keyword lists can't cover every language and phrasing.
4. If the intent is well defined, **Look up** computes the answer from tables and a template fills it in. The small model only rephrases it when the parent writes in Spanish, Mandarin or Hindi.
5. If a saved answer matches, it is returned directly. This is how the "answer once" loop makes the system both smarter and cheaper over time.
6. Otherwise **Read the handbook** answers with citations, then **Double-check** verifies it.
7. Anything unsure, uncovered or blocked goes to **a person**: the teacher for same-day child questions, the director for everything else.

Context given to the larger model: the center's whole handbook with section IDs, tables rendered as text with weekdays filled in, today's date and time in the center's time zone, the family profile, and saved answers. Other families' data is never included. In practice this is about 4,500 input tokens, so a handbook question costs about 7,500 tokens including the other steps.

Guards written in code, added after the scorecard exposed gaps:

- **Child names.** With several children, a child counts only if the parent named them. Otherwise Maple asks which child.
- **Weather.** A closure question that mentions snow, ice, smoke or storms always reads the weather policy instead of the calendar.
- **Tuition.** Code answers prices and assistance. Discounts and fee details go to the handbook.
- **Claim check.** After the numbers check, a small model compares each claim to the cited text. Stretching a policy to a case it doesn't mention, such as twins and a sibling discount, counts as unsupported and becomes a handoff.
- **Gender.** Maple uses children's names and never guesses he or she.

Logging: every question records center, family, lane, intent, sources, real token counts and feedback. Non-production replies also include step timings.

Free-tier protection: buttons never use AI, identical questions reuse answers for the day, and a rate-limit error becomes a polite handoff instead of a failure. Each AI call has a time limit: 7 seconds for the small step and 12 for the large. A model that times out or reports overload sits out for two minutes. A model that hits its daily quota sits out until the quota resets.

Models: free tiers from two providers, pinned to specific versions. Each step falls back through several models across Groq and Google Gemini. A provider without a key is skipped.

| Step | Models, in order |
|---|---|
| Understand, translate, claim check | groq openai/gpt-oss-20b, gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-2.5-flash-lite |
| Read the handbook | groq openai/gpt-oss-120b, gemini-3.6-flash, gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite |

Groq goes first. On the scorecard it answered every question it received correctly, in about a second. Its free tier allows 1,000 requests a day but only 8,000 tokens a minute per model, about three questions a minute, so bursts spill over to Gemini. Gemini's free limits are per model per day, as low as 20.

`src/lib/providers.ts` talks to each provider: Gemini through Google's SDK, and Groq through a generic adapter for OpenAI-style APIs that also covers Ollama and OpenRouter. `src/lib/llm.ts` holds the shared logic: model order, time limits, cooldowns, quota tracking and JSON validation. The `MODELS_SMALL` and `MODELS_LARGE` environment variables override the order, which also makes it easy to run the scorecard against a single model. Data is fictional, so free-tier data use is acceptable.

## 9. Tech stack

- Next.js App Router with TypeScript, Tailwind, shadcn/ui components, lucide icons, Recharts.
- Node 24 pinned to this project with Volta.
- Upstash Redis from the Vercel Marketplace for shared state. An in-memory fallback for local development before the database exists.
- Seed content lives in the repo as Markdown and JSON. A reset button restores it.
- Seeded question history is generated relative to the current date, so the demo never looks stale.
- Deployed on the user's Vercel account.

Routes: landing page, parent app, operator console per center, demo split view, and API routes for asking, handoffs, knowledge, actions and reset.

## 10. Scorecard

The scenarios in SCENARIOS.md become the test set. About thirty test questions across both centers, each with the expected route and facts that must appear. Includes trick cases: federal holiday assumptions, wrong-center facts, invented prices, sensitive topics phrased casually, two-children ambiguity, and non-English questions. A script runs them and prints pass or fail. The result is shown in the console and mentioned in the video.

## 11. Two-minute video

| Time | Scene |
|---|---|
| 0:00 | The problem: a director buried in repeat questions |
| 0:12 | Two phones side by side ask the same questions at both centers and get different correct answers with sources |
| 0:45 | Fever: Mia's return time is computed and the absence is logged |
| 1:00 | Ethan's grandparent pickup goes straight to staff, in Mandarin |
| 1:10 | Halloween: Rosa asks in Spanish, the director answers once, Ana gets it instantly |
| 1:35 | The director's overview shows time saved, after-hours answers and the gaps Maple couldn't answer |
| 1:50 | Bonus teaser |

## 12. Build phases and checkpoints

| Phase | Work | Checkpoint with you |
|---|---|---|
| 0 | Scaffold project, pin Node, git. You: Vercel login, Gemini key, Redis | App runs locally |
| 1 | Handbooks, tables, families, seeded history | You review both centers' content |
| 2 | Answer engine and scorecard | Scorecard results |
| 3 | Parent experience: simulated sign-in, front desk home, chat card, Maple version 2 | Try it on your phone |
| 4 | Operator console and "answer once" loop | Walk the full loop |
| 5 | Debug and organize: fix bugs found so far, tidy the code and docs, and re-run every check on the merged app | Clean scorecard and a walk through every screen |
| 6 | Demo view, deploy, polish, video shot list | Hosted URL ready to record |

## 13. Risks

- **Free-tier limits during review.** Caching, polite fallback, and the model ID can be swapped without code changes.
- **Wrong answers.** Code answers well-defined questions, citation and number checks guard the rest, handoff when unsure, and the scorecard.
- **Scope creep.** The video decides what gets built, and the cut list is ordered.
- **Real-world facts going stale.** Facts live in each handbook with dates, and the director can edit them.
- **Privacy.** Everything is fictional, and the app says so.
