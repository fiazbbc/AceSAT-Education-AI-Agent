import test from "node:test";
import assert from "node:assert/strict";
import { expandedQuestionBank } from "../lib/question-bank.ts";

test("expanded bank contains hundreds of complete original practice items", () => {
  assert.equal(expandedQuestionBank.length, 280);
  assert.equal(new Set(expandedQuestionBank.map((q) => q.id)).size, expandedQuestionBank.length);
  for (const question of expandedQuestionBank) {
    assert.ok(question.prompt.length >= 10, `${question.id} needs a real prompt`);
    assert.equal(question.options.length, 4, `${question.id} needs four choices`);
    assert.ok(question.answer >= 0 && question.answer < question.options.length);
    assert.ok(question.explanation.length >= 30, `${question.id} needs an explanation`);
    assert.ok(question.tip.length >= 20, `${question.id} needs a useful hint`);
    assert.ok([1, 2, 3].includes(question.difficulty));
  }
});

test("every tracked skill has balanced difficulty coverage", () => {
  const skills = ["Linear equations", "Quadratics", "Percentages", "Geometry", "Transitions", "Punctuation", "Inference"];
  for (const skill of skills) {
    const items = expandedQuestionBank.filter((q) => q.skill === skill);
    assert.equal(items.length, 40, `${skill} should have 40 generated items`);
    for (const difficulty of [1, 2, 3]) {
      assert.ok(items.filter((q) => q.difficulty === difficulty).length >= 13);
    }
  }
});
