import test from "node:test";
import assert from "node:assert/strict";

test("AI provider secrets are not public environment variables", async () => {
  const fs = await import("node:fs/promises");
  const env = await fs.readFile(".env.example", "utf8");
  assert.doesNotMatch(env, /NEXT_PUBLIC_(OPENAI|GEMINI)/);
});

test("zero-cost mode is the default and the client does not call the explanation API", async () => {
  const fs = await import("node:fs/promises");
  const env = await fs.readFile(".env.example", "utf8");
  const client = await fs.readFile("app/components/AcePathApp.tsx", "utf8");
  assert.match(env, /^AI_PROVIDER=none$/m);
  assert.doesNotMatch(client, /fetch\s*\(/);
  assert.doesNotMatch(client, /\/api\/explain/);
  assert.match(client, /dashboard\?demo=1/);
});

test("Supabase schema enables RLS for every student-owned table", async () => {
  const fs = await import("node:fs/promises");
  const sql = await fs.readFile("supabase/schema.sql", "utf8");
  for (const table of ["profiles","diagnostic_attempts","practice_sessions","answers","mastery_scores","study_plans","study_tasks","mistake_patterns","agent_decisions"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});
