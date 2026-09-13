# SEO и LLM-discoverability — правила проекта `tc_26`

Этот документ — источник правды для метаданных, текстов и файлов, по которым сайт находят люди, поисковики и AI-агенты.

## Цели

1. По запросам вроде «психологический тест онлайн», «тест ТИОС», «пройти тест ТИОС», «управленческий психотип», «TIOS» страница должна быть однозначно понятна боту.
2. AI-агенты (ChatGPT/Perplexity/Claude crawlers и т.п.) должны за 1 запрос понять: что это, для кого, сколько вопросов, как пройти, какой URL старта.
3. Не врать: только факты из продукта (75 вопросов, ~10 минут, анонимно, управленческий профиль).

## Обязательные файлы (всегда поддерживать)

| Файл / route | Назначение |
|---|---|
| `src/lib/seo.ts` | Единый словарь title/description/keywords/JSON-LD/A2A |
| `src/app/layout.tsx` | metadataBase, OG, Twitter, robots, canonical |
| `src/app/opengraph-image.tsx` | генератор OG (опционально) |
| `public/og.png` | канонический OG PNG 1200×630 (Telegram/WhatsApp) |
| `src/app/sitemap.ts` | sitemap.xml |
| `src/app/robots.ts` | robots.txt + AI-боты |
| `src/app/.well-known/agent-card.json/route.ts` | A2A Agent Card |
| `src/app/.well-known/ai-plugin.json/route.ts` | AI plugin manifest |
| `public/llms.txt` | короткий вход для LLM |
| `public/llms-full.txt` | развернутое описание + A2A sales |
| `public/ai.txt` | политика для AI-агентов |
| `src/components/JsonLd.tsx` | schema.org на ключевых страницах |

## Правила title / description

- **Title**: предмет + выгода + бренд. Пример:  
  `Психологический тест онлайн — управленческий психотип за 10 минут | TIOS`
- **Description**: 140–160 символов, с цифрой «75 вопросов», CTA «пройти тест ТИОС».
- На каждой индексируемой странице — **уникальные** title/description.
- Canonical всегда абсолютный (`NEXT_PUBLIC_SITE_URL` + path).

## Индексация

| Path | Index |
|---|---|
| `/` | yes |
| `/about` | yes |
| `/where-used` | yes |
| `/author` | yes |
| `/contact` | yes |
| `/test` | yes |
| `/test/take` | yes (тест — целевая страница) |
| `/results` | yes (демо-пример результата) |
| `/privacy.html` | yes (политика ПДн) |
| `/login` | **noindex** |
| 404 (`not-found`) | **noindex** |

`robots.txt` разрешает основных AI-ботов: GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Bytespider, CCBot — если политика продукта не запрещает иначе.

## Контент для людей и агентов

На лендинге и в `llms.txt` явно держать:

- название продукта: **TIOS** (латиница), **тест ТИОС** / **ТИОС** (кириллица в русском UI)
- что делает: диагностика управленческого профиля / психотип
- формат: **75 пар утверждений**, шкала −2…+2
- время: **≈ 10 минут**
- регистрация: **не обязательна**
- старт теста: `/test` → `/test/take`
- пример результата: `/results`
- контакт: форма [/contact](/contact) (Telegram); резерв: support@tios-test.com
- партнер: Insighter — https://insighter.by/

## Structured data (JSON-LD)

Минимум на главной:

- `WebSite` + `SearchAction` не нужен (нет поиска) — достаточно `WebSite`
- `WebApplication` или `SoftwareApplication` (тип Educational/Business)
- `FAQPage` — 3–5 коротких FAQ из реальных блоков лендинга
- `BreadcrumbList` на внутренних страницах

Язык: `ru-RU`.

## Open Graph / Twitter

- `og:type=website` на лендинге
- `og:locale=ru_RU`
- `og:site_name=TIOS`
- Картинка: статический `/og.png` (1200×630, `image/png`) — путь из `siteConfig.ogImagePath`
  (динамический `/opengraph-image` оставляем как запасной генератор)
- Twitter: `summary_large_image` (`src/app/twitter-image.tsx`)
- Все строки и `buildPageMetadata()` — только из `src/lib/seo.ts`
- Статические `public/*.html` дублируют те же OG-теги вручную (держать в синхроне с `pages.*`)

## A2A / agent-to-agent продажи

Обязательные discovery-эндпоинты:

| URL | Назначение |
|---|---|
| `/.well-known/agent-card.json` | A2A Agent Card: skills (тест, demo, premium upsell, handoff) |
| `/.well-known/ai-plugin.json` | plugin-manifest для агентов |
| `/.well-known/openapi-public.json` | минимальный OpenAPI discovery |
| `/llms.txt` + `/llms-full.txt` | карта продукта + правила продаж |
| `/ai.txt` | политика цитирования + Agent-Card |

Правила для агентов (держать в llms-full, llms.txt и Agent Card `contentRules`):

1. Сначала бесплатный тест (`/test`).
2. Не выдавать `/results` демо за личный диагноз.
3. Премиум / B2B → Insighter `#pricing` или contacts.
4. Не обещать медицинский диагноз.
5. JSON-LD Product/Offer на главной (`buildProductOffersJsonLd`).
6. `documentationUrl` Agent Card = `/llms.txt`.

## LLM-файлы

### `llms.txt`

Коротко, markdown:

- H1 название
- 1 абзац что это
- список ключевых URL
- контакт

### `llms-full.txt`

- инструкция респондента
- описание шкалы −2…+2
- карта разделов сайта
- ограничения (нет бэкенда расчета в этом прототипе — если актуально)

### `ai.txt`

Разрешение на цитирование публичных страниц + указание канонического источника.

## Технические правила в коде

1. Все SEO-строки — только из `src/lib/seo.ts`, не хардкодить по страницам вразнобой.
2. `metadataBase` обязателен (иначе canonical/OG ломаются в Cloud Run).
3. `lang="ru"` на `<html>`.
4. Один `<h1>` на страницу.
5. Внутренние CTA ведут на `/test` и `/test/take`, не на внешний legacy-домен.
6. При смене домена обновить `NEXT_PUBLIC_SITE_URL` в `.env` и пересобрать.
7. После деплоя проверить: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, view-source title/description.

## Запросы, под которые заточены тексты (RU)

- психологический тест онлайн
- тест психотип
- тест ТИОС
- тест TIOS
- пройти тест ТИОС
- тест ТИОС онлайн
- психологический тест ТИОС
- начать тест ТИОС
- результат теста ТИОС
- управленческий профиль
- диагностика руководителя
- тест личности 10 минут
- TIOS
- ТИОС
- психотип лидер мнений (для демо-результата)

## Чего не делать

- Не спамить keywords в видимом тексте.
- Не клоакать (разный контент людям и ботам).
- Не обещать «точный медицинский диагноз».
- Не закрывать `/test` и `/test/take` в `noindex` без явной причины.
- Не удалять `llms.txt` / `ai.txt` при рефакторинге.

## Чеклист перед релизом

- [ ] title/description уникальны на `/`, `/test`, `/test/take`, `/results`
- [ ] `/login` = noindex
- [ ] sitemap отдает 200
- [ ] robots ссылается на sitemap; AI-боты allow
- [ ] `/og.png` отдаёт PNG 1200×630
- [ ] `/.well-known/agent-card.json` валиден (skills + contentRules + offers)
- [ ] `npm run validate:seo-a2a` проходит
- [ ] JSON-LD валиден (без хвостов trailing comma)
- [ ] `NEXT_PUBLIC_SITE_URL` совпадает с продом
- [ ] static HTML (`test/start.html`, `take.html`, `results.html`) имеют OG-теги
