import { generateTutorExplanation } from "../../../lib/ai-provider";

const MAX_TEXT = 1200;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return Response.json({ error: "Expected JSON" }, { status: 415 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  const input = body as Record<string, unknown>;
  const fields = ["question", "chosenAnswer", "correctAnswer", "skill"] as const;
  for (const field of fields) {
    if (typeof input[field] !== "string" || !input[field] || input[field].length > MAX_TEXT) {
      return Response.json({ error: `Invalid ${field}` }, { status: 400 });
    }
  }
  const explanation = await generateTutorExplanation({ question: input.question as string, chosenAnswer: input.chosenAnswer as string, correctAnswer: input.correctAnswer as string, skill: input.skill as string });
  return Response.json({ explanation, source: explanation ? "ai" : "authored-fallback" }, { headers: { "Cache-Control": "no-store" } });
}
