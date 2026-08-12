# AcePath AI

AcePath AI is a free, lightweight adaptive SAT tutor built for students who do not have access to private tutoring or expensive prep platforms. It turns every answer into a next action: a mastery update, an adaptive question, a mistake-memory entry, or a change to the weekly study plan.

**Hackathon demo:** choose **Try Demo — instant access** for a freshly reset populated learner, or **Start a diagnostic** for the complete new-student flow. Zero-cost mode is the production default and does not require an AI key, account, or paid network call.

## Why it matters

SAT preparation is often a question of access. AcePath offers the core behavior of an attentive tutor—diagnosing gaps, remembering recurring mistakes, and adjusting the path—without a paywall. The interface is mobile-first, keyboard accessible, low-animation, and intentionally light on media for students using inexpensive devices or slow connections.

## Demo

Choose **Explore demo student** on the landing page. Amara's seeded profile shows a 1210 readiness estimate, skill-level mastery, a populated weekly plan, improvement history, recurring mistakes, and a transparent log of agent decisions. Choose **Start your free diagnostic** to experience new-student onboarding.

Main routes:

- `/` — mission and onboarding
- `/dashboard` — readiness, daily tasks, and skill snapshot
- `/diagnostic` — Math, Reading/Writing, or full diagnostic
- `/practice` — interactive adaptive question loop and feedback
- `/study-plan` — personalized weekly schedule
- `/progress` — readiness and mastery analytics
- `/mistakes` — remembered error patterns
- `/agent` — transparent decision history

## How the agent works

Important decisions are deterministic and server-controllable. The engine in `lib/agent-core.mjs`:

1. Updates each skill's mastery from 0–100, weighting question difficulty and repeated mistakes.
2. Detects weak skills below a configurable threshold.
3. Lowers difficulty after repeated misses and raises it after demonstrated mastery.
4. Selects unseen questions near the right difficulty for the weakest relevant skill.
5. Generates weekly tasks that prioritize the lowest mastery scores.
6. Produces human-readable decision reasons for the demo and audit history.
7. Schedules mistake reviews at expanding intervals and returns from prerequisite remediation to the original target skill.

The optional provider abstraction in `lib/ai-provider.ts` supports Gemini through environment variables. It may improve explanation wording, but it does not control mastery, difficulty, or question selection. When no API key is configured, authored explanations keep the complete learning flow usable.

Every adaptive decision can include structured evidence: mastery before and after, previous and next difficulty, trigger, and selected action.

## Architecture

- Next-compatible TypeScript/React routes with Tailwind CSS
- Pure deterministic agent core, independently testable with Node's test runner
- Original SAT-style seed questions (no copied official questions)
- Supabase/Postgres schema with row-level security in `supabase/schema.sql`
- Provider-neutral server-only AI abstraction
- Vercel-ready environment configuration

The data model covers profiles, diagnostics, practice sessions, questions, answers, skills, mastery, plans, tasks, mistake patterns, and agent decisions.

## Local setup

Requirements: Node.js 22.13 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open the local URL shown by the development server. The demo works without external credentials.

To enable persistence, create a Supabase project, run `supabase/schema.sql` in its SQL editor, and add the project URL and keys to `.env.local`. Never expose the service-role key to browser code.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged operations |
| `AI_PROVIDER` | `none` or `gemini` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini explanation provider |

## Quality checks

```bash
npm test
npm run lint
npm run build
```

Tests cover mastery calculation, difficulty adaptation, weak-skill ordering, study-plan generation, and adaptive selection.

## Deploy to Vercel

Import the repository in Vercel, add the variables from `.env.example`, and deploy using the default build settings. Keep all AI and service-role secrets server-side. Supabase RLS policies restrict student-owned records to the authenticated user.

## Accessibility and performance

- Responsive from small phone screens upward
- Semantic headings, labels, fieldsets, and keyboard-operable controls
- High-contrast text and non-color-only feedback
- Reduced-motion support
- System typography and no required image downloads
- Useful authored fallbacks when AI or network access is unavailable
- Built-in larger-text, high-contrast, and Low Data Mode preferences
- Spaced mistake review without background tracking or notifications

## Submission assets

- [One-page Devpost write-up](docs/DEVPOST-WRITEUP.md)
- [2:40 demo script and recording checklist](docs/DEMO-SCRIPT.md)
- [Judge-readiness checklist](docs/JUDGE-CHECKLIST.md)
- Social preview: `public/og.png`

## Honest prototype boundary

The public demo uses device-local state so judges can run the complete flow without creating an account. The production Supabase schema and RLS policies are included, but hosted cross-device persistence requires configuring a Supabase project and replacing the demo state adapter with authenticated database reads and writes. AcePath labels its readiness measure as an internal preparation signal; it is not an official SAT score prediction.
