# AI Front Desk

A prototype AI front desk for early education centers, built as a brightwheel take-home.
Parents chat with Maple, a friendly bear clerk who answers from each center's own handbook
and data, shows its sources, and hands off to staff when it should. Directors get a console
to see questions, answer handoffs once, and keep the source of truth current.

Everything here is fictional: Piñon Grove Early Learning in Albuquerque, Quail Ridge Early
Learning in Seattle, and their families.

- Plan: [docs/PLAN.md](docs/PLAN.md)
- Behavior scenarios and test set: [docs/SCENARIOS.md](docs/SCENARIOS.md)

## Run locally

Requires Node 24. If you use Volta, the version is pinned in `package.json`.

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Check setup at http://localhost:3000/api/health?live=1.

Without a database configured, the app uses a temporary in-memory store that resets when
the dev server restarts.

## Accounts and deployment

1. **Gemini API key.** Create a free key at https://aistudio.google.com/apikey and put it in
   `.env.local` as `GEMINI_API_KEY`.
2. **Vercel.** Sign in and link this folder:
   ```bash
   npx vercel login
   npx vercel link
   ```
3. **Gemini key on Vercel.** Add it to all environments:
   ```bash
   npx vercel env add GEMINI_API_KEY
   ```
4. **Database.** In the Vercel dashboard, open the project, go to Storage, create an
   Upstash for Redis database on the free plan, and connect it to the project.
5. **Pull everything locally.** This overwrites `.env.local` with the values stored in
   Vercel, which is why the Gemini key goes into Vercel first:
   ```bash
   npx vercel env pull .env.local
   ```
6. **Deploy.**
   ```bash
   npx vercel --prod
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run check:content` | Validates the centers' handbooks and data |
| `npm run scorecard` | Runs the behavior scenarios against a running server |
