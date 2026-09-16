# TIOS / ТИОС — полный handout для AI-агента

Документ для агента, который должен **понять, изменять и деплоить** систему без «угадывания».  
Рабочая директория: **`tc_26/`** внутри репозитория `tc`.  
Прод: **https://tios-test.com** · поддержка: **support@tios-test.com** · партнёр: **Insighter** (https://insighter.by/).

---

## 0. Что это за продукт

**TIOS / ТИОС** — веб-диагностика **управленческого профиля** (психотип + 8 шкал + 5 системных свойств).

- **75 пар утверждений**, шкала ответа **−2…+2**
- **≈ 10 минут**, регистрация **не обязательна**
- Результат доступен по **ссылке с encdata** (ответы зашиты в URL) или в **личном кабинете** после входа
- Это **не медицинский диагноз** — информационно-рекомендательный инструмент

### Расшифровка аббревиатуры (канон)

Аббревиатура **TIOS / ТИОС сохраняется и на русском, и на английском**:

| Язык | Варианты |
|------|----------|
| RU | Тест Индивидуальных Операционных **Сценариев** / **Стратегий** / **Стилей**; Тест Индивидуальной Оценки **Смагина** |
| EN | **T**est of **I**ndividual **O**perational **S**cenarios (Strategies, Styles); **T**he **I**ndividual **O**perational **S**ystem (by Oleg Smagin) |

Источник текстов: `src/lib/tios-acronym.ts`, страница `/about`.

### Автор методики

**Смагин Олег Анатольевич** — автор TIOS / ТИОС, **20+ лет** в поведенческой психологии.  
**С 2025** — Chief Science Officer **Insighter** (это **отдельная** должность, не дата создания методики).  
Страница: `/author` · данные: `src/lib/author.ts`.

---

## 1. Иерархия источников (обязательно)

При конфликте:

1. **NAVIGATOR** (`source_current/NAVIGATOR финал.docx` v10.0 / правила в `.cursor/rules/navigator-domain.mdc`)
2. **ТЗ** (`source_current/ФИНАЛЬНОЕ_РАЗВЁРНУТОЕ_ТЕХНИЧЕСКОЕ_ЗАДАНИЕ (2).docx` v5.0) — архитектура, БД, API
3. **Вопросник и математика** (`source_current/Текст_опросника_и_математика_финал.docx` — окончательно)
4. **Файлы контента** в `source_current/` — тексты режимов

**Каскад v4.0 (реализовано в коде, сент. 2026):** пока источник правды для математики/контента триад — `source_sep_16th/` («ТОЧНЫЙ_ТЕКСТ…», «ОПИСАНИЯ_ТРИАД…»). После переноса в `source_current/` — как обычно по иерархии выше.

**NAVIGATOR побеждает ТЗ.**  
**При любом сомнении — спросить пользователя**, не выбирать формулу/текст самостоятельно.

**Roadmap:** MVP = 8 чистых типов без каскада (`mixed`). **V1 в проде** (`TIOS_V1_PROFILES=true`): 5-уровневый каскад (`profile-cascade.ts`), `triad_variant` = `left` | `right` | `detected`, поля `primary_type`, `secondary_type`, `profile_complexity`, `cascade_level_used`, `cluster_tendencies`; `complex` только если каскад не сработал (в ТЗ ожидание <3%); суб-индексы Эмпата S/N; `insighter_you`. Шестая спецтриада (Бендер) в docx расходится — в коде **5 триад**, без `individualist` EXT+SPO+AGG. V2 опц. = полные триады четырьмя тенденциями.

Дополнительно в репозитории:

- `work.md` — рабочие правила проекта (маппинг, режимы, запреты) — в корне репозитория `tc/`
- `seo.md` — SEO / LLM-discoverability
- `deploy/DOMAIN.md` — домен и DNS

---

## 2. Стек и архитектура

| Слой | Технология |
|------|------------|
| Frontend (лендинг, about, author) | **Next.js 15** + React 19 + Tailwind 4 |
| Frontend (тест, результат, кабинет, админ) | **Статический HTML** + vanilla JS + Chart.js |
| API | Next.js **App Router** `src/app/api/**/route.ts` |
| БД | **Neon Postgres** + **Prisma** |
| Auth | JWT (jose) + bcrypt, Bearer token |
| Деплой | **Google Cloud Run** + Cloud Build + Docker (`output: standalone`) |
| Аналитика | GA4 (клиент gtag + опционально Data API на сервере) |

### Гибридная модель (важно)

Не всё — React-страницы. Маршрутизация смешанная (`next.config.ts`):

| URL пользователя | Реальная отдача |
|------------------|-----------------|
| `/` | Next.js `src/app/page.tsx` |
| `/about`, `/author` | Next.js pages |
| `/test` | redirect → `/test/start.html` |
| `/test/take` | redirect → `/test/take.html` |
| `/login`, `/cabinet`, `/admin` | redirect → `public/*.html` |
| `/quiz/result?encdata=…` | **rewrite** → `/results.html` |
| `/results` | Next redirect/page → demo |

**Тест и результат — главный UX в `public/`**, не в React-компонентах.

---

## 3. Структура репозитория

```
tc_26/
├── AGENT_HANDOUT.md          ← этот файл
├── work.md                   ← доменные правила (корень tc/, не tc_26/)
├── seo.md                    ← SEO
├── prisma/schema.prisma      ← модели БД
├── src/
│   ├── app/                  ← Next pages + API routes
│   ├── components/           ← Header, Footer, JsonLd, …
│   └── lib/
│       ├── calculations.ts   ← ★ ВСЯ МАТЕМАТИКА
│       ├── compatibility.ts  ← матрица 8×8, GET /api/compatibility
│       ├── teams.ts          ← команды до 9 результатов
│       ├── modes.ts          ← content_mode, ALLOWED_MODES
│       ├── encdata.ts        ← кодирование ответов в URL
│       ├── psychotypes.ts    ← названия шкал/психотипов UI
│       ├── seo.ts            ← ★ ВСЕ SEO-СТРОКИ
│       ├── author.ts, tios-acronym.ts
│       └── api/              ← auth, results, content helpers
├── public/
│   ├── test/start.html       ← согласие + старт
│   ├── test/take.html        ← прохождение 75 вопросов
│   ├── results.html          ← ★ страница результата
│   ├── teams.html, team.html, teams/accept.html
│   ├── login.html, cabinet.html
│   ├── admin/*.html          ← админ-панель (+ teams, compatibility)
│   ├── css/test.css, admin.css
│   └── js/                   ← block-templates, psychotypes, auth
├── chrome/                   ← шаблоны header/footer
│   ├── header-public.html
│   └── footer.html
├── scripts/
│   ├── deploy.py             ← ★ деплой GCP
│   ├── assemble-chrome.ts    ← сборка chrome в HTML
│   ├── import_questions.ts, import_content.ts
│   ├── import_all.ts         ← db:import-all (цепочка всех импортов)
│   ├── verify_content_modes.ts, verify_demo_encdata.ts
│   └── …
├── data/*_registry.json      ← JSON-реестры контента (5 режимов)
├── cloudbuild.yaml
├── Dockerfile
└── deploy/DOMAIN.md
```

**Scope агента:** только `tc/` / `tc_26/`. Не лезть в home, другие Dropbox-папки, `gcloud config` с машины пользователя.

---

## 4. Навигация и chrome

### Меню шапки (синхронизировать в двух местах)

1. `src/components/Header.tsx` — Next.js
2. `chrome/header-public.html` — статика

Текущие пункты:

- **Главная** → `/`
- **Пройти тест ТИОС** → `/test` (→ start.html)
- **О тесте** → `/about`
- **Об авторе** → `/author`
- **Войти** → `/login`

**Личный кабинет** из меню **убран**; доступен через вход и ссылки в тексте (`/cabinet`).

### Footer

- Next: `src/components/Footer.tsx`
- Static: `chrome/footer.html`
- Ссылки: **О тесте**, **Об авторе**, Insighter, email

### Сборка chrome

После правок `chrome/*.html`:

```bash
npm run chrome:assemble
```

(`build` и `dev` вызывают это автоматически.)

Маркеры в HTML:

```html
<!-- chrome:header-public logoHref="/" loginAttrs='...' -->
…
<!-- /chrome:header-public -->
```

---

## 5. Пользовательские сценарии

### 5.1 Старт теста (`/test/start.html`)

1. Пользователь читает инструкцию (страница заранее запрашивает `GET /api/test/challenge`)
2. Принимает согласие → `POST /api/consent` с `session_uuid`
3. `POST /api/test/start` с challenge + пустым honeypot → `test_token` (sessionStorage)
4. Переход на `/test/take.html`

### 5.2 Прохождение (`/test/take.html`)

1. При необходимости обновляет `test_token` через challenge → `/api/test/start` (refresh страницы)
2. `GET /api/test/questions?page=N` с `X-Test-Token` — по 5 вопросов (только тексты), страницы строго по порядку
3. Ответы −2…+2, батчами по UI
4. Тайминг каждого ответа (`time_per_question`)
5. `POST /api/test/submit` (тоже с `X-Test-Token`) → расчёт на сервере + запись в БД; ответ только `encdata` / `result_id` / `session_uuid`
6. Редирект на `/quiz/result?encdata=…`

**Модалка «слишком быстрые ответы»:** если >10% ответов <2 сек.

### 5.3 Результат (`/results.html` ← `/quiz/result`)

Два источника данных (оба **без входа в ЛК**):

| Параметр URL | API | Когда |
|--------------|-----|-------|
| `?encdata=…` | `GET /api/results/by-encdata?encdata=` | анонимная ссылка, демо |
| `?id=…` | `GET /api/results/{id}` | сохранённый результат (auth/session) |

`by-encdata` **не** отдаёт сырые `answers` — только display-поля (шкалы, психотип, контент). Ссылка с `encdata` открывается без логина.

Отображает:

- радар **8 шкал** (Chart.js), среднее по 8 шкал (целое)
- **5 системных** полос (raw `sys_*` 0–12 → **отображение 0–30** через `systemicBarDisplayValue`)
- **рабочий профиль** (5 подшкал LAB/RIG из `scaled_systemic`)
- **анализ соответствия** (ΔLAB, ΔRIG, зона напряжения, `correspondence_type`)
- **sorted_personal_scales** — шкалы по убыванию
- **leader_scores** — баллы лидерского потенциала (формулы NAVIGATOR §11)
- **coaching_recommendations** — рекомендации по рабочему профилю
- **warnings** — threshold warnings (`buildThresholdWarnings`)
- **validation_warnings** — коды валидации ответов (отдельный блок UI)
- **mode_request_notice** — статус заявки на смену режима (для владельца)
- **content_blocks** из БД (`content_mode` с автопереключением)
- ссылку для копирования

### 5.4 Вход и кабинет

- `/login.html` — JWT в `localStorage`, optional
- `/cabinet.html` — `GET /api/results/history` (Bearer); график **динамики avg_intensity** по прохождениям (Chart.js)
- Login **noindex**

### 5.5 Админ (`/admin/`)

- Только `role: admin`
- Список результатов, детали, комментарий, visibility, **переключение mode**
- CRUD контента (`content_blocks`)
- Заявки на режим: `/admin/mode-requests.html`
- Команды: `/admin/teams.html` (export/import JSON)
- Матрица совместимости: `/admin/compatibility.html` (read-only UI, данные из `compatibility_rules`)

### 5.6 Команды (до 9 результатов)

- UI: `/teams.html`, `/team.html?id=…`, приглашение `/teams/accept.html?token=…`
- API (Bearer): `GET/POST /api/teams`, `GET/POST /api/teams/[id]`, `POST /api/teams/[id]/invite`, `POST /api/teams/invitations/accept`
- Ответ команды: участники, `compatibility_matrix`, `average_profile`
- Парная совместимость: `GET /api/compatibility?type_a=…&type_b=…` или `?matrix=1`

---

## 6. Математика расчётов

**Единственный источник кода:** `src/lib/calculations.ts`  
**Тесты:** `src/lib/calculations.test.ts`

### 6.1 Вход

- `answers`: массив **75** целых **−2…+2**
- `time_per_question`: массив **75** чисел (секунды)

### 6.2 Восемь тенденций (0–30, раздельный подсчёт)

Каждая тенденция считается **отдельно** по 15 вопросам своего блока. На ответ `val` (−2…+2):

- `val < 0` → левая (A) += |val|, правая += 0  
- `val > 0` → правая (B) += val, левая += 0  

**Без** `(signedRaw + 30) / 2`. EXT и INT **независимы**.

| Блок | Вопросы | Левая | Правая |
|------|---------|-------|--------|
| E/I | 1,6,11,…,71 | extraversion | introversion |
| T/A | 2,7,12,…,72 | anxiety | aggression |
| S/Sp | 3,8,13,…,73 | sensitivity | spontaneity |
| L/R | 5,10,15,…,75 | lability | rigidity |

### 6.3 Блок 4 — рабочий профиль

15 вопросов (4,9,14,…,74). Пять подшкал: стороны LAB/RIG по 0–6. Инверсия Q19,24,29 и Q34,39,44 (A=RIG, B=LAB).

Интегралы: `LAB_work`, `RIG_work` (0–30). Legacy-ключи `sys_*` в `scaled_systemic` = LAB+RIG по подшкале (0–12); в UI полосы масштабируются в **0–30** (`public/js/psychotypes.js` → `systemicBarDisplayValue`).

### 6.4 Анализ соответствия

```
ΔLAB = lability − LAB_work
ΔRIG = rigidity − RIG_work
```

Зона напряжения: |Δ| > 10. Типология в `classifyCorrespondence()`.

### 6.5 Психотип — каскад v4.0 (`profile-cascade.ts`, sep_16)

Круг: **AGG → SPO → EXT → LAB → ANX → SEN → INT → RIG**. Сортировка 8 шкал по убыванию (0–30).

**Флаг `TIOS_V1_PROFILES`:** `false` — legacy: соседние top1+top2 → тип, иначе `mixed`, без каскада и без `triad_variant`. `true` (`.env.example`, прод) — каскад ниже; `psychotype_code` = `complex` только если все 5 уровней провалились.

| Уровень | Условие (кратко) | Результат |
|--------|-------------------|-----------|
| 1 | top1+top2 соседние | `profile_complexity=pure`, тип пары; при сильной 3-й — `triad_variant` left/right (норм. 3-й ≥ 0.55) |
| 2 | top-3 = одна из **5** утверждённых триад в коде | `profile_complexity=triad`, `triad_variant=detected`, контент `triad_*` (не left/right) |
| 3 | ≥2 валидных диад в top-4 | `dual` или `multidimensional`, `primary_type` / `secondary_type` |
| 4 | разрыв top1−top2 ≥ 4 | `modifier` |
| 5 | размытый top-4 (правила в коде) | `balanced` |

**Утверждённые триады в коде (уровень 2):** EXT+LAB+ANX → influencer; ANX+SEN+RIG → conservative; SEN+INT+AGG → empath; SPO+EXT+RIG → innovator; INT+RIG+SPO → analyst. (В docx ещё 6-я: RIG+AGG+SPO → pragmatist — **не в коде**, ждём решение.)

**Пары → код** (как раньше):

| code | Пара | RU |
|------|------|-----|
| individualist | AGG + SPO | Индивидуалист |
| innovator | SPO + EXT | Инноватор |
| influencer | EXT + LAB | Лидер мнений |
| aesthete | LAB + ANX | Эстет |
| conservative | ANX + SEN | Консерватор |
| empath | SEN + INT | Эмпат |
| analyst | INT + RIG | Аналитик |
| pragmatist | RIG + AGG | Прагматик |

**JSON / БД** (`calculate_result`, `test_results`): `primary_type`, `secondary_type`, `profile_complexity`, `cascade_level_used`, `cluster_tendencies` (массив ключей шкал), `triad_variant` (+ `detected`). **encdata** по-прежнему только 75 ответов; поля пересчитываются на сервере.

**Контент V1 (leader_resource):** `detected` → блоки `triad_influencer_anx` … (не `description_main`); dual/multidimensional/modifier/balanced → базовые блоки `primary_type` + шаблоны `*_profile_message` (`psychotype_code='*'`); `complex` → плашка + универсальные техники. Логика: `cascade-content.ts`, `loadContentBlocks`.

### 6.6 avg_intensity

```
avg_intensity = sum(8 scales) / 8
```

В UI радара среднее показывается **округлённым до целого**.

### 6.7 Предупреждения (threshold warnings)

Функция `buildThresholdWarnings()` — NAVIGATOR §7.5. Примеры:

- avg ≤ 7 → «Ведущие тенденции слабо выражены…»
- avg > 12 → «…высокая» достоверность
- sensitivity/anxiety > 22 → депрессивное состояние
- introversion > 22 && rigidity > 22 → выгорание
- противоречивые противоположные пары → непредсказуемое поведение
- и др.

**Демо encdata:** профиль «Лидер мнений», pure + `triad_variant=right` (`DEMO_V1_PROFILE_EXPECTATION`, `getDemoAnswers`) — warnings через `buildThresholdWarnings()`; curated warnings только для демо-ссылки.

### 6.8 Валидация ответов

Коды `validation_warnings` (не путать с threshold `warnings`):

- `falsy_answers` — все ответы одинаковые
- `quickly_answers` — весь тест <60 сек
- `too_many_fast_answers` — >10% ответов <2 сек
- `incompletely_answered_block` — блок с ≥3 пропусками без сильных ответов
- `irregular_psycho_type` — психотип `mixed` (legacy MVP); при V1 вместо `mixed` чаще каскад или `complex`
- ~~`impossible_tendencies`~~ — **не применяется** при раздельном подсчёте NAVIGATOR v10 (EXT и INT независимы)

---

## 7. encdata — ссылка на результат

Модуль: `src/lib/encdata.ts`

- **Signed compact:** 75 ответов × 3 bit + HMAC-SHA256 (16 bytes), version byte `2` → base64 (~60 символов)
- Подпись ключом из `JWT_SECRET` — публичный scoring-oracle по произвольным векторам закрыт
- **Legacy decode only:** unsigned v1 / JSON (не принимаются `by-encdata`)
- Публичный URL: `/quiz/result?encdata=…` (rewrite на `results.html`) — UX без изменений
- `encodeAnswers()` всегда signed (submit, кабинет, демо)
- `computeFromEncdata()` — decode + `calculate_result()`
- `getDemoEncdata()` — фиксированный профиль «Лидер мнений» (signed)
- `by-encdata`: только signed + rate-limit ≤60 / IP / час

**Результат не требует БД** для отображения по signed encdata — расчёт на лету. БД нужна для истории, админки, consent.

Старые unsigned ссылки на by-encdata перестанут открываться; новые после теста и демо с сайта — как раньше для пользователя.

---

## 8. База данных (Prisma)

Файл: `prisma/schema.prisma`

| Модель | Назначение |
|--------|------------|
| `User` | email, passwordHash, role (`user`/`admin`) |
| `TestSession` | sessionUuid, userId?, started/completed |
| `TestResult` | answers, scores, psychotype, cascade fields (`primary_type`, `secondary_type`, `profile_complexity`, `cascade_level_used`, `cluster_tendencies`), `triad_variant`, mode, admin |
| `ContentBlock` | контент по psychotype + mode + block_key + version |
| `Question` | 75 пар утверждений |
| `PsychotypeDefinition` | справочник психотипов |
| `UserConsent` | GDPR-согласие |
| `ModeRequest` | заявки пользователя на смену режима (`stressless` / `insighter_you`) |
| `CompatibilityRule` | матрица совместимости 8×8 (импорт `db:import-hr-table`) |
| `Team` | групповой анализ (до 9 результатов) |
| `TeamMember` | участник / приглашение по email + token |
| `TeamResultEntry` | привязка `TestResult` к команде |
| `TeamReport` | сохранённый отчёт команды (V1+, опционально) |

### Режим контента (`TestResult.mode`)

| code | Название | Источник контента |
|------|----------|-------------------|
| `leader_resource` | Ресурс руководителя | `source_current/Предложение_пo_изменению_ТК_вопросы (2).docx` — **default** |
| `insighter` | Инсайтер | `source_current/insighter_outer для разработки.xlsx` → «Результат (новый)» |
| `insighter_you` | Инсайтер (ты) | `source_current/ответы инсайтер 1.xlsx` → `npm run db:import-insighter-you` |
| `stressless` | Стресслесс | `source_current/StressLess worksheet 2 (2).xlsx` |
| `hr_table` | Таблица для HR | `source_current/Таблицы для HR (3).docx` |

### Автопереключение контента (`content_mode` в API)

| Зритель | Режим блоков |
|---------|----------------|
| Владелец результата (user / session) | `insighter_you` |
| Админ | `insighter` |
| Аноним по encdata / share | `result.mode` (default `leader_resource`) |

Ручное переключение **insighter ↔ insighter_you** в админке **запрещено**.

**Правило:** `TestResult.mode` — режим для анонимного доступа и заявок; `content_mode` в ответе API — фактически загруженный контент.

### Content blocks

- Хранятся в БД, **не в коде**
- Поля: `block_key`, `block_template`, `content_text`, `sort_order`, `version`, `is_active`
- Шаблоны рендера: `text_block`, `list_block`, `card_block`, `accordion_block`, `table_block`, `radar_chart`, `bar_chart`
- JS-рендер: `public/js/block-templates.js`

Visibility: `is_visible_default` + per-result `visibilityOverrides` (JSON).

---

## 9. API (основные endpoints)

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/api/consent` | optional | Согласие GDPR |
| POST | `/api/test/start` | — | Выдаёт `test_token` (challenge + honeypot + rate-limit) |
| GET | `/api/test/challenge` | — | Выдаёт start-challenge JWT (dwell / one-time) |
| GET | `/api/test/questions?page=` | `X-Test-Token` | Страница из 5 вопросов (только тексты; по порядку) |
| POST | `/api/test/submit` | `X-Test-Token` | Submit + расчёт; ответ: encdata + ids |
| GET | `/api/results/by-encdata` | — | Результат из encdata (без raw answers) |
| GET | `/api/results/{id}` | session/user/admin | Result by ID |
| GET | `/api/results/history` | Bearer | Кабинет |
| POST | `/api/auth/login` | — | JWT |
| POST | `/api/auth/register` | — | Регистрация |
| GET | `/api/content/{psychotype}/{mode}` | — | Блоки контента |
| GET/POST | `/api/admin/results` | admin | Список/фильтры |
| POST | `/api/results/{id}/request-mode` | user/session | Заявка на stressless / insighter_you |
| GET | `/api/admin/mode-requests` | admin | Список заявок |
| PATCH | `/api/admin/mode-requests/{id}/resolve` | admin | Одобрить / отклонить |
| PATCH | `/api/admin/results/{id}/mode` | admin | Смена режима |
| PATCH | `/api/admin/results/{id}/comment` | admin | Комментарий |
| PATCH | `/api/admin/results/{id}/visibility` | admin | Видимость блоков |
| CRUD | `/api/admin/content` | admin | Контент |
| GET | `/api/compatibility` | — | Пара (`type_a`, `type_b`) или `?matrix=1` |
| GET/POST | `/api/teams` | Bearer | Список / создание команды |
| GET/POST | `/api/teams/{id}` | Bearer | Детали / добавить result_id |
| POST | `/api/teams/{id}/invite` | Bearer | Приглашение по email |
| POST | `/api/teams/invitations/accept` | Bearer | Принять invite по token |
| GET | `/api/admin/teams` | admin | Все команды |
| GET | `/api/admin/teams/{id}/export` | admin | Export JSON |
| POST | `/api/admin/teams/import` | admin | Import JSON |

Поля ответа результата (дополнительно к scores): `sorted_personal_scales`, `leader_scores`, `coaching_recommendations`, `warnings`, `validation_warnings`, `content_mode`, `mode_request_notice`.

Ответы API: snake_case JSON. Ошибки через helpers `src/lib/api/http.ts`.

### Защита методики (публичный контур)

Полный список мер: [`METHODOLOGY_PROTECTION.md`](./METHODOLOGY_PROTECTION.md).

- Расчёт только в `src/lib/calculations.ts` (не в `public/js`).
- `/api/test/questions` — без `factor_group` / `tendency_*`; нужен `X-Test-Token`; `?page=0..14` по 5 шт., без прыжков вперёд.
- `/api/test/submit` — ответ без scores; нужен `X-Test-Token`.
- `/api/results/by-encdata` — **публичный**, без логина; **без** raw `answers`; только **HMAC-signed** encdata; rate-limit по IP. Ссылки `?encdata=` открываются анонимно.
- Rate-limit in-memory на challenge/start/questions/submit по IP.
- Антибот на старте: `GET /api/test/challenge` → JWT challenge; `POST /api/test/start` требует challenge (min dwell ~2s, one-time), пустой honeypot `website`, в production — Origin/Referer с сайта.
- Submit: обязателен `time_per_question`; отказ 429 при сумме менее 120 с или подозрительно ровных/мгновенных таймингах.
- `/api/test/questions`: ≤45 запросов страниц / IP / час (~3 полных прохождения).

---

## 10. Психотипы — ЗАПРЕЩЁННЫЕ legacy-имена

В коде и UI **только новые** коды и названия:

| Старое | Новое | old code → new code |
|--------|-------|---------------------|
| Модник | Эстет | fashionista → aesthete |
| Чувствительный | Эмпат | sensitive → empath |
| Замкнутый | Аналитик | reserved → analyst |
| Реалист | Прагматик | realist → pragmatist |

При импорте старых Excel/docx — **маппить**.

---

## 11. SEO и LLM

**Все SEO-строки** — `src/lib/seo.ts`. При смене страниц обновлять также:

- `src/app/sitemap.ts`
- `public/llms.txt`, `public/llms-full.txt`
- `public/ai.txt`
- `seo.md`

### Индексация

| Path | index |
|------|-------|
| `/`, `/about`, `/author`, `/test`, `/test/take`, `/results` | yes |
| `/login`, `/cabinet`, `/admin` | **noindex** |

Canonical: `NEXT_PUBLIC_SITE_URL` + path.  
**Не noindex** `/test` и `/test/take`.

---

## 12. Брендинг

| Asset | Путь |
|-------|------|
| Логотип | `public/tc-logo-full.svg` — радар + TIOS |
| Favicon | `public/favicon.svg`, `src/app/icon.svg` — радар, **прозрачный фон**, tight viewBox |
| Цвета | primary `#1a54d8`, navy `#17255a`, light `#5b8df7` |

Legacy **цветная клетка 2×2** — **не использовать**.

---

## 13. Деплой и окружение

### Локально

```bash
cd tc_26
cp .env.example .env   # заполнить DATABASE_URL, JWT_SECRET, …
npm install
npm run db:migrate     # или db:deploy на прод-миграции
npm run dev            # localhost:3000
```

### Прод (ручной — пользователь, не AI)

```bash
cd tc_26 && npm run db:deploy && npm run db:import-all && npm run db:verify-content && npm run db:verify-content -- --db && npm test && npm run verify:demo && python3 scripts/deploy.py --deploy
```

- **Всегда** гоняет тесты перед деплоем (`deploy.py`)
- `NEXT_PUBLIC_SITE_URL` из `.env` **побеждает** shell env
- **Abort**, если URL содержит `run.app` (нужен `https://tios-test.com`)
- После деплоя: `python3 scripts/deploy.py --sync-env` если слетели secrets
- DNS: `deploy/DOMAIN.md`

### npm-скрипты (контент и проверки)

| Script | Назначение |
|--------|------------|
| `db:import-all` | цепочка всех импортов (`scripts/import_all.ts`) |
| `db:import-insighter`, `db:import-insighter-you`, `db:import-stressless`, `db:import-hr-table` | отдельные режимы |
| `db:verify-content` | JSON-реестры; `-- --db` — проверка Neon |
| `verify:demo` | демо encdata + threshold warnings |
| `chrome:assemble` | header/footer в static HTML |
| `test:e2e-quiz` / `test:e2e-quiz:dev` / `test:e2e-quiz:all` | Playwright: полный проход теста → проверка психотипа ([E2E_QUIZ_TESTS.md](E2E_QUIZ_TESTS.md)). **Только вручную, не в deploy** |


### Критичные env

| Variable | Назначение |
|----------|------------|
| `DATABASE_URL` | Neon pooled |
| `DIRECT_URL` | Neon direct (миграции) |
| `JWT_SECRET` | подпись JWT и HMAC encdata |
| `NEXT_PUBLIC_SITE_URL` | **baked in build** — canonical, encdata URLs |
| `NEXT_PUBLIC_GA_*` | Analytics |

### Cloud Build pitfall

В `cloudbuild.yaml` используется **`--update-env-vars`**, не `--set-env-vars` — иначе **стираются** DATABASE_URL/JWT на Cloud Run.

### www

`src/middleware.ts`: 301 `www.tios-test.com` → apex.

---

## 14. Тестирование

```bash
npm test              # vitest — 113 тестов (calculations, encdata, API, modes, teams)
npm run verify:demo   # демо-профиль + warnings
npm run test:mobile   # Playwright layout vs prod URL (subset страниц)
python3 scripts/deploy.py --test
```

---

## 15. Типичные задачи агента

| Задача | Где править |
|--------|-------------|
| Формула / warnings | `calculations.ts` + tests |
| Тексты шкал/психотипов UI | `psychotypes.ts` |
| SEO title/description | `seo.ts`, `seo.md`, llms files |
| Меню | `Header.tsx` + `chrome/header-public.html` + assemble |
| Старт/тест UI | `public/test/*.html`, `test.css` |
| Результат UI | `public/results.html`, `block-templates.js` |
| Новый контент-режим | import scripts + `ALLOWED_MODES` + admin UI |
| Демо-результат | `encdata.ts` (`getDemoAnswers`, `computeFromEncdata`) |
| Деплой/домен | `.env`, `deploy.py`, `DOMAIN.md`, `cloudbuild.yaml` |

---

## 16. Чего НЕ делать

- Не использовать Django (legacy в доках)
- Не хардкодить контент результатов в TS/HTML (только БД)
- Не использовать Excel «Математика (новая/старая)»
- Не использовать старые названия психотипов
- Не коммитить `.env`, secrets, локальные скриншоты
- Не `--set-env-vars` в Cloud Run deploy (wipe secrets)
- Не force push main без явной просьбы
- Не читать файлы вне workspace
- Не выдумывать биографию автора beyond `author.ts`

---

## 17. Карта URL (шпаргалка)

```
/                     лендинг (Next)
/about                о тесте, расшифровка TIOS
/author               об авторе (Смагин)
/test/start.html      инструкция + consent
/test/take.html       75 вопросов
/quiz/result?encdata= результат (→ results.html)
/results              демо-пример
/login.html           вход (noindex)
/cabinet.html         история + график avg_intensity (noindex)
/teams.html           команды пользователя (noindex)
/team.html?id=        детали команды + heatmap совместимости
/teams/accept.html    принять приглашение
/admin/               админка (noindex)
/admin/compatibility.html  матрица 8×8
/admin/teams.html     команды (admin)
/robots.txt, /sitemap.xml, /llms.txt
```

---

## 18. Связанные документы

- `work.md` — правила домена и MVP
- `seo.md` — SEO чеклист
- `deploy/DOMAIN.md` — DNS + Cloud Run domains
- `.cursor/rules/navigator-domain.mdc` — маппинг психотипов
- `.cursor/rules/seo.mdc` — rule для агента при SEO-изменениях
- `.cursor/rules/project-scope-only.mdc` — scope workspace

---

*Последнее обновление handout: 18.08.2026 — teams, compatibility, results UI (0–30 systemic, work_profile, leader_scores), prod checklist.*
