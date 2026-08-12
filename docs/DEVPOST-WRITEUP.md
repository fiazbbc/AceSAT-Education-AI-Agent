# AcePath AI — One-page submission write-up

## The problem

Students in underserved public schools often prepare for the SAT without private tutoring, expensive subscriptions, or reliable broadband. Free question banks help, but they rarely notice why a student is struggling or decide what the student should do next. The result is wasted study time, repeated misconceptions, and a widening opportunity gap.

## The solution

AcePath AI is a free, mobile-first SAT learning agent that observes every answer, maintains skill-level mastery, remembers recurring mistake patterns, and changes the student's learning path automatically. A short diagnostic identifies the learner's strongest and weakest skills. The deterministic agent then generates a realistic five-day plan, selects an appropriately difficult exercise, and records the evidence behind every decision.

When a student misses a question, AcePath does more than display the answer. It classifies the mistake, updates mastery, selects a prerequisite, gives a concise explanation, schedules a future review, and later returns the learner to the original target skill. If mastery is high, it raises difficulty and removes unnecessary repetition. Every change appears in a transparent decision audit trail.

## Why this is an agent—not a chatbot

AcePath continuously executes a closed learning loop: **observe → update → decide → act → verify**. The reliable decisions—mastery calculation, weak-skill detection, prerequisite traversal, difficulty adaptation, question selection, mistake scheduling, and study-plan generation—are controlled by tested rules. An optional OpenAI or Gemini provider can personalize explanations, but it cannot change scores or select the learning path. The complete learning experience still works when the model or network is unavailable.

## Impact and accessibility

AcePath is designed around the constraints of students using inexpensive phones and weak internet connections. The interface uses no required imagery, supports keyboard navigation and reduced motion, includes larger-text and high-contrast preferences, and offers a Low Data Mode with authored offline-friendly explanations. Touch targets, focus indicators, semantic progress bars, and live feedback announcements make the core flow usable across ability levels.

The demo makes autonomy visible: complete the diagnostic with a Quadratics weakness, inspect the generated plan, miss a practice question, complete the foundation exercise, retry the target, and watch the dashboard, Mistake Memory, and decision log update from the same learner state.

## Technical architecture

AcePath uses Next-compatible TypeScript and React with Tailwind CSS. A pure deterministic agent core is independently tested for mastery boundaries, difficulty adaptation, prerequisite choice, weak-skill prioritization, question selection, spaced review, plan generation, and auditable decision evidence. A Supabase/Postgres schema covers profiles, questions, answers, diagnostic attempts, mastery, practice sessions, study plans, tasks, mistakes, and agent decisions with row-level security. AI providers are replaceable through server-side environment variables.

## Vision

AcePath aims to give every student the behavior of an attentive tutor: not a bot waiting for questions, but a learning partner that notices, remembers, acts, and explains why.
