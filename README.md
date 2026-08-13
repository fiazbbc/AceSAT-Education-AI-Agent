# AcePath

AcePath is an adaptive SAT study agent for students who cannot rely on a private tutor. Most free test-prep tools give every learner the same queue of questions; AcePath maintains a learner model, remembers error patterns, and changes what the student should do next after every answer.

- **Live demo:** https://acepath-sat-demo.vercel.app/judge?demo=1
- [Read the AcePath One-Page Writeup](./AcePath_One_Page_Writeup.docx)
- **No setup required:** no account, API key, or paid service is needed for the demo.

## Try the judge demo

1. Open the live demo and select **Answer Question**.
2. Choose an option and submit it. Choosing **A** shows the clearest remediation path.
3. Watch the same response update mastery, identify an error pattern, change difficulty, and rebuild the study plan.
4. Continue to **Explain**, then open the updated dashboard and agent decision log.
5. Use **Reset Demo** to restore the seeded learner at any time.

### The agent in 30 seconds

AcePath observes a scored answer, updates the relevant 0–100 mastery value, and records the associated mistake pattern. It then chooses the next difficulty from the new mastery and recent streak, prioritizes the learner's weakest skill, regenerates the study plan, and stores structured evidence for the decision. The UI displays the before and after values, so the adaptation is inspectable rather than narrated by a chatbot.

## Key features

- Short, medium, and full-length SAT-style test modes
- Immediate answer feedback and authored option-by-option explanations
- Adaptive practice selected by skill, mastery, difficulty, and prior exposure
- Mistake memory with prerequisite remediation and scheduled review
- Weekly plan generated from current mastery, not a fixed template
- Math and Reading/Writing readiness estimates with transparent internal scaling
- Persistent demo progress in the current browser
- Visible decision history with trigger, evidence, and action
- Desmos testing-calculator shortcut, answer elimination, notes, and focus tools

All seeded questions are original SAT-style items. AcePath does not reproduce College Board questions or mark schemes.

## Architecture

The final application is intentionally small:

- Next.js App Router, React, and TypeScript
- deterministic learner-model and adaptation rules in `lib/agent-core.mjs`
- original question content and authored explanations in the application data
- browser-local demo persistence in `lib/client-state.ts`
- an optional, server-only Gemini explanation route in `app/api/explain/route.ts`

The judge demo uses the same state and adaptation functions as Practice, Study Plan, Dashboard, Progress, Mistakes, and Agent Log. There is no separate animation-only demo path.

## Agent logic

The deterministic core:

1. weights a correct or incorrect answer by question difficulty and repeated mistakes;
2. clamps mastery between 0 and 100;
3. identifies the lowest-mastery relevant skill;
4. lowers difficulty after weak evidence or repeated misses and raises it after demonstrated mastery;
5. selects an unseen question near the target difficulty;
6. adds prerequisite work when a misconception blocks the target skill;
7. regenerates study-plan priorities from the updated mastery map; and
8. records structured before/after evidence for each decision.

These rules are tested directly and work without a language model. Optional generated wording cannot change scores, question selection, or the learning path.

## Accessibility

Important actions use native buttons and links, visible keyboard focus, descriptive labels, live status regions, and touch targets sized for mobile use. The interface includes reduced-motion, high-contrast, and larger-text preferences. Layouts collapse at phone widths, and horizontal collections are either wrapped or intentionally scrollable.

## Zero-cost mode

`AI_PROVIDER=none` is the default. Mastery scoring, weak-skill detection, difficulty adaptation, question selection, mistake analysis, plans, progress, and decision logs all run locally with deterministic TypeScript/JavaScript. Static explanations are always available.

Gemini is optional and server-only:

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `none` (default) or `gemini` |
| `GEMINI_API_KEY` | Optional server-side Gemini key |
| `GEMINI_MODEL` | Optional model override |

No secret is referenced by client code.

## Tests

```bash
npm test
npm run lint
npm run build
```

The suite covers mastery boundaries, adaptive difficulty, weak-skill selection, prerequisite behavior, question selection, spaced review, plan generation, decision evidence, content integrity, API validation, accessibility markers, and responsive safeguards.

## Local setup

Node.js 22.13 or newer is required.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/judge?demo=1`. Copying `.env.example` is optional; the default requires no credentials.

## Deployment

Import the repository into Vercel and use the default Next.js build settings. No environment variables are required for the core demo. If Gemini is enabled, add its key only through Vercel's server-side environment settings.

## Prototype limitations

- Demo state is device-local, so it does not sync across browsers or devices.
- The question bank is substantial enough for the demonstration but is not an official College Board bank.
- Readiness scores are internal preparation estimates, not official SAT predictions or admissions guarantees.
- School and university range labels are informational examples, not admissions advice.
- The full-length mode imitates useful digital-testing interactions but is not Bluebook and should not be treated as an official practice test.
