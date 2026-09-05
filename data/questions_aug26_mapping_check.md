# Mapping check — questions_aug26 vs sep_2nd docx

Date: 2026-09-03  
Sources: `data/questions_aug26.json`, `source_sep_2nd/Текст_опросника_и_математика_окончательно.docx`, `src/lib/calculations.ts`.

## Result: OK — scoring keys unchanged; question texts/labels aligned

### aug_26 → sep_2 diff (question table only)

| id | Change |
|----|--------|
| 8 | factor `3.2` → `3.1` (texts same) |
| 13 | factor `3.3` → `3.1` + **new left/right texts** |
| 35 | factor label fixed + **new left/right texts** |
| 43 | factor `3.4` → `3.3` (texts same) |
| 56 | factor `1.5` → `1.4` (texts same) |

§ «Факторы и ключи» in docx **unchanged** between aug_26 and sep_2.

### Block arrays (`calculations.ts`) — no change

| Block | Question IDs |
|-------|----------------|
| EI | 1,6,11,16,21,26,31,36,41,46,51,56,61,66,71 |
| TA | 2,7,12,17,22,27,32,37,42,47,52,57,62,67,72 |
| SS | 3,8,13,18,23,28,33,38,43,48,53,58,63,68,73 |
| LR | 5,10,15,20,25,30,35,40,45,50,55,60,65,70,75 |
| Work / block 4 | 4,9,14,19,24,29,34,39,44,49,54,59,64,69,74 |

Block 4 inverted pairs still: **19,24,29** and **34,39,44**.

### Verify

```bash
cd tc_26 && npm run verify:questions
```

Compares all 75 rows: texts + sub_factor codes vs sep docx parse.

### Import

```bash
cd tc_26 && npm run db:import-questions -- --json data/questions_aug26.json
```

### Open: 3.1 label

Question table: «Структурированность среды». Keys table: «Структурированность внешней среды». Dump uses question-table form.
