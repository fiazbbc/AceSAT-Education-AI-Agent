export type MasteryMap = Record<string, number>;
const weights = { math: { "Linear equations": .34, Quadratics: .31, Percentages: .20, Geometry: .15 }, english: { Transitions: .32, Punctuation: .36, Inference: .32 } };
const clamp = (value:number, min:number, max:number) => Math.max(min, Math.min(max, value));
function weightedMastery(mastery:MasteryMap, section:keyof typeof weights) { return Object.entries(weights[section]).reduce((sum,[skill,weight]) => sum + (mastery[skill] ?? 50) * weight, 0); }
/** Internal practice estimate; deliberately rounded to 10 and not an official SAT conversion. */
export function estimateSectionScore(mastery:MasteryMap, section:"math"|"english") { const value=weightedMastery(mastery,section); return clamp(Math.round((200 + 600 * Math.pow(value / 100, 1.08)) / 10) * 10, 200, 800); }
export function scoreMilestone(math:number, english:number) {
  const combined=math+english;
  if(math>=770 && english>=740) return {tier:"Harvard reported range",detail:"Both section estimates meet Harvard's 2024–25 enrolled-student 25th-percentile marks.",next:null,harvard:true};
  if(combined>=1450) return {tier:"Most-selective score territory",detail:"Your practice estimate is in a very strong testing band.",next:Math.max(0,770-math)+Math.max(0,740-english),harvard:false};
  if(combined>=1300) return {tier:"Highly selective territory",detail:"Your practice estimate is becoming competitive at many selective universities.",next:1450-combined,harvard:false};
  if(combined>=1150) return {tier:"Strong university pathway",detail:"Your practice estimate is building a competitive foundation for many four-year universities.",next:1300-combined,harvard:false};
  if(combined>=1000) return {tier:"University-ready foundation",detail:"You are building toward a broad range of four-year university score bands.",next:1150-combined,harvard:false};
  return {tier:"Foundation-building",detail:"Strengthen the weakest skills first; every mastery gain moves the estimate.",next:1000-combined,harvard:false};
}
