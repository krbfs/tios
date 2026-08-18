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

1. **NAVIGATOR** (`source_main/1_NAVIGATOR.docx` / правила в `.cursor/rules/navigator-domain.mdc`)
2. **ТЗ.docx** — математика, валидация, архитектура БД
3. **Файл вопросника** — содержание вопросов, шкала, ключи
4. **Файлы контента** — тексты режимов

**NAVIGATOR побеждает ТЗ.**  
**При любом сомнении — спросить пользователя**, не выбирать формулу/текст самостоятельно.

Дополнительно в репозитории:

- `work.md` — рабочие правила проекта (маппинг, режимы, запреты)
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
├── work.md                   ← доменные правила
├── seo.md                    ← SEO
├── prisma/schema.prisma      ← модели БД
├── src/
│   ├── app/                  ← Next pages + API routes
│   ├── components/           ← Header, Footer, JsonLd, …
│   └── lib/
│       ├── calculations.ts   ← ★ ВСЯ МАТЕМАТИКА
│       ├── encdata.ts        ← кодирование ответов в URL
│       ├── psychotypes.ts    ← названия шкал/психотипов UI
│       ├── seo.ts            ← ★ ВСЕ SEO-СТРОКИ
│       ├── author.ts, tios-acronym.ts
│       └── api/              ← auth, results, content helpers
├── public/
│   ├── test/start.html       ← согласие + старт
│   ├── test/take.html        ← прохождение 75 вопросов
│   ├── results.html          ← ★ страница результата
│   ├── login.html, cabinet.html
│   ├── admin/*.html          ← админ-панель
│   ├── css/test.css, admin.css
│   └── js/                   ← block-templates, psychotypes, auth
├── chrome/                   ← шаблоны header/footer
│   ├── header-public.html
│   └── footer.html
├── scripts/
│   ├── deploy.py             ← ★ деплой GCP
│   ├── assemble-chrome.ts    ← сборка chrome в HTML
│   ├── import_questions.ts, import_content.ts
│   └── …
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

1. Пользователь читает инструкцию
2. Принимает согласие → `POST /api/consent` с `session_uuid`
3. Переход на `/test/take.html`

### 5.2 Прохождение (`/test/take.html`)

1. `GET /api/test/questions` — 75 пар из БД
2. Ответы −2…+2, батчами по UI
3. Тайминг каждого ответа (`time_per_question`)
4. `POST /api/test/submit` → расчёт + запись в БД
5. Редirect на `/quiz/result?encdata=…`

**Модалка «слишком быстрые ответы»:** если >10% ответов <2 сек.

### 5.3 Результат (`/results.html` ← `/quiz/result`)

Два источника данных:

| Параметр URL | API | Когда |
|--------------|-----|-------|
| `?encdata=…` | `GET /api/results/by-encdata?encdata=` | анонимная ссылка, демо |
| `?id=…` | `GET /api/results/{id}` | сохранённый результат (auth/session) |

Отображает:

- радар **8 шкал** (Chart.js)
- **среднее по 8 шкал** (целое число в UI)
- **5 системных** полос
- **предупреждения** (threshold warnings)
- **content_blocks** из БД (режим `leader_resource` по умолчанию)
- ссылку для копирования

### 5.4 Вход и кабинет

- `/login.html` — JWT в `localStorage`, optional
- `/cabinet.html` — `GET /api/results/history` (Bearer)
- Login **noindex**

### 5.5 Админ (`/admin/`)

- Только `role: admin`
- Список результатов, детали, комментарий, visibility, **переключение mode**
- CRUD контента (`content_blocks`)

---

## 6. Математика расчётов

**Единственный источник кода:** `src/lib/calculations.ts`  
**Тесты:** `src/lib/calculations.test.ts`

### 6.1 Вход

- `answers`: массив **75** целых **−2…+2**
- `time_per_question`: массив **75** чисел (секунды)

### 6.2 Блоки вопросов → 8 шкал (0–30, целые)

Каждая шкала — **15 ответов** из своего блока (противоположная пара тенденций):

| Блок | Вопросы (номера 1-based) | Левая шкала | Правая шкала |
|------|---------------------------|-------------|--------------|
| E/I | 1,6,11,…,71 (15 шт.) | extraversion | introversion |
| T/A | 2,7,12,…,72 | anxiety | aggression |
| S/Sp | 3,8,13,…,73 | sensitivity | spontaneity |
| L/R | 5,10,15,…,75 | lability | rigidity |

Формула для полюса:

```
signedRaw = pole === "left" ? -sum(block) : sum(block)
scale = round((signedRaw + 30) / 2)   // 0…30
```

### 6.3 Системные свойства (5 шт.)

По **3 ответа** на свойство (блок 4, вопросы 4,9,14 / 19,24,29 / …):

```
systemic = round((raw + 6) * 2.5)
```

Ключи: `sys_energy`, `sys_result`, `sys_quality`, `sys_rules`, `sys_delegation`.

### 6.4 Психотип

8 психотипов = **8 пар соседних шкал** на круге (NAVIGATOR §7.4):

| code | Шкалы (a + b) | Название RU |
|------|---------------|-------------|
| individualist | aggression + spontaneity | Индивидуалист |
| innovator | spontaneity + extraversion | Инноватор |
| influencer | extraversion + lability | Лидер мнений |
| aesthete | lability + anxiety | Эстет |
| conservative | anxiety + sensitivity | Консерватор |
| empath | sensitivity + introversion | Эмпат |
| analyst | introversion + rigidity | Аналитик |
| pragmatist | rigidity + aggression | Прагматик |

Алгоритм:

1. Сумма двух шкал для каждого кода
2. Сортировка по убыванию
3. **Диада** (`is_dyad: true`, `psychotype_secondary` заполнен), если:
   - лидер **не** опережает второго на **>20%**, **или**
   - лидер и второй **не соседние** на кольце психотипов

### 6.5 avg_intensity

```
avg_intensity = sum(8 scales) / 8
```

В UI радара среднее показывается **округлённым до целого**.

### 6.6 Предупреждения (threshold warnings)

Функция `buildThresholdWarnings()` — NAVIGATOR §7.5. Примеры:

- avg ≤ 7 → «Ведущие тенденции слабо выражены…»
- avg > 12 → «…высокая» достоверность
- sensitivity/anxiety > 22 → депрессивное состояние
- introversion > 22 && rigidity > 22 → выгорание
- противоречивые противоположные пары → непредсказуемое поведение
- и др.

**Демо encdata:** warnings **переопределены** константой `DEMO_THRESHOLD_WARNINGS` (ровно 3 фиксированных) — см. `encdata.ts`.

### 6.7 Валидация ответов

Коды `validation_warnings` (не путать с threshold `warnings`):

- `falsy_answers` — все ответы одинаковые
- `quickly_answers` — весь тест <60 сек
- `too_many_fast_answers` — >10% ответов <2 сек
- `incompletely_answered_block` — блок с ≥3 пропусками без сильных ответов
- `impossible_tendencies` — обе шкалы противоположной пары >15

---

## 7. encdata — ссылка на результат

Модуль: `src/lib/encdata.ts`

- **Compact:** 75 ответов × 3 bit → base64 (~40 символов), version byte `1`
- **Legacy:** JSON-массив в base64 (ещё декодируется)
- Публичный URL: `/quiz/result?encdata=…` (rewrite на `results.html`)
- `computeFromEncdata()` — decode + `calculate_result()`
- `getDemoEncdata()` — фиксированный профиль «Лидер мнений» для лендинга

**Результат не требует БД** для отображения по encdata — расчёт на лету. БД нужна для истории, админки, consent.

---

## 8. База данных (Prisma)

Файл: `prisma/schema.prisma`

| Модель | Назначение |
|--------|------------|
| `User` | email, passwordHash, role (`user`/`admin`) |
| `TestSession` | sessionUuid, userId?, started/completed |
| `TestResult` | answers JSON, scores, psychotype, mode, admin fields |
| `ContentBlock` | контент по psychotype + mode + block_key + version |
| `Question` | 75 пар утверждений |
| `PsychotypeDefinition` | справочник психотипов |
| `UserConsent` | GDPR-согласие |

### Режим контента (`TestResult.mode`)

| code | Название | Источник контента |
|------|----------|-------------------|
| `leader_resource` | Ресурс руководителя | **default** |
| `insighter` | Инсайтер | Excel «Результат (новый)» |
| `stressless` | Стресслесс | StressLess worksheet |
| `hr_table` | Таблица для HR | HR doc |

**Правило:** режим — **параметр результата**, переключает **админ**, не отдельная страница.

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
| GET | `/api/test/questions` | — | 75 вопросов |
| POST | `/api/test/submit` | optional | Submit + расчёт + save |
| GET | `/api/results/by-encdata` | — | Результат из encdata |
| GET | `/api/results/{id}` | session/user/admin | Result by ID |
| GET | `/api/results/history` | Bearer | Кабинет |
| POST | `/api/auth/login` | — | JWT |
| POST | `/api/auth/register` | — | Регистрация |
| GET | `/api/content/{psychotype}/{mode}` | — | Блоки контента |
| GET/POST | `/api/admin/results` | admin | Список/фильтры |
| PATCH | `/api/admin/results/{id}/mode` | admin | Смена режима |
| PATCH | `/api/admin/results/{id}/comment` | admin | Комментарий |
| PATCH | `/api/admin/results/{id}/visibility` | admin | Видимость блоков |
| CRUD | `/api/admin/content` | admin | Контент |

Ответы API: snake_case JSON. Ошибки через helpers `src/lib/api/http.ts`.

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

### Прод

```bash
python3 scripts/deploy.py --deploy
```

- **Всегда** гоняет тесты перед деплоем
- `NEXT_PUBLIC_SITE_URL` из `.env` **побеждает** shell env
- **Abort**, если URL содержит `run.app` (нужен `https://tios-test.com`)
- После деплоя: `python3 scripts/deploy.py --sync-env` если слетели secrets

### Критичные env

| Variable | Назначение |
|----------|------------|
| `DATABASE_URL` | Neon pooled |
| `DIRECT_URL` | Neon direct (миграции) |
| `JWT_SECRET` | подпись токенов |
| `NEXT_PUBLIC_SITE_URL` | **baked in build** — canonical, encdata URLs |
| `NEXT_PUBLIC_GA_*` | Analytics |

### Cloud Build pitfall

В `cloudbuild.yaml` используется **`--update-env-vars`**, не `--set-env-vars` — иначе **стираются** DATABASE_URL/JWT на Cloud Run.

### www

`src/middleware.ts`: 301 `www.tios-test.com` → apex.

---

## 14. Тестирование

```bash
npm test              # vitest (calculations, encdata, API unit)
npm run test:mobile   # Playwright layout vs prod URL
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
| Демо-результат | `encdata.ts` (`getDemoAnswers`, `DEMO_THRESHOLD_WARNINGS`) |
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
/cabinet.html         история (noindex)
/admin/               админка (noindex)
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

*Последнее обновление handout: по состоянию репозитория после коммитов about/author, radar branding, transparent favicon, header «Об авторе».*
