# Scorecard

Run 2026-10-08 00:08 UTC against http://localhost:3000, with the clock pinned to Tuesday, October 13, 2026 at 8:10 am local time.

26 passed, 3 failed, 1 pending. 57,428 AI tokens across 29 questions, 4,147 ms average.

| # | Scenario | Result | Mode | Lanes | Tokens | Notes |
|---|---|---|---|---|---|---|
| 1 | Today's lunch button | Pass | answer | quick_facts | 0 |  |
| 2 | Veterans Day, Seattle | Pass | answer | safety, understand, lookup | 1,984 |  |
| 3 | Veterans Day, Albuquerque | Pass | answer | safety, understand, lookup | 2,004 |  |
| 4 | Fever last night | Pass | answer | safety, understand, lookup | 2,113 |  |
| 5 | Low fever, Washington rule | Pass | answer | safety, understand, lookup | 2,099 |  |
| 6 | Fever with no details | Pass | clarify | safety, understand, lookup | 2,072 |  |
| 7 | Forgot lunch, dairy allergy | Pass | answer | safety, understand, lookup | 1,997 |  |
| 8 | Forgot lunch, meals provided | Pass | answer | safety, understand, lookup | 2,013 |  |
| 9 | Infant tuition, Seattle visitor | Pass | answer | safety, understand, lookup | 1,924 |  |
| 10 | Infant tuition, Albuquerque visitor | Pass | answer | safety, understand, lookup | 1,906 |  |
| 11 | Book a tour | Pass | answer | safety, understand, lookup | 1,905 |  |
| 12 | Outside in the rain | Fail | handoff | safety, person | 0 | mode handoff, expected answer; missing /rain/i; lane handbook not used; lane double_check not used; source handbook:weather not cited |
| 13 | Snow tomorrow | Fail | answer | safety, understand, lookup | 1,996 | missing /APS/Albuquerque Public Schools/; missing 9:00 |
| 14 | Halloween costume, Spanish | Pass | handoff | safety, understand, handbook, double_check, person | 7,439 |  |
| 15 | Halloween, after Elena's saved answer | Pending | | | | Needs the operator reply flow from Phase 4 |
| 16 | Grandparent pickup, Mandarin | Pass | handoff | safety, understand, lookup, person | 2,270 |  |
| 17 | Custody worry | Pass | urgent | safety, person | 0 |  |
| 18 | Emergency | Pass | emergency | safety, person | 0 |  |
| 19 | Did Mia nap? | Pass | handoff | safety, understand, person | 2,010 |  |
| 20 | Another family's allergy | Pass | declined | safety, understand, lookup | 2,005 |  |
| 21 | Twin discount | Pass | handoff | safety, understand, handbook, double_check, person | 6,875 |  |
| 22 | Trick request | Pass | declined | safety, understand, lookup | 1,985 |  |
| 23 | AI outage | Pass | handoff | safety, person | 0 |  |
| 24 | Veterans Day, Spanish | Fail | handoff | safety, person | 0 | mode handoff, expected answer; missing /abiert/i |
| 25 | Day after Thanksgiving, Mandarin | Pass | answer | safety, understand, lookup | 2,200 |  |
| 26 | Why was I charged $8? | Pass | answer | safety, understand, lookup | 2,475 |  |
| 27 | Low temperature, infant | Pass | answer | safety, understand, lookup | 2,100 |  |
| 28 | Which child? | Pass | clarify | safety, understand, lookup | 2,101 |  |
| 29 | Saved answer: parking | Pass | answer | safety, understand | 1,979 |  |
| 30 | Closing time | Pass | answer | safety, understand, lookup | 1,976 |  |

## Fixes since this run

The three failures above were rerun individually after fixes and now pass:

- **12 and 24** failed because Google's free tier returned "quota exceeded". The engine now spreads work across several models, skips a model for the rest of the day once its daily quota is reached, and pauses briefly on per-minute limits. Both still failed safely as polite handoffs.
- **13** answered "open" from the calendar and ignored the snow policy. Closure questions that mention weather now always go to the handbook.
- **21** was later caught by a new claim check: a fallback model claimed the sibling discount "would apply" to twins. Unsupported claims now turn into a handoff.

A full rerun is waiting on a separate development API key, so testing doesn't use up the live demo's daily quota.
