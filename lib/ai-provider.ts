type TutorPrompt = { question: string; chosenAnswer: string; correctAnswer: string; skill: string };

export async function generateTutorExplanation(input: TutorPrompt): Promise<string | null> {
  const provider = process.env.AI_PROVIDER ?? "none";
  const prompt = `You are a concise SAT tutor. Explain why the chosen answer is wrong, show the correct reasoning, name the ${input.skill} skill, and give one useful tip. Question: ${input.question}. Chosen: ${input.chosenAnswer}. Correct: ${input.correctAnswer}.`;
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}) });
    if (!response.ok) return null;
    const data = await response.json() as { candidates?: Array<{content?:{parts?:Array<{text?:string}>}}> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
  return null;
}
