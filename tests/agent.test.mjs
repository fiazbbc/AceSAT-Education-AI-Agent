import test from "node:test";
import assert from "node:assert/strict";
import {
  updateMastery,
  nextDifficulty,
  weakSkills,
  generateStudyPlan,
  selectNextQuestion,
  scheduleMistakeReview,
  choosePrerequisite,
  buildDecisionEvidence,
} from "../lib/agent-core.mjs";

test("mastery rises on correct answers and remains bounded", () => {
  assert.ok(updateMastery(50, { correct: true, difficulty: 2 }) > 50);
  assert.equal(updateMastery(100, { correct: true, difficulty: 3 }), 100);
});
test("repeated mistakes reduce mastery more and lower difficulty", () => {
  assert.ok(
    updateMastery(60, { correct: false, repeatedMistakes: 2 }) <
      updateMastery(60, { correct: false }),
  );
  assert.equal(nextDifficulty({ mastery: 70, consecutiveIncorrect: 2 }), 1);
});
test("high confidence performance raises difficulty", () =>
  assert.equal(nextDifficulty({ mastery: 85, consecutiveCorrect: 2 }), 3));
test("weak skills are ranked weakest first", () =>
  assert.deepEqual(
    weakSkills([
      { skill: "Geometry", mastery: 80 },
      { skill: "Quadratics", mastery: 42 },
      { skill: "Inference", mastery: 51 },
    ]).map((x) => x.skill),
    ["Quadratics", "Inference"],
  ));
test("study plans prioritize weak skills", () =>
  assert.equal(
    generateStudyPlan([
      { skill: "Geometry", mastery: 91 },
      { skill: "Quadratics", mastery: 42 },
    ])[0].skill,
    "Quadratics",
  ));
test("selection targets weakest skill at appropriate difficulty", () => {
  const questions = [
    { id: "q1", skill: "Quadratics", difficulty: 1 },
    { id: "q2", skill: "Quadratics", difficulty: 3 },
    { id: "q3", skill: "Geometry", difficulty: 1 },
  ];
  assert.equal(
    selectNextQuestion({
      questions,
      history: [],
      scores: [
        { skill: "Quadratics", mastery: 40 },
        { skill: "Geometry", mastery: 90 },
      ],
    }).id,
    "q1",
  );
});
test("complete learner loop updates mastery, plan, and next difficulty after a mistake", () => {
  const before = 52;
  const after = updateMastery(before, {
    correct: false,
    difficulty: 2,
    repeatedMistakes: 1,
  });
  const plan = generateStudyPlan([
    { skill: "Quadratics", mastery: after },
    { skill: "Geometry", mastery: 91 },
  ]);
  assert.ok(after < before);
  assert.equal(plan[0].skill, "Quadratics");
  assert.equal(plan[0].questions, 8);
  assert.equal(nextDifficulty({ mastery: after, consecutiveIncorrect: 2 }), 1);
});
test("mistake reviews use expanding intervals", () => {
  const start = new Date("2026-08-12T00:00:00.000Z");
  assert.equal(
    scheduleMistakeReview({ occurrences: 2, from: start }).intervalDays,
    1,
  );
  assert.equal(
    scheduleMistakeReview({ occurrences: 5, from: start }).intervalDays,
    14,
  );
});
test("prerequisite selection chooses the weakest dependency", () => {
  assert.equal(
    choosePrerequisite({
      skill: "Quadratics",
      prerequisiteGraph: { Quadratics: ["Factor pairs", "Signs"] },
      mastery: { "Factor pairs": 38, Signs: 60 },
    }),
    "Factor pairs",
  );
});
test("decision evidence records a complete auditable transition", () => {
  assert.deepEqual(
    buildDecisionEvidence({
      skill: "Quadratics",
      before: 52,
      after: 46,
      previousDifficulty: 2,
      nextDifficulty: 1,
      trigger: "incorrect",
      action: "teach prerequisite",
    }),
    {
      skill: "Quadratics",
      masteryBefore: 52,
      masteryAfter: 46,
      previousDifficulty: 2,
      nextDifficulty: 1,
      trigger: "incorrect",
      action: "teach prerequisite",
    },
  );
});
