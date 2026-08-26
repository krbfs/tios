# E2E quiz (браузер): каталог сценариев

Playwright открывает Chromium, проходит `/test/start` → 75 ответов на `/test/take` → страница `/quiz/result`, и сверяет психотип (UI + `by-encdata`).

## Запуск

```bash
cd tc_26

# smoke (4 сценария) + локальный build/server на :3101
npm run test:e2e-quiz

# быстрее локально: next dev без production build
npm run test:e2e-quiz:dev

# все сценарии из таблицы ниже
E2E_QUIZ_ALL=1 npm run test:e2e-quiz

# выбранные id
E2E_QUIZ_CASES=individualist,empath,mixed_zeros npm run test:e2e-quiz

# против уже запущенного сервера / prod
SKIP_BUILD=1 npm run test:e2e-quiz
BASE_URL=https://tios-test.com npm run test:e2e-quiz

# с окном браузера
HEADED=1 npm run test:e2e-quiz
```

Нужны `DATABASE_URL` / вопросы в Neon (как для обычного прохождения теста).

**Тайминги:** ответы кликаются в UI; `time_per_question` на `POST /api/test/submit` подменяется на «человеческие» (≥120 с суммарно), иначе каждый сценарий ждал бы ≥2 минуты из‑за antibot.

Исходники: `scripts/test-e2e-quiz.ts`, `scripts/e2e-quiz-fixtures.ts`.

## Список сценариев

| id | Что делает | Ожидаемый психотип | UI (`#psychotype-title`) | Доп. проверки шкал |
|---|---|---|---|---|
| `individualist` | Блок T/A = +2, S/Sp = +2 (AGG+SPO) | `individualist` | содержит «Индивидуалист» | aggression ≥ 30, spontaneity ≥ 30 |
| `innovator` | S/Sp = +2, E/I = −2 (SPO+EXT) | `innovator` | «Инноватор» | spontaneity ≥ 30, extraversion ≥ 30 |
| `influencer` | E/I = −2, L/R = −2 (EXT+LAB) | `influencer` | «Лидер мнений» | extraversion ≥ 30, lability ≥ 30 |
| `aesthete` | L/R = −2, T/A = −2 (LAB+ANX) | `aesthete` | «Эстет» | lability ≥ 30, anxiety ≥ 30 |
| `conservative` | T/A = −2, S/Sp = −2 (ANX+SEN) | `conservative` | «Консерватор» | anxiety ≥ 30, sensitivity ≥ 30 |
| `empath` | S/Sp = −2, E/I = +2 (SEN+INT) | `empath` | «Эмпат» | sensitivity ≥ 30, introversion ≥ 30 |
| `analyst` | E/I = +2, L/R = +2 (INT+RIG) | `analyst` | «Аналитик» | introversion ≥ 30, rigidity ≥ 30 |
| `pragmatist` | L/R = +2, T/A = +2 (RIG+AGG) | `pragmatist` | «Прагматик» | rigidity ≥ 30, aggression ≥ 30 |
| `mixed_zeros` | Все 75 ответов = 0 | `mixed` (MVP) | «Смешанный тип» | — |
| `demo_influencer` | Вектор `getDemoAnswers()` | `influencer` | «Лидер мнений» | extraversion ≥ 20, lability ≥ 15 |

### Smoke по умолчанию

Без `E2E_QUIZ_ALL` / `E2E_QUIZ_CASES` гоняются только:

1. `individualist`
2. `empath`
3. `mixed_zeros`
4. `demo_influencer`

## Что именно проверяется в каждом прогоне

1. Consent + antibot start (dwell challenge) → переход на take.
2. Все 15 страниц × 5 вопросов: выбор radio на desktop viewport.
3. Submit → редирект на `/quiz/result?encdata=…`.
4. `#psychotype-title` содержит ожидаемое русское имя.
5. Ответ `GET /api/results/by-encdata`: `psychotype_code` и минимумы шкал (если заданы).

## Пока не покрыто (V1)

- `complex` / `triad_variant` left|right — нужны `TIOS_V1_PROFILES=true` на сервере и отдельные фикстуры; добавить после включения флага.
- Подтипы Эмпата по S/N и контент-блоки `#11–13`.
