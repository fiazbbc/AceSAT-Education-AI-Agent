export type BankQuestion = {
  id: string;
  skill: string;
  area: "Math" | "Reading & Writing";
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  tip: string;
  mistake: string;
  prerequisite?: string;
};

const level = (index: number): 1 | 2 | 3 => ((index % 3) + 1) as 1 | 2 | 3;
const money = (value: number) => `$${value.toFixed(value % 1 ? 2 : 0)}`;

function buildMathBank(): BankQuestion[] {
  const questions: BankQuestion[] = [];
  for (let i = 0; i < 40; i += 1) {
    const x = 3 + (i % 13), a = 2 + (i % 7), b = 3 + ((i * 4) % 17), total = a * x + b;
    questions.push({ id:`lin-gen-${i + 1}`, skill:"Linear equations", area:"Math", difficulty:level(i), prompt:`Solve ${a}x + ${b} = ${total}.`, options:[String(x + 2),String(x),String(x - 2),String(x + a)], answer:1, explanation:`Subtract ${b} to get ${a}x = ${a * x}, then divide by ${a}. Therefore, x = ${x}.`, tip:"Undo the constant term before dividing by the coefficient.", mistake:"Inverse operations", prerequisite:i % 3 === 2 ? "Inverse operations" : undefined });

    const p = 2 + (i % 8), q = 3 + ((i * 3) % 9), sum = p + q, product = p * q;
    questions.push({ id:`quad-gen-${i + 1}`, skill:"Quadratics", area:"Math", difficulty:level(i + 1), prompt:`Which expression is equivalent to x² + ${sum}x + ${product}?`, options:[`(x + ${p - 1})(x + ${q + 1})`,`(x + ${p})(x + ${q})`,`(x − ${p})(x − ${q})`,`(x + 1)(x + ${product})`], answer:1, explanation:`The numbers ${p} and ${q} multiply to ${product} and add to ${sum}, so the expression factors as (x + ${p})(x + ${q}).`, tip:"Check both the product and the sum of the factor pair.", mistake:"Quadratic factoring", prerequisite:"Factor pairs" });

    const original = 40 + (i % 10) * 10, rates = [10,20,25,30,40], rate = rates[i % rates.length], discount = original * rate / 100, sale = original - discount;
    questions.push({ id:`pct-gen-${i + 1}`, skill:"Percentages", area:"Math", difficulty:level(i + 2), prompt:`A ${money(original)} item is discounted ${rate}%. What is its sale price?`, options:[money(discount),money(sale),money(original + discount),money(original - rate)], answer:1, explanation:`The discount is ${rate}% of ${money(original)}, or ${money(discount)}. Subtracting gives a sale price of ${money(sale)}.`, tip:`A ${rate}% discount means paying ${100 - rate}% of the original price.`, mistake:"Percent change", prerequisite:"Percent of a quantity" });

    const w = 4 + (i % 9), h = 3 + ((i * 2) % 8), geometryType = i % 2;
    questions.push(geometryType === 0
      ? { id:`geo-gen-${i + 1}`, skill:"Geometry", area:"Math", difficulty:level(i), prompt:`A rectangle has length ${w} units and width ${h} units. What is its area?`, options:[String(w + h),String(2 * (w + h)),String(w * h),String(w * h + w)], answer:2, explanation:`Rectangle area is length × width, so ${w} × ${h} = ${w * h} square units.`, tip:"Area measures the space inside a figure; multiply length by width.", mistake:"Area vs. perimeter" }
      : { id:`geo-gen-${i + 1}`, skill:"Geometry", area:"Math", difficulty:level(i), prompt:`A right triangle has legs ${3 * (1 + i % 4)} and ${4 * (1 + i % 4)}. What is the hypotenuse?`, options:[String(4 * (1 + i % 4)),String(5 * (1 + i % 4)),String(6 * (1 + i % 4)),String(7 * (1 + i % 4))], answer:1, explanation:`The side lengths are a multiple of the 3-4-5 right triangle, so the hypotenuse is ${5 * (1 + i % 4)}.`, tip:"Use a² + b² = c², where c is the hypotenuse.", mistake:"Pythagorean theorem", prerequisite:"Squares and roots" });
  }
  return questions;
}

const transitionScenarios = [
  ["The first trial produced inconsistent results", "the researchers repeated it with calibrated equipment", "Therefore", "cause and effect"],
  ["The coastal town receives heavy winter rain", "its summers are usually dry", "However", "contrast"],
  ["The museum extended its weekend hours", "Saturday attendance increased", "As a result", "cause and effect"],
  ["Several native plants tolerate drought", "sagebrush can survive months with little rainfall", "For example", "example"],
  ["The two novels use different narrators", "both explore the effects of memory", "Nevertheless", "contrast"],
  ["The team reduced the battery's weight", "it preserved the device's operating time", "Moreover", "addition"],
  ["The archive digitized its oldest maps", "researchers abroad could examine them", "Consequently", "cause and effect"],
  ["Many insects are active during daylight", "certain moths emerge only after sunset", "By contrast", "contrast"],
  ["The composer often borrowed sounds from nature", "one movement imitates falling rain", "For instance", "example"],
  ["The material is inexpensive to produce", "it is also fully recyclable", "Additionally", "addition"],
];

function buildReadingBank(): BankQuestion[] {
  const questions: BankQuestion[] = [];
  for (let i = 0; i < 40; i += 1) {
    const [first, second, correct, relation] = transitionScenarios[i % transitionScenarios.length];
    const wrong = relation === "contrast" ? ["Therefore","For example","Similarly"] : relation === "example" ? ["However","Therefore","Meanwhile"] : ["However","For example","In contrast"];
    questions.push({ id:`trans-gen-${i + 1}`, skill:"Transitions", area:"Reading & Writing", difficulty:level(i), prompt:`${first}. ___, ${second}.`, options:[wrong[0],correct,wrong[1],wrong[2]], answer:1, explanation:`“${correct}” correctly signals the ${relation} relationship between the two statements.`, tip:"State the logical relationship in your own words before comparing choices.", mistake:`${relation[0].toUpperCase()}${relation.slice(1)} transitions`, prerequisite:"Transition logic" });

    const subject = ["The robotics club","The neighborhood garden","The student newspaper","The astronomy class","The debate team"][i % 5];
    const object = ["one priority","a clear objective","one final task","a single request"][i % 4];
    questions.push({ id:`punc-gen-${i + 1}`, skill:"Punctuation", area:"Reading & Writing", difficulty:level(i + 1), prompt:`Choose the punctuation that best completes the sentence: ${subject} had ${object} ___ to present its findings clearly.`, options:[",",";",":"," and"], answer:2, explanation:"A colon correctly introduces an explanation of the complete clause that comes before it.", tip:"A colon may follow a complete clause to introduce an explanation or specification.", mistake:"Colon vs. comma", prerequisite:"Complete clauses" });

    const group = ["seedlings","solar panels","commuters","honeybees","library visitors"][i % 5];
    const condition = ["blue light","a new coating","an express route","native flowers","extended hours"][i % 5];
    const before = 12 + i, after = before + 5 + (i % 6);
    questions.push({ id:`infer-gen-${i + 1}`, skill:"Inference", area:"Reading & Writing", difficulty:level(i + 2), prompt:`In a controlled observation, ${group} exposed to ${condition} showed an average measure of ${after}, compared with ${before} for the comparison group. Which conclusion is best supported?`, options:[`${condition} always produces the same result.`,`${condition} may be associated with a higher measured outcome for ${group}.`,`The comparison group was measured incorrectly.`,`No other factor could ever affect ${group}.`], answer:1, explanation:`The observed difference supports a cautious association. It does not justify an absolute claim or rule out every other factor.`, tip:"Prefer the conclusion that stays within the evidence and avoids absolute language.", mistake:"Overstated inference", prerequisite:"Evidence boundaries" });
  }
  return questions;
}

export const expandedQuestionBank: BankQuestion[] = [...buildMathBank(), ...buildReadingBank()];
