# Mapping check — questions_aug26 vs calculations.ts

Date: 2026-08-26  
Sources: `data/questions_aug26.json`, `src/lib/calculations.ts`, keys table in questionnaire docx.

## Result: OK — no code mapping changes required

| Block | Question IDs | Match |
|---|---|---|
| EI (extraversion/introversion) | 1,6,11,16,21,26,31,36,41,46,51,56,61,66,71 | yes |
| TA (anxiety/aggression) | 2,7,12,17,22,27,32,37,42,47,52,57,62,67,72 | yes |
| SS (sensitivity/spontaneity) | 3,8,13,18,23,28,33,38,43,48,53,58,63,68,73 | yes |
| LR (lability/rigidity) | 5,10,15,20,25,30,35,40,45,50,55,60,65,70,75 | yes |
| Work / block 4 | 4,9,14,19,24,29,34,39,44,49,54,59,64,69,74 | yes |

Block 4 inverted pairs (A=RIG, B=LAB) still: **19,24,29** and **34,39,44** — matches doc note and `inverted: true` in code.

## Doc quirk fixed in dump only

Question **35** in the question-text table was labeled factor `3.5`, but the **keys** table places 35 in `5.3 Отношение к новизне` (LR). Dump factor corrected; scoring keys unchanged.

## Import + smoke (2026-08-26)

- `npm run db:import-questions -- --json data/questions_aug26.json` → **75 updated** on Neon (`ep-plain-brook…`, prod DB for tc_26).
- Spot-check DB vs dump: ids **1, 38, 75** — texts match.
- `vitest` `calculations.test.ts` + `questions/route.test.ts` — **34 passed** (API test mocks strings; no hardcoded real wording to update).
