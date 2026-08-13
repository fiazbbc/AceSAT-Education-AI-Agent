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

test("demo persistence remains local and requires no external credentials", async () => {
  const fs = await import("node:fs/promises");
  const client = await fs.readFile("app/components/AcePathApp.tsx", "utf8");
  assert.match(client, /localStorage\.setItem\(KEY/);
  assert.doesNotMatch(client, /SUPABASE|OPENAI_API_KEY|GEMINI_API_KEY/);
});
