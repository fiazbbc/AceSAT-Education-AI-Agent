import test from "node:test";
import assert from "node:assert/strict";
import { estimateSectionScore, scoreMilestone } from "../lib/readiness.ts";
const mastery=(value)=>({"Linear equations":value,Quadratics:value,Percentages:value,Geometry:value,Transitions:value,Punctuation:value,Inference:value});
test("section estimates stay on the 200–800 scale and rise monotonically",()=>{const low=estimateSectionScore(mastery(20),"math"),mid=estimateSectionScore(mastery(50),"math"),high=estimateSectionScore(mastery(90),"math");assert.ok(low>=200&&high<=800);assert.ok(low<mid&&mid<high);assert.equal(mid%10,0)});
test("Harvard milestone requires both reported section lower bounds",()=>{assert.equal(scoreMilestone(770,740).harvard,true);assert.equal(scoreMilestone(800,730).harvard,false);assert.equal(scoreMilestone(760,800).harvard,false)});
