"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDecisionEvidence,
  generateStudyPlan,
  nextDifficulty,
  scheduleMistakeReview,
  updateMastery,
} from "../../lib/agent-core.mjs";
import { expandedQuestionBank } from "../../lib/question-bank";
import { estimateSectionScore, scoreMilestone } from "../../lib/readiness";

type Page =
  | "home"
  | "dashboard"
  | "diagnostic"
  | "practice"
  | "study-plan"
  | "progress"
  | "mistakes"
  | "agent"
  | "judge";
type Area = "Math" | "Reading & Writing";
type Question = {
  id: string;
  skill: string;
  area: Area;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  tip: string;
  mistake: string;
  prerequisite?: string;
};
type Decision = {
  id: string;
  time: string;
  kind: "adapt" | "plan" | "mastery" | "diagnostic";
  title: string;
  reason: string;
  evidence?: Record<string, string | number>;
};
type Student = {
  name: string;
  diagnosticComplete: boolean;
  mastery: Record<string, number>;
  answers: { questionId: string; skill: string; correct: boolean }[];
  mistakes: Record<string, number>;
  decisions: Decision[];
  plan: {
    day: number;
    skill: string;
    questions: number;
    minutes: number;
    reviewMistakes: boolean;
  }[];
};

const coreBank: Question[] = [
  {
    id: "lin-1",
    skill: "Linear equations",
    area: "Math",
    difficulty: 1,
    prompt: "Solve 3x + 6 = 21.",
    options: ["3", "5", "7", "9"],
    answer: 1,
    explanation: "Subtract 6 from both sides, then divide 15 by 3. x = 5.",
    tip: "Undo addition before multiplication.",
    mistake: "Inverse operations",
  },
  {
    id: "lin-2",
    skill: "Linear equations",
    area: "Math",
    difficulty: 2,
    prompt:
      "A service costs $12 plus $3 per movie. A $30 bill represents how many movies?",
    options: ["4", "6", "8", "10"],
    answer: 1,
    explanation:
      "Write 12 + 3m = 30. Subtract 12 and divide 18 by 3, so m = 6.",
    tip: "Separate the fixed fee from the per-item rate.",
    mistake: "Equation setup",
    prerequisite: "Inverse operations",
  },
  {
    id: "lin-3",
    skill: "Linear equations",
    area: "Math",
    difficulty: 3,
    prompt: "If 4(2x − 3) = 5x + 9, what is x?",
    options: ["5", "6", "7", "8"],
    answer: 2,
    explanation: "Expand to 8x − 12 = 5x + 9. Then 3x = 21, so x = 7.",
    tip: "Distribute before collecting variable terms.",
    mistake: "Distribution",
  },
  {
    id: "quad-1",
    skill: "Quadratics",
    area: "Math",
    difficulty: 1,
    prompt: "Which pair multiplies to 12 and adds to 7?",
    options: ["1 and 12", "2 and 6", "3 and 4", "−3 and −4"],
    answer: 2,
    explanation: "3 × 4 = 12 and 3 + 4 = 7.",
    tip: "List factor pairs before considering signs.",
    mistake: "Factor pairs",
  },
  {
    id: "quad-2",
    skill: "Quadratics",
    area: "Math",
    difficulty: 2,
    prompt: "Which expression is equivalent to x² + 7x + 12?",
    options: ["(x+2)(x+6)", "(x+3)(x+4)", "(x−3)(x−4)", "(x+1)(x+12)"],
    answer: 1,
    explanation:
      "The factors 3 and 4 multiply to 12 and add to 7, giving (x + 3)(x + 4).",
    tip: "Match both the product and the sum.",
    mistake: "Quadratic factoring",
    prerequisite: "Factor pairs",
  },
  {
    id: "quad-3",
    skill: "Quadratics",
    area: "Math",
    difficulty: 3,
    prompt: "What are the solutions to x² − 7x + 12 = 0?",
    options: ["−3 and −4", "3 and 4", "2 and 6", "−2 and −6"],
    answer: 1,
    explanation: "Factor as (x − 3)(x − 4) = 0, so x = 3 or x = 4.",
    tip: "For a positive constant and negative middle term, both factor signs are negative.",
    mistake: "Sign errors",
    prerequisite: "Quadratic factoring",
  },
  {
    id: "pct-1",
    skill: "Percentages",
    area: "Math",
    difficulty: 2,
    prompt: "An $80 jacket is discounted 25%. What is the sale price?",
    options: ["$20", "$55", "$60", "$65"],
    answer: 2,
    explanation: "The discount is $20, so the sale price is $80 − $20 = $60.",
    tip: "A 25% discount means you pay 75%.",
    mistake: "Percent change",
  },
  {
    id: "trans-1",
    skill: "Transitions",
    area: "Reading & Writing",
    difficulty: 2,
    prompt:
      "The sample was small. ___, the results should be interpreted cautiously.",
    options: ["Likewise", "Therefore", "For example", "Meanwhile"],
    answer: 1,
    explanation:
      "The caution is a consequence of the small sample, so “Therefore” fits.",
    tip: "Name the relationship before checking choices.",
    mistake: "Transition logic",
  },
  {
    id: "punc-1",
    skill: "Punctuation",
    area: "Reading & Writing",
    difficulty: 2,
    prompt: "The library has one unusual rule ___ phones must remain outside.",
    options: [", phones", ": phones", "; and phones", " phones"],
    answer: 1,
    explanation:
      "A colon introduces the explanation of the complete clause before it.",
    tip: "Use a colon after a complete clause to introduce an explanation.",
    mistake: "Colon vs. comma",
  },
  {
    id: "infer-1",
    skill: "Inference",
    area: "Reading & Writing",
    difficulty: 3,
    prompt:
      "Birds repeatedly return to an empty nest carrying twigs. What is best supported?",
    options: [
      "They are leaving.",
      "The nest is complete.",
      "They are rebuilding.",
      "They fear the observer.",
    ],
    answer: 2,
    explanation:
      "Bringing twigs most directly supports that the birds are rebuilding.",
    tip: "Choose the answer requiring the fewest assumptions.",
    mistake: "Unsupported inference",
  },
  { id:"pct-2", skill:"Percentages", area:"Math", difficulty:1, prompt:"A class has 20 students. If 30% are absent, how many are absent?", options:["4","6","10","14"], answer:1, explanation:"30% of 20 is 0.30 × 20 = 6.", tip:"Convert the percent to a decimal, then multiply.", mistake:"Percent of a quantity" },
  { id:"pct-3", skill:"Percentages", area:"Math", difficulty:3, prompt:"A quantity increases from 80 to 104. What is the percent increase?", options:["20%","24%","30%","80%"], answer:2, explanation:"The increase is 24. Divide by the original 80: 24 ÷ 80 = 0.30, or 30%.", tip:"Percent change always divides by the original value.", mistake:"Percent change denominator", prerequisite:"Percent of a quantity" },
  { id:"geo-1", skill:"Geometry", area:"Math", difficulty:1, prompt:"A rectangle is 7 units long and 4 units wide. What is its area?", options:["11","22","28","44"], answer:2, explanation:"Area equals length times width: 7 × 4 = 28.", tip:"Area measures the space inside the shape.", mistake:"Area vs. perimeter" },
  { id:"geo-2", skill:"Geometry", area:"Math", difficulty:2, prompt:"A right triangle has legs of length 6 and 8. What is the hypotenuse?", options:["10","12","14","16"], answer:0, explanation:"By the Pythagorean theorem, c² = 6² + 8² = 100, so c = 10.", tip:"The hypotenuse is opposite the right angle.", mistake:"Pythagorean theorem", prerequisite:"Squares and roots" },
  { id:"geo-3", skill:"Geometry", area:"Math", difficulty:3, prompt:"A circle has radius 3. What is its area in terms of π?", options:["3π","6π","9π","18π"], answer:2, explanation:"Area is πr². With r = 3, the area is 9π.", tip:"Square the radius, not the diameter.", mistake:"Circle formula", prerequisite:"Squares and roots" },
  { id:"trans-2", skill:"Transitions", area:"Reading & Writing", difficulty:1, prompt:"Mina trained every day. ___, she improved her race time.", options:["As a result","In contrast","For example","Meanwhile"], answer:0, explanation:"Improvement is the result of daily training, so “As a result” is logical.", tip:"Ask whether the second idea is a result, contrast, or example.", mistake:"Cause and effect" },
  { id:"trans-3", skill:"Transitions", area:"Reading & Writing", difficulty:3, prompt:"The first study found a strong effect. ___, a larger replication found no measurable difference.", options:["Similarly","For instance","However","Therefore"], answer:2, explanation:"The findings conflict, so “However” signals contrast.", tip:"Compare the direction of the two claims before choosing.", mistake:"Contrast transitions", prerequisite:"Transition logic" },
  { id:"punc-2", skill:"Punctuation", area:"Reading & Writing", difficulty:1, prompt:"Which choice correctly joins the sentence? The rain stopped ___ the team resumed practice.", options:[", and"," and,","; and",":"], answer:0, explanation:"A comma plus the coordinating conjunction “and” correctly joins the two clauses.", tip:"Use comma + FANBOYS to join complete clauses.", mistake:"Comma with conjunction" },
  { id:"punc-3", skill:"Punctuation", area:"Reading & Writing", difficulty:3, prompt:"Which choice completes the sentence? The proposal had one goal ___ to reduce wasted water.", options:[",",":" ,";","and"], answer:1, explanation:"A colon introduces the explanation of the proposal's one goal.", tip:"The words before a colon must form a complete clause.", mistake:"Colon vs. comma", prerequisite:"Complete clauses" },
  { id:"infer-2", skill:"Inference", area:"Reading & Writing", difficulty:1, prompt:"A café adds outdoor tables, and weekend customer counts rise. Which claim is best supported?", options:["Outdoor seating may attract customers.","All customers prefer eating outdoors.","Indoor tables are unnecessary.","The café changed its menu."], answer:0, explanation:"The timing supports a cautious connection between added seating and more customers.", tip:"Prefer qualified claims over absolute ones.", mistake:"Overstated inference" },
  { id:"infer-3", skill:"Inference", area:"Reading & Writing", difficulty:2, prompt:"A researcher finds that seedlings under blue light grew taller than those under red light in the same conditions. What is best supported?", options:["Blue light always guarantees growth.","Light color may influence seedling height.","Red light kills seedlings.","Soil had no effect."], answer:1, explanation:"The controlled comparison supports a cautious claim that light color may influence height.", tip:"Keep the conclusion within the study's evidence.", mistake:"Unsupported inference", prerequisite:"Evidence boundaries" },
];
const bank: Question[] = [...coreBank, ...expandedQuestionBank];
const skillArea: Record<string, Area> = {
  "Linear equations": "Math",
  Quadratics: "Math",
  Percentages: "Math",
  Geometry: "Math",
  Transitions: "Reading & Writing",
  Punctuation: "Reading & Writing",
  Inference: "Reading & Writing",
};
const satDomain: Record<string, string> = {
  "Linear equations": "Algebra", Quadratics: "Advanced Math", Percentages: "Problem Solving & Data Analysis", Geometry: "Geometry & Trigonometry",
  Transitions: "Expression of Ideas", Punctuation: "Standard English Conventions", Inference: "Information & Ideas",
};
function masteryLabel(score: number) {
  return score < 50 ? "Needs Work" : score < 70 ? "Developing" : score < 90 ? "Strong" : "Mastered";
}
function priorityLabel(score: number, mistakes = 0) {
  return score < 50 || mistakes >= 4 ? "High Priority" : score < 70 || mistakes >= 2 ? "Medium Priority" : "Maintain";
}
const demo: Student = {
  name: "Amara",
  diagnosticComplete: true,
  mastery: {
    "Linear equations": 68,
    Quadratics: 42,
    Percentages: 73,
    Geometry: 91,
    Transitions: 82,
    Punctuation: 58,
    Inference: 49,
  },
  answers: Array(147).fill({
    questionId: "seed",
    skill: "Mixed",
    correct: true,
  }),
  mistakes: {
    "Sign errors": 4,
    "Unsupported inference": 3,
    "Colon vs. comma": 2,
  },
  plan: [
    {
      day: 1,
      skill: "Quadratics",
      questions: 8,
      minutes: 20,
      reviewMistakes: false,
    },
    {
      day: 2,
      skill: "Inference",
      questions: 8,
      minutes: 20,
      reviewMistakes: true,
    },
    {
      day: 3,
      skill: "Punctuation",
      questions: 6,
      minutes: 15,
      reviewMistakes: true,
    },
    {
      day: 4,
      skill: "Quadratics",
      questions: 8,
      minutes: 20,
      reviewMistakes: true,
    },
    {
      day: 5,
      skill: "Inference",
      questions: 8,
      minutes: 20,
      reviewMistakes: true,
    },
  ],
  decisions: [
    {
      id: "seed1",
      time: "Today",
      kind: "plan",
      title: "Quadratics moved to the front",
      reason: "Mastery is 42%, your lowest Math skill.",
    },
    {
      id: "seed2",
      time: "Yesterday",
      kind: "mastery",
      title: "Geometry practice skipped",
      reason: "Mastery reached 91% across three sessions.",
    },
  ],
};
const fresh: Student = {
  name: "Student",
  diagnosticComplete: false,
  mastery: {
    "Linear equations": 50,
    Quadratics: 50,
    Percentages: 50,
    Geometry: 50,
    Transitions: 50,
    Punctuation: 50,
    Inference: 50,
  },
  answers: [],
  mistakes: {},
  plan: [],
  decisions: [],
};
const KEY = "acepath-student-v2";
const DEMO_SESSION_KEY = "acepath-judge-demo-v1";

function useStudent() {
  const [student, setStudent] = useState<Student>(demo);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const wantsDemo = new URLSearchParams(window.location.search).has("demo");
      if (wantsDemo) {
        const saved = localStorage.getItem(KEY);
        const demoStarted = sessionStorage.getItem(DEMO_SESSION_KEY) === "started";
        if (demoStarted && saved) {
          setStudent(JSON.parse(saved));
        } else {
          const seeded = structuredClone(demo);
          setStudent(seeded);
          localStorage.setItem(KEY, JSON.stringify(seeded));
          sessionStorage.setItem(DEMO_SESSION_KEY, "started");
        }
      } else {
        const saved = localStorage.getItem(KEY);
        if (saved) setStudent(JSON.parse(saved));
      }
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(student));
  }, [student, ready]);
  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setStudent(fresh);
  }, []);
  return {
    student,
    setStudent,
    ready,
    reset,
  };
}
function now() {
  return "Just now";
}
function id() {
  return `${Date.now()}-${Math.random()}`;
}
function playAnswerSound(correct: boolean) {
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (correct ? 0.42 : 0.3));
    gain.connect(context.destination);
    const notes = correct ? [523.25, 659.25, 783.99] : [220, 164.81];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = correct ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.09);
      oscillator.stop(context.currentTime + index * 0.09 + 0.18);
    });
    setTimeout(() => void context.close(), 650);
  } catch {
    // Audio feedback is optional; visual feedback remains complete.
  }
}
function Logo() {
  return (
    <Link className="logo" href="/">
      <Image className="officialLogoMark" src="/acepath.svg" alt="" width={32} height={32} />
      <span className="officialWordmark"><b>ACE</b><i>path</i></span>
    </Link>
  );
}
function Header({ page }: { page: Page }) {
  return (
    <header>
      <Logo />
      <nav aria-label="Primary">
        <a className={page === "dashboard" ? "active" : ""} href="/dashboard">
          Dashboard
        </a>
        <a className={page === "practice" ? "active" : ""} href="/practice">
          Practice
        </a>
        <a className={page === "study-plan" ? "active" : ""} href="/study-plan">
          Study plan
        </a>
        <a className={page === "progress" ? "active" : ""} href="/progress">
          Progress
        </a>
        <a className={page === "agent" ? "active" : ""} href="/agent">
          Agent log
        </a>
      </nav>
      <a className="avatar" href="/dashboard" aria-label="Student profile">
        {page === "home" ? "GO" : "AM"}
      </a>
    </header>
  );
}
function Pill({
  children,
  tone = "mint",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
function Progress({
  value,
  color = "green",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div
      className="bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <i className={color} style={{ width: `${value}%` }} />
    </div>
  );
}
function Title({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="pageTitle">
      <Pill>{eyebrow}</Pill>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Preferences() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    if (typeof window === "undefined") return { large: false, contrast: false, lowData: true };
    const saved = localStorage.getItem("acepath-preferences");
    return saved ? JSON.parse(saved) : { large: false, contrast: false, lowData: true };
  });
  useEffect(() => {
    document.documentElement.dataset.large = prefs.large ? "true" : "false";
    document.documentElement.dataset.contrast = prefs.contrast
      ? "true"
      : "false";
    document.documentElement.dataset.lowData = prefs.lowData ? "true" : "false";
    localStorage.setItem("acepath-preferences", JSON.stringify(prefs));
  }, [prefs]);
  return (
    <div className="prefs">
      <button
        className="prefsToggle"
        aria-expanded={open}
        aria-controls="preferences-panel"
        onClick={() => setOpen((v) => !v)}
      >
        Accessibility
      </button>
      {open && (
        <section
          id="preferences-panel"
          className="prefsPanel"
          aria-label="Accessibility and data preferences"
        >
          <h2>Your preferences</h2>
          <label>
            <input
              type="checkbox"
              checked={prefs.large}
              onChange={(e) => setPrefs({ ...prefs, large: e.target.checked })}
            />{" "}
            Larger text
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.contrast}
              onChange={(e) =>
                setPrefs({ ...prefs, contrast: e.target.checked })
              }
            />{" "}
            High contrast
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.lowData}
              onChange={(e) =>
                setPrefs({ ...prefs, lowData: e.target.checked })
              }
            />{" "}
            Low Data Mode
          </label>
          <p>
            {prefs.lowData
              ? "Core lessons use no required images and work without an AI request."
              : "Enhanced explanations may use more data when configured."}
          </p>
        </section>
      )}
    </div>
  );
}
function DesmosLauncher() {
  return (
    <a
      className="desmosLauncher"
      href="https://www.desmos.com/testing/collegeboard/graphing"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open the College Board Desmos graphing calculator in a new tab"
      title="Open Desmos graphing calculator"
    >
      <span className="desmosLogo" aria-hidden="true"><i /><i /><i /></span>
      <span><b>desmos</b><small>Graphing Calculator</small></span>
      <i className="externalMark" aria-hidden="true">↗</i>
    </a>
  );
}
function Frame({ page, children }: { page: Page; children: React.ReactNode }) {
  return (
    <div className="app">
      <QuillCursor />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header page={page} />
      <main id="main" className="appMain">
        {children}
      </main>
      <Preferences />
      <DesmosLauncher />
      <nav className="mobileNav" aria-label="Mobile navigation">
        <a href="/dashboard">
          ⌂<small>Home</small>
        </a>
        <a href="/practice">
          ◇<small>Practice</small>
        </a>
        <a href="/study-plan">
          □<small>Plan</small>
        </a>
        <a href="/agent">
          ✦<small>Agent</small>
        </a>
      </nav>
    </div>
  );
}

const faqs = [
  {
    question: "Is AcePath really free?",
    answer: "Yes. The complete diagnostic, adaptive practice loop, study plan, progress tracking, and decision log work without a subscription or paid API call.",
  },
  {
    question: "How is this different from a study chatbot?",
    answer: "AcePath maintains a learner model. Every answer updates skill mastery, mistake memory, question difficulty, and the next action. You can inspect the evidence in the agent decision log.",
  },
  {
    question: "What happens when I get a question wrong?",
    answer: "The agent identifies the mistake pattern, adjusts mastery, may step down to a prerequisite, schedules a review, and selects a better-matched next question.",
  },
  {
    question: "Does the demo need an account or API key?",
    answer: "No. Try Demo opens a seeded student journey immediately, and all essential learning decisions run deterministically in the app.",
  },
];

function QuillCursor() {
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const interactive = "a, button, summary, [data-quill]";
    const move = (event: PointerEvent) => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      cursor.style.translate = `${event.clientX}px ${event.clientY}px`;
      cursor.dataset.visible = (event.target as Element)?.closest?.(interactive) ? "true" : "false";
    };
    const ink = (event: PointerEvent) => {
      if (!(event.target as Element)?.closest?.(interactive)) return;
      const drop = document.createElement("span");
      drop.className = "inkDrop";
      drop.style.left = `${event.clientX}px`;
      drop.style.top = `${event.clientY}px`;
      document.body.append(drop);
      window.setTimeout(() => drop.remove(), 650);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", ink, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", ink);
      document.querySelectorAll(".inkDrop").forEach((drop) => drop.remove());
    };
  }, []);

  return <span ref={cursorRef} className="quillCursor" aria-hidden="true">🪶</span>;
}

function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <div className="landing">
      <DesmosLauncher />
      <Header page="home" />
      <main>
        <section className="hero">
          <div className="heroCopy">
            <Pill>✦ FREE, ADAPTIVE SAT SUPPORT</Pill>
            <div className="zeroCostBadge"><span>✓</span><b>Zero-cost demo mode</b><small>No AI key · no paid calls · no signup</small></div>
            <h1>
              Your SAT path,
              <br />
              <em>made personal.</em>
            </h1>
            <p>
              AcePath turns every answer into a next action: a mastery update, a
              better question, and a realistic plan.
            </p>
            <div className="actions">
              <a className="btn primary judgeCta" href="/judge?demo=1">
                Start Judge Demo <span>→</span>
              </a>
              <a className="btn primary" href="/diagnostic?new=1">
                Start a diagnostic <span>→</span>
              </a>
              <a className="btn ghost" href="/dashboard?demo=1">
                Try Demo — instant access
              </a>
            </div>
            <small>
              No credit card. No premium tier. Works without an AI key.
            </small>
          </div>
          <div className="heroVisual">
            <div className="orbit orbit1" />
            <div className="orbit orbit2" />
            <div className="pathCard">
              <div className="pathTop">
                <Pill tone="violet">AGENT LOOP</Pill>
                <b>Transparent</b>
              </div>
              <h3>Observe → update → act</h3>
              <p>Your next step changes with your actual performance.</p>
              <div className="task done">
                <span>✓</span>
                <div>
                  <b>Weakness identified</b>
                  <small>Quadratics · 42% mastery</small>
                </div>
              </div>
              <div className="task current">
                <span>2</span>
                <div>
                  <b>Prerequisite selected</b>
                  <small>Factor pairs · foundation</small>
                </div>
                <i>NOW</i>
              </div>
              <div className="task">
                <span>3</span>
                <div>
                  <b>Plan rebuilt</b>
                  <small>8 focused questions tomorrow</small>
                </div>
              </div>
            </div>
            <div className="floatCard score">
              <b>+12%</b>
              <small>this month</small>
            </div>
            <div className="floatCard agentDot">
              <span>✦</span>
              <div>
                <b>Decision explained</b>
                <small>Just now</small>
              </div>
            </div>
          </div>
        </section>
        <section className="trust">
          <span>BUILT FOR REAL PROGRESS</span>
          <div>
            <b>100%</b>
            <small>free for students</small>
          </div>
          <div>
            <b>{bank.length} questions</b>
            <small>original and fully explained</small>
          </div>
          <div>
            <b>Every answer</b>
            <small>changes the learner model</small>
          </div>
        </section>
        <section className="how">
          <Pill>WHY IT IS AN AGENT</Pill>
          <h2>It notices, remembers, and acts.</h2>
          <p>
            The language model explains. Reliable rules control the learning
            path.
          </p>
          <div className="steps">
            <article>
              <span>01</span>
              <i>◎</i>
              <h3>Diagnose</h3>
              <p>
                Score each skill independently instead of hiding gaps inside one
                total.
              </p>
            </article>
            <article>
              <span>02</span>
              <i>✦</i>
              <h3>Decide</h3>
              <p>
                Generate a weekly plan and record the evidence behind every
                change.
              </p>
            </article>
            <article>
              <span>03</span>
              <i>↗</i>
              <h3>Adapt</h3>
              <p>
                Step down to a prerequisite after a miss, then retry the target
                skill.
              </p>
            </article>
          </div>
        </section>
        <section className="impact">
          <blockquote>
            “Private tutoring should not be the price of a fair shot.”
          </blockquote>
          <p>Fast, readable, low-bandwidth SAT preparation for any student.</p>
          <a className="btn light" href="/diagnostic?new=1">
            Build my study path →
          </a>
        </section>
        <section className="faq" aria-labelledby="faq-title">
          <Pill>QUICK ANSWERS</Pill>
          <h2 id="faq-title">Questions students ask first.</h2>
          <div className="faqList">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <article className={isOpen ? "faqItem open" : "faqItem"} key={item.question}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span>{item.question}</span>
                      <i aria-hidden="true" />
                    </button>
                  </h3>
                  <div className="faqAnswer" id={`faq-answer-${index}`} aria-hidden={!isOpen}>
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Diagnostic({
  student,
  setStudent,
  reset,
}: {
  student: Student;
  setStudent: React.Dispatch<React.SetStateAction<Student>>;
  reset: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<{ q: Question; correct: boolean }[]>(
    [],
  );
  const qs = [bank[1], bank[4], bank[7], bank[8], bank[9]];
  useEffect(() => {
    if (new URLSearchParams(location.search).has("new")) reset();
  }, [reset]);
  function answer() {
    if (chosen === null) return;
    const q = qs[index],
      correct = chosen === q.answer,
      next = [...results, { q, correct }];
    if (index < qs.length - 1) {
      setResults(next);
      setIndex(index + 1);
      setChosen(null);
      return;
    }
    const measured = { ...fresh.mastery };
    for (const r of next)
      measured[r.q.skill] = updateMastery(measured[r.q.skill], {
        correct: r.correct,
        difficulty: r.q.difficulty,
      });
    const scores = Object.entries(measured).map(([skill, mastery]) => ({
      skill,
      mastery,
    }));
    const plan = generateStudyPlan(scores);
    const weakest = [...scores].sort((a, b) => a.mastery - b.mastery)[0];
    setStudent((s) => ({
      ...s,
      diagnosticComplete: true,
      mastery: measured,
      answers: next.map((r) => ({
        questionId: r.q.id,
        skill: r.q.skill,
        correct: r.correct,
      })),
      plan,
      decisions: [
        {
          id: id(),
          time: now(),
          kind: "diagnostic",
          title: `${weakest.skill} identified as your first focus`,
          reason: `Diagnostic mastery is ${weakest.mastery}%. Your five-day plan now prioritizes this skill.`,
        },
        ...s.decisions,
      ],
    }));
    setResults(next);
    setIndex(index + 1);
  }
  const completed = index === qs.length;
  if (completed) {
    const sorted = Object.entries(student.mastery).sort((a, b) => a[1] - b[1]);
    return (
      <Frame page="diagnostic">
        <Title
          eyebrow="DIAGNOSTIC COMPLETE"
          title="Your path is ready."
          text="The agent analyzed each skill and generated your first study week."
        />
        <div className="resultGrid">
          <section className="panel">
            <Pill tone="coral">FOCUS FIRST</Pill>
            <h2>{sorted[0][0]}</h2>
            <div className="resultScore">{sorted[0][1]}%</div>
            <p>
              Your lowest measured skill. Practice begins with a foundation
              question, then builds back up.
            </p>
          </section>
          <section className="panel">
            <Pill>STRONGEST SIGNAL</Pill>
            <h2>{sorted.at(-1)?.[0]}</h2>
            <div className="resultScore">{sorted.at(-1)?.[1]}%</div>
            <p>The plan reduces repetition here to protect your study time.</p>
          </section>
        </div>
        <section className="agentStrip">
          <span>✦</span>
          <div>
            <Pill tone="violet">AGENT COMPLETED 3 ACTIONS</Pill>
            <h3>Mastery updated · plan generated · practice selected</h3>
            <p>These results now drive every dashboard screen.</p>
          </div>
          <a className="btn primary" href="/practice">
            Start adaptive practice →
          </a>
        </section>
      </Frame>
    );
  }
  if (!started)
    return (
      <Frame page="diagnostic">
        <Title
          eyebrow="5-QUESTION DIAGNOSTIC"
          title="Find your best starting point."
          text="One question per core skill. No timer and no penalty for mistakes."
        />
        <section className="readyCard">
          <span className="bigIcon">✦</span>
          <h2>What the agent will do</h2>
          <div>
            <p>
              <b>1. Score each skill</b>
              <br />
              Correctness and difficulty update mastery independently.
            </p>
            <p>
              <b>2. Rank your gaps</b>
              <br />
              The weakest skill becomes your first focus.
            </p>
            <p>
              <b>3. Build your plan</b>
              <br />
              Question count and review tasks adapt automatically.
            </p>
          </div>
          <button className="btn primary" onClick={() => setStarted(true)}>
            Begin diagnostic →
          </button>
        </section>
      </Frame>
    );
  const q = qs[index];
  return (
    <Frame page="diagnostic">
      <div className="practiceTop">
        <div>
          <Pill>
            DIAGNOSTIC · {index + 1} OF {qs.length}
          </Pill>
          <h1>{q.skill}</h1>
        </div>
        <div className="sessionProgress">
          <Progress value={(index / qs.length) * 100} />
        </div>
      </div>
      <QuestionView key={q.id} q={q} chosen={chosen} setChosen={setChosen} />
      <button
        className="btn primary diagnosticNext"
        disabled={chosen === null}
        onClick={answer}
      >
        {index === qs.length - 1 ? "Analyze my results" : "Save and continue →"}
      </button>
    </Frame>
  );
}

function QuestionView({
  q,
  chosen,
  setChosen,
  disabled = false,
  revealAnswer = false,
}: {
  q: Question;
  chosen: number | null;
  setChosen: (i: number | null) => void;
  disabled?: boolean;
  revealAnswer?: boolean;
}) {
  const [eliminated, setEliminated] = useState<Set<number>>(() => new Set());
  const toggleEliminated = (index: number) => {
    if (disabled) return;
    setEliminated((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    if (chosen === index) setChosen(null);
  };
  return (
    <section className={`questionCard ${revealAnswer ? (chosen === q.answer ? "answerCorrect" : "answerWrong") : ""}`}>
      <div className="qMeta">
        <Pill tone={q.area === "Math" ? "blue" : "violet"}>{q.area}</Pill>
        <span>
          {["Foundation", "Medium", "Advanced"][q.difficulty - 1]} difficulty
        </span>
      </div>
      <h2>{q.prompt}</h2>
      <fieldset disabled={disabled}>
        <legend className="srOnly">Choose one answer</legend>
        {q.options.map((o, i) => {
          const isEliminated = eliminated.has(i);
          return <div className={`optionRow ${isEliminated ? "eliminated" : ""}`} key={o}>
            <button
              type="button"
              aria-pressed={chosen === i}
              onClick={() => { if (!isEliminated) setChosen(i); }}
              disabled={isEliminated && !revealAnswer}
              className={`option ${chosen === i ? "selected" : ""} ${revealAnswer && i === q.answer ? "correct" : ""} ${revealAnswer && chosen === i && i !== q.answer ? "wrong" : ""}`}
              aria-label={`${String.fromCharCode(65 + i)}. ${o}${isEliminated ? ", eliminated" : ""}${revealAnswer && i === q.answer ? ", correct answer" : revealAnswer && chosen === i ? ", your incorrect answer" : ""}`}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              <i className="optionText">{o}</i>
            </button>
            {!revealAnswer && <button type="button" className="eliminateButton" onClick={() => toggleEliminated(i)} aria-pressed={isEliminated} aria-label={`${isEliminated ? "Restore" : "Eliminate"} option ${String.fromCharCode(65 + i)}`} title={`${isEliminated ? "Restore" : "Cross out"} option ${String.fromCharCode(65 + i)}`}>{isEliminated ? "↶" : "ABC"}<span aria-hidden="true">／</span></button>}
          </div>;
        })}
      </fieldset>
    </section>
  );
}

function Practice({
  student,
  setStudent,
}: {
  student: Student;
  setStudent: React.Dispatch<React.SetStateAction<Student>>;
}) {
  const [mode, setMode] = useState<"targeted" | "quick" | "custom" | "test">("targeted");
  const [testLength, setTestLength] = useState<"short" | "medium" | "full">("short");
  const [testStarted, setTestStarted] = useState(false);
  const [testSeconds, setTestSeconds] = useState(28 * 60);
  const [flagged, setFlagged] = useState(false);
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);
  const [customSkill, setCustomSkill] = useState("Quadratics");
  const [customDifficulty, setCustomDifficulty] = useState<1 | 2 | 3>(2);
  const [customCount, setCustomCount] = useState(10);
  const focus = useMemo(
    () =>
      Object.entries(student.mastery).sort((a, b) => a[1] - b[1])[0]?.[0] ??
      "Quadratics",
    [student.mastery],
  );
  const pool = bank.filter((q) => q.skill === focus);
  const misses = student.answers
    .filter((a) => a.skill === focus && !a.correct)
    .slice(-2).length;
  const desired = nextDifficulty({
    mastery: student.mastery[focus],
    consecutiveIncorrect: misses,
  });
  const seen = new Set(student.answers.map((answer) => answer.questionId));
  const initial =
    pool.find((q) => q.difficulty === desired && !seen.has(q.id)) ??
    pool.find((q) => !seen.has(q.id)) ??
    pool.find((q) => q.difficulty === desired) ?? pool[0] ?? bank[0];
  const [q, setQ] = useState(initial);
  const [chosen, setChosen] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState<Question | null>(null);
  const [confidence, setConfidence] = useState<"guessing" | "unsure" | "confident">("unsure");
  const [hintOpen, setHintOpen] = useState(false);
  const [transition, setTransition] = useState<{
    before: number;
    after: number;
    from: string;
    to: string;
    mistake?: string;
  } | null>(null);
  const correct = chosen === q.answer;
  const testConfigs = {
    short: { title: "Short Check", questions: 20, minutes: 28, detail: "10 Reading & Writing + 10 Math" },
    medium: { title: "Half Test", questions: 49, minutes: 67, detail: "Balanced half-length SAT practice" },
    full: { title: "Full-Length SAT", questions: 98, minutes: 134, detail: "54 Reading & Writing + 44 Math · 10-minute break" },
  } as const;
  const testConfig = testConfigs[testLength];
  const testQuestions = useMemo(() => {
    const readingCount = testLength === "full" ? 54 : testLength === "medium" ? 27 : 10;
    const reading = bank.filter((question) => question.area === "Reading & Writing").slice(0, readingCount);
    const math = bank.filter((question) => question.area === "Math").slice(0, testConfig.questions - readingCount);
    return [...reading, ...math];
  }, [testConfig.questions, testLength]);
  const readingCount = testLength === "full" ? 54 : testLength === "medium" ? 27 : 10;
  const readingModule = Math.ceil(readingCount / 2);
  const mathModule = Math.ceil((testConfig.questions - readingCount) / 2);
  const testModuleLabel = testQuestionIndex < readingModule ? "READING & WRITING · MODULE 1" : testQuestionIndex < readingCount ? "READING & WRITING · MODULE 2" : testQuestionIndex < readingCount + mathModule ? "MATH · MODULE 1" : "MATH · MODULE 2";
  const loadQuestion = (question: Question, index?: number) => {
    setQ(question);
    if (typeof index === "number") setTestQuestionIndex(index);
    setChosen(null);
    setChecked(false);
    setHintOpen(false);
    setTransition(null);
    setFlagged(false);
  };
  useEffect(() => {
    if (!testStarted || testSeconds <= 0) return;
    const timer = setInterval(() => setTestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [testStarted, testSeconds]);
  function check() {
    if (chosen === null) return;
    playAnswerSound(correct);
    const repeated = student.mistakes[q.mistake] ?? 0;
    const score = updateMastery(student.mastery[q.skill], {
      correct,
      difficulty: q.difficulty,
      repeatedMistakes: repeated,
    });
    setTransition({
      before: student.mastery[q.skill],
      after: score,
      from: ["Foundation", "Medium", "Advanced"][q.difficulty - 1],
      to: correct ? ["Foundation", "Medium", "Advanced"][Math.max(0, nextDifficulty({ mastery: score, consecutiveCorrect: 1 }) - 1)] : "Foundation",
      mistake: correct ? undefined : q.mistake,
    });
    const decisions: Decision[] = [];
    if (!correct) {
      const evidence = buildDecisionEvidence({
        skill: q.skill,
        before: student.mastery[q.skill],
        after: score,
        previousDifficulty: q.difficulty,
        nextDifficulty: 1,
        trigger: "incorrect answer",
        action: `teach ${q.prerequisite ?? "foundation prerequisite"}`,
      });
      decisions.push({
        id: id(),
        time: now(),
        kind: "adapt",
        title: `Difficulty reduced to foundation`,
        reason: `You missed ${q.skill}. Next up: ${q.prerequisite ?? "a simpler prerequisite"} before retrying.`,
        evidence,
      });
      setRecoveryTarget(q);
    }
    decisions.push({
      id: id(),
      time: now(),
      kind: "mastery",
      title: `${q.skill} mastery ${correct ? "increased" : "updated"} to ${score}%`,
      reason: `${correct ? "Correct" : "Incorrect"} answer at difficulty ${q.difficulty} was applied by the mastery rule.`,
    });
    const newMastery = { ...student.mastery, [q.skill]: score };
    const plan = generateStudyPlan(
      Object.entries(newMastery).map(([skill, mastery]) => ({
        skill,
        mastery,
      })),
    );
    setStudent((s) => ({
      ...s,
      mastery: newMastery,
      answers: [...s.answers, { questionId: q.id, skill: q.skill, correct }],
      mistakes: correct
        ? s.mistakes
        : { ...s.mistakes, [q.mistake]: repeated + 1 },
      plan,
      decisions: [...decisions, ...s.decisions],
    }));
    setChecked(true);
  }
  function next() {
    if (mode === "test" && testStarted) {
      const nextIndex = testQuestionIndex + 1;
      if (nextIndex < testQuestions.length) loadQuestion(testQuestions[nextIndex], nextIndex);
      else setTestStarted(false);
      return;
    }
    if (correct && recoveryTarget && q.id !== recoveryTarget.id) {
      setQ(recoveryTarget);
      setRecoveryTarget(null);
      setChosen(null);
      setChecked(false);
      setHintOpen(false);
      return;
    }
    const targetDifficulty = correct
      ? nextDifficulty({
          mastery: student.mastery[q.skill],
          consecutiveCorrect: 1,
        })
      : 1;
    const nextQ =
      pool.find((x) => x.difficulty === targetDifficulty && x.id !== q.id && !seen.has(x.id)) ??
      pool.find((x) => x.id !== q.id && !seen.has(x.id)) ??
      pool.find((x) => x.difficulty === targetDifficulty && x.id !== q.id) ??
      pool.find((x) => x.id !== q.id) ??
      q;
    setQ(nextQ);
    setChosen(null);
    setChecked(false);
    setHintOpen(false);
    setTransition(null);
  }
  return (
    <Frame page="practice">
      <div className="practiceTop">
        <div>
          <Pill>LIVE ADAPTIVE PRACTICE</Pill>
          <h1>{q.skill}</h1>
        </div>
        <div className="sessionProgress">
          <span>Mastery {student.mastery[q.skill]}%</span>
          <Progress value={student.mastery[q.skill]} />
        </div>
      </div>
      <section className="practiceModes" aria-label="Practice modes">
        {([
          ["targeted", "Targeted Practice", "Agent-selected from your highest priority weakness"],
          ["quick", "Quick Drill", "5 questions for a short session"],
          ["custom", "Build Your Own", "Choose skill and difficulty"],
          ["test", "Test Mode", "SAT-style pacing—not official Bluebook"],
        ] as const).map(([key, title, detail]) => <button type="button" key={key} className={mode === key ? "active" : ""} onClick={() => { setMode(key); setTestStarted(false); if (key === "quick") loadQuestion(pool.find((item)=>item.difficulty===1) ?? pool[0]); }}><b>{title}</b><small>{detail}</small></button>)}
      </section>
      <section className="nextBest"><div><Pill tone="coral">NEXT BEST ACTION</Pill><h2>{satDomain[focus]} · {focus}</h2><p>Your weakest high-priority skill · {mode === "quick" ? "5 questions · ~7 min" : mode === "test" ? "timed mixed practice" : "10 questions · ~14 min"}</p></div><span>{priorityLabel(student.mastery[focus], Object.values(student.mistakes).reduce((a,b)=>a+b,0))}</span></section>
      {mode === "custom" && <section className="customSetup" aria-labelledby="custom-setup-title"><div><Pill tone="blue">BUILD YOUR OWN</Pill><h2 id="custom-setup-title">Configure your drill</h2></div><label>Skill<select value={customSkill} onChange={(event)=>setCustomSkill(event.target.value)}>{Object.keys(student.mastery).map((skill)=><option key={skill}>{skill}</option>)}</select></label><label>Difficulty<select value={customDifficulty} onChange={(event)=>setCustomDifficulty(Number(event.target.value) as 1|2|3)}><option value="1">Foundation</option><option value="2">Medium</option><option value="3">Advanced</option></select></label><label>Questions<select value={customCount} onChange={(event)=>setCustomCount(Number(event.target.value))}><option>5</option><option>10</option><option>15</option><option>20</option></select></label><button className="btn primary" type="button" onClick={()=>loadQuestion(bank.find((item)=>item.skill===customSkill&&item.difficulty===customDifficulty) ?? bank.find((item)=>item.skill===customSkill) ?? bank[0])}>Start {customCount}-question drill</button></section>}
      {mode === "test" && !testStarted && <section className="testSetup" aria-labelledby="test-setup-title"><div><Pill tone="blue">TEST MODE SETUP</Pill><h2 id="test-setup-title">Choose your test length</h2><p>Timed, module-based SAT-style practice with a navigator, flagging, calculator access, and review. AcePath is not official Bluebook.</p></div><div className="testLengths">{(Object.entries(testConfigs) as [typeof testLength, typeof testConfig][]).map(([key, config]) => <button type="button" key={key} className={testLength === key ? "active" : ""} onClick={() => setTestLength(key)}><b>{config.title}</b><strong>{config.questions} questions</strong><span>~{config.minutes >= 60 ? `${Math.floor(config.minutes / 60)} hr ${config.minutes % 60} min` : `${config.minutes} min`}</span><small>{config.detail}</small></button>)}</div><button className="btn primary" type="button" onClick={() => { setTestSeconds(testConfig.minutes * 60); setTestQuestionIndex(0); loadQuestion(testQuestions[0],0); setTestStarted(true); }}>Start {testConfig.title} →</button>{testLength === "full" && <small className="officialTiming">Full Length follows the current 98-question, 134-minute SAT structure. A 10-minute break is additional. <a href="https://satsuite.collegeboard.org/sat/whats-on-the-test/structure" target="_blank" rel="noopener noreferrer">College Board structure ↗</a></small>}</section>}
      {mode === "test" && testStarted && <section className="testToolbar" aria-label="Test controls"><div><span>{testModuleLabel}</span><b>Question {testQuestionIndex + 1} of {testConfig.questions}</b></div><time aria-label="Time remaining">{String(Math.floor(testSeconds/60)).padStart(2,"0")}:{String(testSeconds%60).padStart(2,"0")}</time><button type="button" className={flagged ? "active" : ""} onClick={() => setFlagged((value)=>!value)}>{flagged ? "⚑ Flagged" : "⚐ Flag for review"}</button><div className="questionNav" aria-label="Question navigator">{Array.from({length:testConfig.questions},(_,index)=><button type="button" aria-label={`Go to question ${index+1}`} onClick={()=>loadQuestion(testQuestions[index],index)} className={index===testQuestionIndex?"current":""} key={index}>{index+1}</button>)}</div></section>}
      <div className={`practiceLayout ${mode === "test" && !testStarted ? "setupPending" : ""}`}>
        <div>
          <QuestionView
            key={q.id}
            q={q}
            chosen={chosen}
            setChosen={setChosen}
            disabled={checked}
            revealAnswer={checked}
          />
          {!checked && (
            <div className="practiceTools">
              <button className="hintButton" onClick={() => setHintOpen((v) => !v)} aria-expanded={hintOpen}>💡 {hintOpen ? "Hide hint" : "Need a hint?"}</button>
              <div className="confidence" aria-label="Confidence check">
                <span>How sure are you?</span>
                {(["guessing", "unsure", "confident"] as const).map((level) => <button key={level} className={confidence === level ? "active" : ""} onClick={() => setConfidence(level)}>{level === "guessing" ? "😅 Guessing" : level === "unsure" ? "🤔 Unsure" : "😎 Got this"}</button>)}
              </div>
            </div>
          )}
          {hintOpen && !checked && <div className="hintCard" role="status"><b>Hint 1 of 2</b><p>{q.tip}</p></div>}
          {!checked ? (
            <button
              className="btn primary wide"
              disabled={chosen === null}
              onClick={check}
            >
              Check answer
            </button>
          ) : (
            <div
              className={`feedback panel ${correct ? "good" : "bad"}`}
              role="status"
              aria-live="polite"
            >
              <Pill tone={correct ? "mint" : "coral"}>
                {correct ? "✓ CORRECT" : "MISTAKE ANALYZED"}
              </Pill>
              <div className="xpPop">+{correct ? (confidence === "confident" ? 12 : 10) : 2} XP</div>
              <h3>
                {correct
                  ? `Correct — ${String.fromCharCode(65 + q.answer)} is the answer.`
                  : `Not quite — the correct answer is ${String.fromCharCode(65 + q.answer)}: ${q.options[q.answer]}.`}
              </h3>
              <p>{q.explanation}</p>
              <section className="optionReview" aria-labelledby="option-review-title">
                <h4 id="option-review-title">Why each option is right or wrong</h4>
                {q.options.map((option, index) => {
                  const isAnswer = index === q.answer;
                  const wasChosen = index === chosen;
                  return <article className={isAnswer ? "right" : "notRight"} key={`${q.id}-review-${index}`}><span>{String.fromCharCode(65 + index)}</span><div><b>{option} — {isAnswer ? "Correct" : "Incorrect"}{wasChosen && !isAnswer ? " · Your choice" : ""}</b><p>{isAnswer ? q.explanation : wasChosen ? `This choice reflects the “${q.mistake}” pattern. ${q.tip}` : `This option does not produce the required result or relationship. ${q.tip}`}</p></div></article>;
                })}
                <small>These explanations are written for AcePath&apos;s original SAT-style question bank; they are not official College Board mark schemes.</small>
              </section>
              {!correct && <div className="mistakeAnalysis"><div><b>What happened</b><p>{q.mistake}: your choice did not apply {q.tip.toLowerCase()}</p></div><div><b>Mistake type</b><p>{confidence === "confident" ? "Possible misconception" : confidence === "guessing" ? "Guessing / concept gap" : "Process error"}</p></div><div><b>Skill</b><p>{satDomain[q.skill]} → {q.skill}</p></div></div>}
              <div className="tip">
                <b>Tip</b>
                <span>{q.tip}</span>
              </div>
              {transition && (
                <dl className="changeGrid" aria-label="Agent changes caused by this answer">
                  <div><dt>Mastery</dt><dd>{transition.before}% <span>→</span> {transition.after}%</dd></div>
                  <div><dt>Difficulty</dt><dd>{transition.from} <span>→</span> {transition.to}</dd></div>
                  <div><dt>Mistake memory</dt><dd>{transition.mistake ?? "No new pattern"}</dd></div>
                  <div><dt>Study plan</dt><dd>Rebuilt from new evidence</dd></div>
                </dl>
              )}
              <button className="btn primary" onClick={next}>
                {correct && recoveryTarget && q.id !== recoveryTarget.id
                  ? "Retry the target skill →"
                  : correct
                    ? "Next adaptive question"
                    : "Try prerequisite question →"}
              </button>
              {!correct && <div className="feedbackActions"><button type="button" onClick={next}>Try a similar question</button><button type="button" onClick={() => setHintOpen(true)}>Teach me this first</button><a href="/mistakes?demo=1">View scheduled review</a></div>}
              {!correct && hintOpen && <div className="microLesson"><b>60-second lesson</b><p>{q.tip} Work one step at a time, then verify the result against the original expression before choosing.</p></div>}
              {!correct && <p className="reviewScheduled">✓ Added to review: tomorrow, then in 3 and 7 days</p>}
            </div>
          )}
        </div>
        <aside className="practiceAside">
          <div className="agentBubble">
            <div className="agentBubbleHead">
              <span aria-hidden="true">✦</span>
              <Pill tone="violet">AGENT ACTION</Pill>
            </div>
            <p>
              {checked && !correct
                ? `Saved “${q.mistake},” lowered ${q.skill} mastery, rebuilt the plan, and selected a foundation question.`
                : `Selected ${q.skill} at difficulty ${q.difficulty} because it is your lowest current mastery.`}
            </p>
          </div>
          <details className="whyQuestion" open>
            <summary>Why this question?</summary>
            <p>
              {q.skill} is currently your weakest skill at {student.mastery[q.skill]}% mastery.
              This {q.difficulty === 1 ? "foundation" : q.difficulty === 2 ? "medium" : "advanced"} question matches your recent performance
              {q.prerequisite ? ` and checks the prerequisite “${q.prerequisite}.”` : "."}
            </p>
          </details>
          <div className="miniMastery">
            <div>
              <span>Live mastery</span>
              <b>{student.mastery[q.skill]}%</b>
            </div>
            <Progress value={student.mastery[q.skill]} />
            <a href="/agent">Inspect decision evidence →</a>
          </div>
        </aside>
      </div>
    </Frame>
  );
}

function JudgeDemo({ student, setStudent }: { student: Student; setStudent: React.Dispatch<React.SetStateAction<Student>> }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<{ before: number; after: number; correct: boolean; pattern: string; nextDifficulty: string; planChange: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoQuestion = coreBank.find((question) => question.id === "quad-2") ?? coreBank[4];
  const judgeSteps = [
    { label: "Diagnose", title: "Weakness detected from the learner model", detail: `Quadratics is the lowest Math skill at ${student.mastery.Quadratics}%. It is automatically first in today’s plan.` },
    { label: "Answer", title: "Answer the agent-selected question", detail: "This medium factoring question was selected because it matches the current mastery and has not been mastered." },
    { label: "Analyze", title: result ? (result.correct ? "Correct response analyzed" : `Mistake pattern detected: ${result.pattern}`) : "Waiting for evidence", detail: result ? "The same deterministic rule used in Practice updated the learner model." : "Submit an answer to create real evidence." },
    { label: "Adapt", title: result ? `Difficulty changed to ${result.nextDifficulty}` : "Adaptation pending", detail: result ? result.planChange : "AcePath adapts only after an observed answer." },
    { label: "Explain", title: "Decision evidence is auditable", detail: "Trigger, mastery change, difficulty change, mistake pattern, and plan action are stored together." },
  ];
  const current = judgeSteps[step];
  const complete = step === judgeSteps.length - 1;
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const submitJudgeAnswer = () => {
    if (choice === null || busy || result) return;
    const correct = choice === demoQuestion.answer;
    setBusy("Analyzing response, updating mastery, and rebuilding the plan...");
    timerRef.current = setTimeout(() => {
      setStudent((currentStudent) => {
        const before = currentStudent.mastery[demoQuestion.skill];
        const repeated = currentStudent.mistakes[demoQuestion.mistake] ?? 0;
        const after = updateMastery(before, { correct, difficulty: demoQuestion.difficulty, repeatedMistakes: repeated });
        const difficulty = nextDifficulty({ mastery: after, consecutiveCorrect: correct ? 1 : 0, consecutiveIncorrect: correct ? 0 : 1 });
        const nextLabel = ["Foundation", "Medium", "Advanced"][difficulty - 1];
        const mastery = { ...currentStudent.mastery, [demoQuestion.skill]: after };
        const plan = generateStudyPlan(Object.entries(mastery).map(([skill, value]) => ({ skill, mastery: value })));
        const action = correct ? "continue matched Quadratics practice" : `add ${demoQuestion.prerequisite ?? "foundation"} prerequisite tomorrow`;
        setResult({ before, after, correct, pattern: correct ? "No new error pattern" : demoQuestion.mistake, nextDifficulty: nextLabel, planChange: correct ? "Quadratics remains in the plan at matched difficulty." : `${demoQuestion.prerequisite ?? "Foundation practice"} was added before the target retry.` });
        return { ...currentStudent, mastery, answers: [...currentStudent.answers, { questionId: demoQuestion.id, skill: demoQuestion.skill, correct }], mistakes: correct ? currentStudent.mistakes : { ...currentStudent.mistakes, [demoQuestion.mistake]: repeated + 1 }, plan, decisions: [{ id: id(), time: now(), kind: "adapt", title: correct ? `Quadratics mastery increased to ${after}%` : `Quadratics moved to ${nextLabel.toLowerCase()} practice`, reason: correct ? `A correct medium-difficulty response updated mastery from ${before}% to ${after}%.` : `${demoQuestion.mistake} lowered mastery from ${before}% to ${after}%; ${action}.`, evidence: buildDecisionEvidence({ skill: demoQuestion.skill, before, after, previousDifficulty: "Medium", nextDifficulty: nextLabel, trigger: correct ? "correct answer" : "incorrect answer", action }) }, ...currentStudent.decisions] };
      });
      playAnswerSound(correct);
      setStep(2);
      setBusy(null);
    }, 420);
  };
  const advance = () => {
    if (busy) return;
    if (step === 1 && !result) return;
    const nextStep = Math.min(step + 1, judgeSteps.length - 1);
    setStep(nextStep);
  };
  const resetDemo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const seeded = structuredClone(demo);
    setStudent(seeded);
    localStorage.setItem(KEY, JSON.stringify(seeded));
    sessionStorage.setItem(DEMO_SESSION_KEY, "started");
    setBusy(null);
    setChoice(null);
    setResult(null);
    setStep(0);
  };
  return (
    <Frame page="judge">
      <section className="judgeHero">
        <div><Pill tone="violet">PRELOADED JUDGE DEMO</Pill><h1>Your autonomous SAT coach, in one learning loop.</h1><p>Diagnoses weaknesses, builds a personal plan, explains mistakes, tracks mastery, and adapts the next practice—without login, paid APIs, or fragile live calls.</p></div>
        <div className="judgeProgress" aria-label={`Step ${step + 1} of ${judgeSteps.length}`}><b>{step + 1}<small> / {judgeSteps.length}</small></b><Progress value={((step + 1) / judgeSteps.length) * 100} color="blue" /></div>
      </section>
      <section className="judgeTour" aria-labelledby="judge-tour-title">
        <div><span>60-SECOND JUDGE TOUR</span><h2 id="judge-tour-title">One real answer. Five visible agent actions.</h2></div>
        <button type="button" onClick={() => setStep(0)}><b>1</b><span>See Weakness<small>Read the learner model</small></span></button>
        <button type="button" onClick={() => setStep(1)}><b>2</b><span>Answer Question<small>Create real evidence</small></span></button>
        <button type="button" onClick={() => result && setStep(4)} disabled={!result}><b>3</b><span>Inspect Decision<small>Verify every change</small></span></button>
        <button type="button" className="resetDemo" onClick={resetDemo}>Reset Demo</button>
      </section>
      <div className="agentActivity" role="status" aria-live="polite">
        <strong><i className={busy ? "working" : ""} />Agent Actions</strong>
        <div>{judgeSteps.map((item, index) => <span key={item.label} className={index < step ? "done" : index === step ? "active" : ""}>{index < step ? "✓" : index + 1} {item.label}</span>)}</div>
        <p>{busy ?? `Completed: ${current.title}.`}</p>
      </div>
      <ol className="judgeRail" aria-label="Demo stages">
        {judgeSteps.map((item, index) => <li key={item.label} className={index < step ? "done" : index === step ? "active" : ""}><span>{index < step ? "✓" : index + 1}</span><small>{item.label}</small></li>)}
      </ol>
      <section className="judgeStage" aria-live="polite">
        <div className="stageVisual"><span>{step < 2 ? "◎" : step < 4 ? "✎" : "↗"}</span><small>REAL AGENT STATE</small></div>
        <div><Pill>{current.label.toUpperCase()}</Pill><h2>{current.title}</h2><p>{current.detail}</p>
          {step === 0 && <dl className="changeGrid"><div><dt>Weakest Math skill</dt><dd>Quadratics · {student.mastery.Quadratics}%</dd></div><div><dt>Today&apos;s first task</dt><dd>{student.plan[0]?.skill}</dd></div><div><dt>Recurring pattern</dt><dd>Sign errors · {student.mistakes["Sign errors"] ?? 0}×</dd></div><div><dt>Selected difficulty</dt><dd>Medium</dd></div></dl>}
          {step === 1 && <div className="judgeQuestion"><h3>{demoQuestion.prompt}</h3><p className="judgePrompt">Choose any answer. For the clearest adaptation path, choose A—the common distractor.</p>{demoQuestion.options.map((option,index)=><button type="button" className={choice===index?"selected":""} onClick={()=>setChoice(index)} key={option}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}<button type="button" className="btn primary" disabled={choice===null||Boolean(busy)} onClick={submitJudgeAnswer}>{busy ?? "Submit answer and run agent →"}</button></div>}
          {result && step >= 2 && <dl className="changeGrid"><div><dt>Mastery</dt><dd>{result.before}% <span>→</span> {result.after}%</dd></div><div><dt>Difficulty</dt><dd>Medium <span>→</span> {result.nextDifficulty}</dd></div><div><dt>Detected pattern</dt><dd>{result.pattern}</dd></div><div><dt>Study-plan action</dt><dd>{result.planChange}</dd></div></dl>}
          {result && step >= 2 && <div className="answerInsight"><b>{result.correct ? "Why the answer worked" : "Why the answer missed"}</b><p>{demoQuestion.explanation}</p><small>Correct answer: {String.fromCharCode(65+demoQuestion.answer)} · {demoQuestion.options[demoQuestion.answer]}</small></div>}
          {step !== 1 && !complete ? <button className="btn primary" onClick={advance} disabled={Boolean(busy)}>{`Continue: ${judgeSteps[step + 1].label} →`}</button> : complete ? <div className="judgeFinish"><b>Agent loop complete</b><p>Observed answer · updated mastery · remembered pattern · adapted difficulty · rebuilt plan · recorded evidence.</p><div><a className="btn primary" href="/dashboard?demo=1">See updated dashboard</a><a className="btn ghost" href="/agent?demo=1">Inspect decision log</a></div></div> : null}
        </div>
      </section>
      <section className="beforeAfter" aria-label="Adaptive outcome">
        <div><span>BEFORE</span><b>{result?.before ?? 42}%</b><small>Quadratics mastery</small></div><i>→</i><div><span>AFTER THIS ATTEMPT</span><b>{result?.after ?? student.mastery.Quadratics}%</b><small>Live mastery</small></div><div><span>NEXT ACTION</span><b>{result?.nextDifficulty ?? "Pending"}</b><small>{result?.planChange ?? "Answer the selected question"}</small></div><p>All values above come from the same learner state used by Practice, Progress, Study Plan, Dashboard, and Agent Log.</p>
      </section>
    </Frame>
  );
}

function Dashboard({ student }: { student: Student }) {
  const skills = Object.entries(student.mastery).sort((a, b) => a[1] - b[1]);
  const accuracy = student.answers.length
    ? Math.round(
        (student.answers.filter((a) => a.correct).length /
          student.answers.length) *
          100,
      )
    : 0;
  const latest = student.decisions[0];
  const xp = student.answers.length * 10 + Object.values(student.mastery).filter((score) => score >= 80).length * 50;
  const level = Math.floor(xp / 500) + 1;
  const mathEstimate = estimateSectionScore(student.mastery, "math");
  const englishEstimate = estimateSectionScore(student.mastery, "english");
  const combinedEstimate = mathEstimate + englishEstimate;
  const milestone = scoreMilestone(mathEstimate, englishEstimate);
  return (
    <Frame page="dashboard">
      <section className="levelBar" aria-label={`Level ${level}, ${xp % 500} of 500 XP`}>
        <div className="levelOrb">{level}</div><div><span>LEVEL {level} · KNOWLEDGE EXPLORER</span><Progress value={(xp % 500) / 5} color="blue"/><small>{500 - (xp % 500)} XP to the next level</small></div><div className="streakChip">🔥 6 day streak</div>
      </section>
      <div className="welcome">
        <div>
          <Pill>LIVE LEARNER MODEL</Pill>
          <h1>Good morning, {student.name}.</h1>
          <p>
            {student.diagnosticComplete
              ? "Your plan reflects every answer so far."
              : "Complete your diagnostic to activate your study path."}
          </p>
        </div>
        <a className="btn ghost" href="/diagnostic?new=1">
          Start fresh
        </a>
      </div>
      <section className="readiness">
        <div>
          <Pill tone="navy">ACEPATH SAT PRACTICE ESTIMATE</Pill>
          <h2>
            {combinedEstimate} <small>/ 1600</small>
          </h2>
          <p>Internal preparation signal · not an official SAT score prediction</p>
        </div>
        <div className="rings">
          <div className="ring math">
            <b>{mathEstimate}</b>
            <small>Math / 800</small>
          </div>
          <div className="ring rw">
            <b>{englishEstimate}</b>
            <small>English / 800</small>
          </div>
        </div>
      </section>
      <section className={`universityMilestone ${milestone.harvard ? "harvard" : ""}`} aria-label="University score milestone">
        <div className="uniMark" aria-hidden="true">{milestone.harvard ? "H" : "↗"}</div>
        <div><span>CURRENT SCORE MILESTONE</span><h2>{milestone.tier}</h2><p>{milestone.detail}</p></div>
        <div className="milestoneNext">{milestone.next ? <><b>{milestone.next}</b><small>estimated points to next milestone</small></> : <><b>740+ / 770+</b><small>English / Math reported lower bounds</small></>}</div>
        {milestone.harvard && <a href="https://oira.harvard.edu/files/2025/06/HarvardUniversity_CDS_2024-2025.pdf" target="_blank" rel="noopener noreferrer">Official Harvard CDS source ↗</a>}
        <small className="admissionNote">Score-range context only. Universities review applications holistically; a score in range does not imply admission or endorsement.</small>
      </section>
      <div className="dashGrid">
        <section className="panel today">
          <div className="panelHead">
            <div>
              <Pill>TODAY&apos;S GENERATED PLAN</Pill>
              <h2>
                {student.plan.length
                  ? `${student.plan[0].minutes} minutes on ${student.plan[0].skill}`
                  : "Diagnostic needed"}
              </h2>
            </div>
            <a href="/study-plan">Full plan →</a>
          </div>
          {student.plan.slice(0, 3).map((t, i) => (
            <div className={`task ${i === 0 ? "current" : ""}`} key={t.day}>
              <span>{i + 1}</span>
              <div>
                <b>{t.skill}</b>
                <small>
                  {t.questions} questions · {t.minutes} minutes
                  {t.reviewMistakes ? " · mistake review" : ""}
                </small>
              </div>
              {i === 0 && <a href="/practice">Start →</a>}
            </div>
          ))}
        </section>
        <aside className="panel agentPeek">
          <div className="agentTitle">
            <span>✦</span>
            <div>
              <Pill tone="violet">LATEST DECISION</Pill>
              <h3>{latest?.title ?? "Waiting for evidence"}</h3>
            </div>
          </div>
          <p>
            {latest?.reason ??
              "Complete the diagnostic to create your first transparent agent decision."}
          </p>
          <a href="/agent">See decision log →</a>
        </aside>
      </div>
      <section className="questBoard">
        <div><Pill tone="violet">TODAY&apos;S QUESTS</Pill><h2>Small wins. Real momentum.</h2><p>Finish all three to earn the Focus Finisher badge.</p></div>
        <div className="quest"><span>⚡</span><div><b>Warm-up win</b><small>Answer 3 questions · 20 XP</small></div><i>2 / 3</i></div>
        <div className="quest"><span>🧠</span><div><b>Face a weak spot</b><small>Practice your lowest skill · 30 XP</small></div><i>READY</i></div>
        <div className="quest"><span>🎯</span><div><b>Bounce back</b><small>Master a prerequisite · 40 XP</small></div><i>0 / 1</i></div>
      </section>
      <section className="panel skills">
        <div className="panelHead">
          <div>
            <Pill>LIVE SKILL SNAPSHOT</Pill>
            <h2>What to focus on next</h2>
          </div>
          <a href="/progress">View all →</a>
        </div>
        <div className="skillGrid">
          {skills.slice(0, 4).map(([name, score]) => (
            <div className="skill" key={name}>
              <div>
                <b>{name}</b>
                <span>{score}%</span>
              </div>
              <Progress
                value={score}
                color={score < 60 ? "coral" : score > 80 ? "green" : "blue"}
              />
              <small>
                {score < 60
                  ? "Needs attention"
                  : score > 80
                    ? "Strong"
                    : "Developing"}
              </small>
            </div>
          ))}
        </div>
      </section>
      <div className="statRow">
        <div>
          <b>{student.answers.length}</b>
          <small>Questions completed</small>
        </div>
        <div>
          <b>{accuracy}%</b>
          <small>Overall accuracy</small>
        </div>
        <div>
          <b>{Object.values(student.mistakes).reduce((a, b) => a + b, 0)}</b>
          <small>Patterns remembered</small>
        </div>
      </div>
    </Frame>
  );
}

function StudyPlan({ student, setStudent }: { student: Student; setStudent: React.Dispatch<React.SetStateAction<Student>> }) {
  const [view, setView] = useState<"today" | "week" | "calendar">("today");
  const [notice, setNotice] = useState("Built from your current mastery and review schedule.");
  const replan = (minutes: number) => {
    setStudent((current) => {
      const ranked = [...current.plan].sort((a, b) => current.mastery[a.skill] - current.mastery[b.skill]);
      const questions = Math.max(4, Math.round(minutes / 2));
      const plan = ranked.map((task, index) => index === 0 ? { ...task, minutes, questions, reviewMistakes: true } : task);
      return { ...current, plan, decisions: [{ id: id(), time: now(), kind: "plan", title: `Today's plan compressed to ${minutes} minutes`, reason: `${ranked[0]?.skill ?? "The weakest skill"} was retained because it has the highest learning priority.` }, ...current.decisions] };
    });
    setNotice(`AcePath selected the highest-value ${minutes}-minute session and kept scheduled error review.`);
  };
  const skipToday = () => {
    setStudent((current) => ({ ...current, plan: [...current.plan.slice(1), current.plan[0]], decisions: [{ id: id(), time: now(), kind: "plan", title: "Today's task moved to Saturday", reason: "The task was rescheduled without removing its priority or review requirement." }, ...current.decisions] }));
    setNotice("Moved today's highest-priority task later this week. Your plan remains on track.");
  };
  const today = student.plan[0];
  return (
    <Frame page="study-plan">
      <Title
        eyebrow="GENERATED STUDY PLAN"
        title="A week built from your evidence."
        text="The plan is recalculated after every practice answer."
      />
      <section className="planControls">
        <div className="viewTabs" aria-label="Plan view">{(["today","week","calendar"] as const).map((item)=><button type="button" className={view===item?"active":""} onClick={()=>setView(item)} key={item}>{item[0].toUpperCase()+item.slice(1)}</button>)}</div>
        <div className="timeChoice"><b>How much time do you have today?</b>{[10,20,45].map((minutes)=><button type="button" key={minutes} onClick={()=>replan(minutes)}>{minutes} min</button>)}<button type="button" onClick={()=>replan(60)}>Full session</button></div>
      </section>
      <section className="todaySession" aria-live="polite"><div><Pill tone="coral">NEXT BEST ACTION</Pill><h2>Thursday, August 13</h2><p>{today?.minutes ?? 0} minutes planned · Target 1450 · 51 days remaining</p></div><a className="btn primary" href="/practice?demo=1">Start today&apos;s session →</a><p>{notice}</p></section>
      <div className="days">
        {student.plan.slice(0, view === "today" ? 1 : view === "week" ? 5 : 7).map((x, i) => (
          <article className={i === 0 ? "todayDay" : ""} key={x.day}>
            <div className="dayHead">
              <span>DAY</span>
              <b>{x.day}</b>
              {i === 0 && <Pill>TODAY</Pill>}
            </div>
            <div className="dayTask">
              <span>{i + 1}</span>
              <div>
                <b>{x.skill}</b>
                <small>
                  {x.minutes} min · {x.questions} questions
                </small>
              </div>
            </div>
            {x.reviewMistakes && (
              <div className="dayTask">
                <span>↻</span>
                <div>
                  <b>Mistake review</b>
                  <small>Revisit saved pattern</small>
                </div>
              </div>
            )}
            {i === 0 && (
              <a className="btn primary" href="/practice?demo=1">
                Start →
              </a>
            )}
            {i === 0 && <div className="taskControls"><button type="button" onClick={skipToday}>Move</button><button type="button" onClick={skipToday}>Skip</button><button type="button" onClick={()=>replan(10)}>Replace</button></div>}
          </article>
        ))}
      </div>
      <section className="agentStrip">
        <span>✦</span>
        <div>
          <Pill tone="violet">WHY THIS ORDER</Pill>
          <h3>Weakest skills receive more time</h3>
          <p>
            Skills below 50% receive 8 questions and 20 minutes. Strong skills
            move out of the way.
          </p>
        </div>
        <a href="/agent?demo=1">View evidence →</a>
      </section>
    </Frame>
  );
}
function ProgressPage({ student }: { student: Student }) {
  const mathScore = estimateSectionScore(student.mastery, "math");
  const englishScore = estimateSectionScore(student.mastery, "english");
  const estimate = mathScore + englishScore;
  const ranked = Object.entries(student.mastery).sort((a,b)=>a[1]-b[1]);
  const weakest = ranked[0];
  const errorEntries = Object.entries(student.mistakes).sort((a,b)=>b[1]-a[1]);
  return (
    <Frame page="progress">
      <Title
        eyebrow="LIVE MASTERY"
        title="Every answer is visible."
        text="Scores update immediately after diagnostics and practice."
      />
      <section className="scoreSummary">
        <div><Pill tone="blue">ACEPATH ESTIMATE · NOT AN OFFICIAL SCORE</Pill><h2>{estimate}</h2><p>+{Math.max(0, estimate - 1180)} since diagnostic</p></div>
        <dl><div><dt>Math</dt><dd>{mathScore}</dd></div><div><dt>Reading & Writing</dt><dd>{englishScore}</dd></div><div><dt>Target</dt><dd>1450</dd></div><div><dt>Test date</dt><dd>Oct 3 · 51 days</dd></div></dl>
        <a className="btn primary" href="/practice?demo=1">Practice {weakest[0]} →</a>
      </section>
      <section className="scoreHistory" aria-labelledby="score-history"><div><Pill>SCORE HISTORY</Pill><h2 id="score-history">Evidence, not promises</h2></div>{[["Diagnostic","1180","Diagnostic"],["Practice Test 1","1240","Actual practice test"],["Practice Test 2","1280","Actual practice test"],["Current",""+estimate,"AcePath estimate"]].map(([label,score,type])=><div key={label}><span>{label}</span><b>{score}</b><small>{type}</small></div>)}</section>
      <section className="nextBest progressNext"><div><Pill tone="coral">BIGGEST OPPORTUNITY</Pill><h2>{satDomain[weakest[0]]} · {weakest[0]}</h2><p>{weakest[1]}% mastery · {priorityLabel(weakest[1], errorEntries[0]?.[1] ?? 0)} because recent mistakes repeat in this area.</p></div><a className="btn primary" href="/practice?demo=1">Practice now</a></section>
      <section className="panel allSkills">
        <div className="panelHead"><div><Pill>SAT DOMAIN MASTERY</Pill><h2>What you know—and what comes next</h2></div></div>
        {ranked.map(([name, score]) => <details className="domainRow" key={name} open={score < 60}><summary><span>{skillArea[name]} · {satDomain[name]}</span><b>{name}</b><Progress value={score} color={score < 60 ? "coral" : score > 80 ? "green" : "blue"}/><strong>{score}% · {masteryLabel(score)}</strong></summary><div><p><b>{priorityLabel(score, Object.values(student.mistakes).reduce((a,b)=>a+b,0))}</b> · {score < 60 ? "Frequently missed recently; targeted practice stays in the plan." : "Performance is stable; AcePath will maintain this skill through spaced review."}</p><a href="/practice?demo=1">Practice this skill →</a></div></details>)}
      </section>
      <section className="errorLog panel"><div className="panelHead"><div><Pill tone="coral">AUTOMATIC ERROR LOG</Pill><h2>Patterns AcePath is tracking</h2></div><a href="/mistakes?demo=1">Related questions →</a></div><div role="table">{errorEntries.map(([name,count],index)=><div className="errorRow" role="row" key={name}><b role="cell">{name}</b><span role="cell">{name.includes("Sign")?"Process error":name.includes("Inference")?"Misread question":"Concept gap"}</span><strong role="cell">{count}×</strong><small role="cell">{index===0?"Increasing":"Improving"}</small></div>)}</div><blockquote><b>AcePath noticed</b><p>{errorEntries[0]?.[1] ?? 0} recent mistakes match “{errorEntries[0]?.[0] ?? "no repeated pattern"}.” The next session prioritizes accuracy before difficulty.</p></blockquote></section>
    </Frame>
  );
}
function Mistakes({ student }: { student: Student }) {
  const entries = Object.entries(student.mistakes).sort((a, b) => b[1] - a[1]);
  return (
    <Frame page="mistakes">
      <Title
        eyebrow="MISTAKE MEMORY"
        title="Mistakes become future practice."
        text="Repeated patterns increase the mastery penalty and influence prerequisites."
      />
      <div className="memoryGrid">
        {entries.map(([name, count]) => (
          <article key={name}>
            <div className="memoryIcon coral">!</div>
            <div>
              <Pill tone="coral">
                {count} {count === 1 ? "OCCURRENCE" : "OCCURRENCES"}
              </Pill>
              <h2>{name}</h2>
              <p>
                Saved from an incorrect answer and available to the adaptive
                selector.
              </p>
              <small>
                Next review: {scheduleMistakeReview({ occurrences: count }).intervalDays === 0 ? "next session" : `in ${scheduleMistakeReview({ occurrences: count }).intervalDays} days`}
              </small>
            </div>
            <a href="/practice">Practice →</a>
          </article>
        ))}
        {!entries.length && (
          <section className="panel empty">
            <h2>No patterns yet</h2>
            <p>Incorrect practice answers will appear here automatically.</p>
          </section>
        )}
      </div>
    </Frame>
  );
}
function Agent({ student }: { student: Student }) {
  const weakest = Object.entries(student.mastery).sort((a,b)=>a[1]-b[1])[0];
  return (
    <Frame page="agent">
      <Title
        eyebrow="DECISION AUDIT TRAIL"
        title="Nothing changes silently."
        text="Each rule-controlled action records what changed and the evidence behind it."
      />
      <section className="nextBest"><div><Pill tone="violet">NEXT BEST ACTION</Pill><h2>{weakest[0]} targeted practice</h2><p>{weakest[1]}% mastery · selected from current learner evidence and recurring errors.</p></div><a className="btn primary" href="/practice?demo=1">Start 12-minute session</a></section>
      <div className="agentLayout">
        <section className="decisionList" aria-live="polite">
          {student.decisions.map((d) => (
            <article key={d.id}>
              <div
                className={`decisionIcon ${d.kind === "adapt" ? "coral" : d.kind === "plan" ? "violet" : d.kind === "diagnostic" ? "blue" : "green"}`}
              >
                ✦
              </div>
              <div>
                <small>
                  {d.time} · {d.kind}
                </small>
                <h3>{d.title}</h3>
                <p>{d.reason}</p>
                {d.evidence && (
                  <dl className="evidence">
                    <div><dt>Mastery</dt><dd>{d.evidence.masteryBefore}% → {d.evidence.masteryAfter}%</dd></div>
                    <div><dt>Difficulty</dt><dd>{d.evidence.previousDifficulty} → {d.evidence.nextDifficulty}</dd></div>
                    <div><dt>Action</dt><dd>{d.evidence.action}</dd></div>
                  </dl>
                )}
              </div>
            </article>
          ))}
          {!student.decisions.length && (
            <article>
              <div>
                <h3>No decisions yet</h3>
                <p>Complete the diagnostic to begin the audit trail.</p>
              </div>
            </article>
          )}
        </section>
        <aside className="howAgent">
          <Pill tone="navy">DETERMINISTIC CORE</Pill>
          <h2>Reliable by design.</h2>
          <div>
            <span>1</span>
            <p>
              <b>Observe</b>
              <br />
              Correctness, difficulty, skill, and repeated patterns.
            </p>
          </div>
          <div>
            <span>2</span>
            <p>
              <b>Update</b>
              <br />
              Bounded mastery rules update a 0–100 score.
            </p>
          </div>
          <div>
            <span>3</span>
            <p>
              <b>Act</b>
              <br />
              Difficulty, prerequisite, and weekly plan change.
            </p>
          </div>
          <p className="llmNote">
            An optional AI provider writes explanations. It never controls
            scores or learning-path decisions.
          </p>
        </aside>
      </div>
    </Frame>
  );
}
export function AcePathApp({ page }: { page: Page }) {
  const { student, setStudent, ready, reset } = useStudent();
  if (!ready)
    return (
      <div className="loading" role="status">
        Loading your learning path…
      </div>
    );
  if (page === "home") return <><QuillCursor /><Landing /></>;
  if (page === "diagnostic")
    return (
      <Diagnostic student={student} setStudent={setStudent} reset={reset} />
    );
  if (page === "practice")
    return <Practice student={student} setStudent={setStudent} />;
  if (page === "dashboard") return <Dashboard student={student} />;
  if (page === "judge") return <JudgeDemo student={student} setStudent={setStudent} />;
  if (page === "study-plan") return <StudyPlan student={student} setStudent={setStudent} />;
  if (page === "progress") return <ProgressPage student={student} />;
  if (page === "mistakes") return <Mistakes student={student} />;
  return <Agent student={student} />;
}
