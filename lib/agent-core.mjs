export const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export function updateMastery(
  current,
  { correct, difficulty = 2, repeatedMistakes = 0 },
) {
  const gain = { 1: 3, 2: 5, 3: 7 }[difficulty] ?? 5;
  const loss = { 1: 5, 2: 4, 3: 3 }[difficulty] ?? 4;
  const change = correct
    ? gain * (1 - current / 125)
    : -(loss + Math.min(4, repeatedMistakes * 1.5));
  return Math.round(clamp(current + change));
}

export function nextDifficulty({
  mastery,
  consecutiveCorrect = 0,
  consecutiveIncorrect = 0,
}) {
  if (mastery < 45 || consecutiveIncorrect >= 2) return 1;
  if (mastery >= 80 && consecutiveCorrect >= 2) return 3;
  return 2;
}

export function weakSkills(scores, threshold = 60) {
  return [...scores]
    .filter((skill) => skill.mastery < threshold)
    .sort((a, b) => a.mastery - b.mastery);
}

export function selectNextQuestion({ questions, history, scores }) {
  const seen = new Set(history.slice(-6).map((item) => item.questionId));
  const weak = weakSkills(scores);
  const target =
    weak[0] ?? [...scores].sort((a, b) => a.mastery - b.mastery)[0];
  const misses = history
    .filter((item) => item.skill === target.skill && !item.correct)
    .slice(-2).length;
  const desired = nextDifficulty({
    mastery: target.mastery,
    consecutiveIncorrect: misses,
  });
  return (
    questions
      .filter((q) => q.skill === target.skill && !seen.has(q.id))
      .sort(
        (a, b) =>
          Math.abs(a.difficulty - desired) - Math.abs(b.difficulty - desired),
      )[0] ??
    questions.find((q) => q.skill === target.skill) ??
    questions[0]
  );
}

export function generateStudyPlan(scores, days = 5) {
  const ranked = [...scores].sort((a, b) => a.mastery - b.mastery);
  return Array.from({ length: days }, (_, index) => {
    const focus = ranked[index % Math.min(3, ranked.length)];
    return {
      day: index + 1,
      skill: focus.skill,
      questions: focus.mastery < 50 ? 8 : 6,
      minutes: focus.mastery < 50 ? 20 : 15,
      reviewMistakes: index > 0,
    };
  });
}

export function decisionMessage({ mastery, skill, consecutiveIncorrect = 0 }) {
  if (consecutiveIncorrect >= 2)
    return `Difficulty decreased because you missed 2 ${skill} questions.`;
  if (mastery < 50)
    return `${skill} added to tomorrow's plan because mastery is currently ${mastery}%.`;
  if (mastery >= 90)
    return `${skill} practice skipped because mastery reached ${mastery}%.`;
  return `${skill} stays in your plan while mastery develops.`;
}

export function scheduleMistakeReview({ occurrences, from = new Date() }) {
  const intervals = [0, 1, 3, 7, 14, 30];
  const days =
    intervals[Math.min(Math.max(occurrences - 1, 0), intervals.length - 1)];
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + days);
  return { intervalDays: days, dueAt: due.toISOString() };
}

export function choosePrerequisite({ skill, prerequisiteGraph, mastery }) {
  const candidates = prerequisiteGraph[skill] ?? [];
  return (
    [...candidates].sort(
      (a, b) => (mastery[a] ?? 50) - (mastery[b] ?? 50),
    )[0] ?? null
  );
}

export function buildDecisionEvidence({
  skill,
  before,
  after,
  previousDifficulty,
  nextDifficulty: difficulty,
  trigger,
  action,
}) {
  return {
    skill,
    masteryBefore: before,
    masteryAfter: after,
    previousDifficulty,
    nextDifficulty: difficulty,
    trigger,
    action,
  };
}
