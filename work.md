# TIOS tc_26 — внутренняя спецификация (фрагменты)

## Компенсаторные проверки (sep_5th)

Источник ответов методолога: `source_sep_5th/Отвечаю по пунктам.docx`.

### MVP (реализовано)

| # | Правило |
|---|---|
| Q1 | Пиковая тенденция = max **внутри пары** типа; при равенстве — фиксированный приоритет (`PEAK_TIE_BREAK` в `compensatory-checks.ts`) |
| Q2 | MVP: упрощённые формулы; полная модель comp vs aggrav — **V1.1** (`eng-4`, `TIOS_COMPENSATORY_FULL=1`) |
| Q3 | Порог `> 2` на сумме 3 ответов подфактора (0…6), т.е. сумма ≥ 3 (`SUBFACTOR_MODERATE_MIN = 2`) |
| Q4 | Вопросы 35, 40, 45 → подфактор **5.3** (новизна / LAB), не 3.5 |
| Q5 | 3.2 и 3.4 — отдельные triplet; объединение `(3.2 + 3.4) > 4` для Инноватора |
| Q6 | Блок 4.2 (19, 24, 29) — **не** RIG/LAB; в MVP не участвует; в full mode — result/process triplet |
| Q7 | Только 8 чистых кодов + разрыв **2-я − 3-я** шкала ≥ **6** (`isPureProfileForCompensatory`); mixed/complex → блок скрыт |

### Код

- `src/lib/subfactors.ts` — triplet scores, `SUBFACTOR_DEFINITIONS`, `SUBFACTOR_QUESTION_FACTOR_PREFIX`
- Подфакторы **не** в `raw_scores` основного pipeline — считаются в `calculateSubfactorScores()` для compensatory (открытый пункт чеклиста data-1)
- Полный реестр 1.1–5.5 (15×3 вопроса) **не** закрыт — только triplet-коды из docx/formulas (data-5)
- `src/lib/compensatory-checks.ts` — движок MVP + full mode (`FULL_FACTOR_SETS`, `TIOS_COMPENSATORY_FULL=1`)
- Флаг prod: `TIOS_COMPENSATORY_CHECKS=1`; full: `TIOS_COMPENSATORY_FULL=1`; в `NODE_ENV=development` checks включены всегда
- Demo encdata: `force: true` (игнорирует gap Q7 для «Пример результата»)
