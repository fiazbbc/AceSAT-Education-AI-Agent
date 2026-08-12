export type SkillScore = { skill: string; mastery: number };
export type AnswerEvent = { questionId: string; skill: string; correct: boolean };
export type BankQuestion = { id: string; skill: string; difficulty: number };

export { updateMastery, nextDifficulty, weakSkills, selectNextQuestion, generateStudyPlan, decisionMessage } from "./agent-core.mjs";
