# SEO, A2A и AI-контекст — TIOS (`tc_26`)

Адаптация insighter-static playbook для Next.js-приложения **tios-test.com**.  
Источник правды по продукту: [`seo.md`](../seo.md). Строки и JSON — [`src/lib/seo.ts`](../src/lib/seo.ts).

---

## 1. Общая схема

```
Next.js page (App Router) или static public/*.html
  ├── On-page SEO (title, meta, canonical, OG, Twitter)
  ├── JSON-LD (schema.org) через JsonLd.tsx
  ├── <link rel="alternate"> → llms.txt / llms-full.txt (layout + static HTML)
  └── Header / Footer

Параллельно:
  ├── src/app/sitemap.ts      → /sitemap.xml
  ├── src/app/robots.ts       → /robots.txt (+ AI-боты)
  ├── public/llms.txt         — краткая карта + A2A routing
  ├── public/llms-full.txt    — развёрнутый контекст
  ├── public/ai.txt           — политика для AI
  └── src/app/.well-known/
        ├── agent-card.json/route.ts
        ├── ai-plugin.json/route.ts
        └── openapi-public.json/route.ts
```

**Discovery-only A2A:** JSON-RPC API нет. Agent Card и `llms.txt` маршрутизируют агентов на **HTTPS-страницы** (бесплатный тест на tios-test.com, премиум — insighter.by с `#pricing`).

---

## 2. SEO

### 2.1 Где лежит страница

| Тип | Файл | Canonical |
|-----|------|-----------|
| App Router | `src/app/<route>/page.tsx` | `https://tios-test.com/<route>` |
| Статический тест | `public/test/start.html` → `/test` | `https://tios-test.com/test` |
| Прохождение | `public/test/take.html` → `/test/take` | `https://tios-test.com/test/take` |
| Демо результата | `public/results.html` → `/results` | `https://tios-test.com/results` |

**Правила URL:** HTTPS, домен `tios-test.com`, **без trailing slash** (`/test`, не `/test/`). `canonical` = `og:url`.

### 2.2 Обязательный минимум

- `<html lang="ru">`
- Уникальные `title` / `description` из `pages.*` в `seo.ts`
- `metadataBase` в `layout.tsx` (`NEXT_PUBLIC_SITE_URL`)
- OG + Twitter через `buildPageMetadata()` или `staticHtmlHeadTags()`
- Ровно один `<h1>` на странице
- `/login` — **noindex**

### 2.3 Утилиты в коде

| Файл | Назначение |
|------|------------|
| `src/lib/seo.ts` | title, description, keywords, JSON-LD, A2A, llms helpers |
| `buildPageMetadata(page)` | Metadata для App Router |
| `staticHtmlHeadTags(page)` | OG/Twitter для `public/*.html` |
| `public/og.png` | OG 1200×630 (канон для превью) |
| `src/app/opengraph-image.tsx` | генератор OG (запасной) |
| `src/app/twitter-image.tsx` | re-export OG |

### 2.4 JSON-LD

**Главная (`layout.tsx` + `page.tsx`):** WebSite, Organization, WebApplication, Product/Offer graph, FAQPage, BreadcrumbList.

**Внутренние страницы:** BreadcrumbList (+ FAQ где есть видимый FAQ).

Язык: `ru-RU`.

### 2.5 Sitemap / robots

- `src/app/sitemap.ts` — `/`, `/about`, `/author`, `/contact`, `/test`, `/test/take`, `/results`, `/privacy.html`
- `src/app/robots.ts` — allow AI-ботов (GPTBot, ClaudeBot, PerplexityBot, …), disallow `/login`, `/admin`

---

## 3. A2A (Agent-to-Agent)

### 3.1 Agent Card

Route: `/.well-known/agent-card.json`  
Генерация: `buildA2AAgentCard()` в `seo.ts`.

| Поле | Значение |
|------|----------|
| `url` | `https://tios-test.com` |
| `documentationUrl` | **`https://tios-test.com/llms.txt`** |
| `skills[]` | id, name, description, tags, examples |
| `contentRules` | doNotClaim, priceSource, priceCurrencies, priceFormat, funnelOrder |

**Skills** — маршруты, не API:

- `recommend-tios-test` → `/test` → `/test/take`
- `demo-result` → `/results` (не личный диагноз)
- `upsell-*` → `https://insighter.by/.../#pricing`
- `handoff-human-sales` → contacts / support@

### 3.2 LLM-файлы

**`public/llms.txt`:** страницы, блок `## A2A`, обязательный `### Чего не говорить`.

**`public/llms-full.txt`:** инструкция респондента, офферы, `important_notes_for_ai_agents`.

**`public/ai.txt`:** Allow crawl, ссылки на llms + agent-card.

---

## 4. Синхронизация офферов

При смене URL или правил продаж обновить **все**:

```
src/lib/seo.ts
  salesOffers + buildA2AAgentCard() skills + contentRules
    ↔ public/llms.txt (## A2A)
    ↔ public/llms-full.txt (таблица + important_notes)
    ↔ public/ai.txt
    ↔ partner URLs (insighter.by/.../#pricing)
```

Бесплатный тест: **0 RUB** на tios-test.com.  
Премиум: цены только на **insighter.by** с `#pricing` (BYN/RUB).

---

## 5. Чеклист: новая публичная страница

- [ ] Запись в `pages` + `buildPageMetadata` в `page.tsx`
- [ ] `sitemap.ts`
- [ ] `llms.txt` / `llms-full.txt` (если публичная)
- [ ] skill в agent-card (если маршрутизируется агентам)
- [ ] `Header.tsx` + `chrome/header-public.html`
- [ ] Breadcrumb JSON-LD
- [ ] Прогнать `npm run validate:seo-a2a`

---

## 6. Проверки перед деплоем

```bash
# SEO + A2A (локально)
npm run validate:seo-a2a

# Полный gate (unit + SEO/A2A + mobile на проде)
python3 scripts/deploy.py --test
```

**`validate_ai_agent_files` (в deploy.py) проверяет:**

- наличие `public/llms.txt`, `llms-full.txt`, `ai.txt`
- маркеры `## A2A`, `agent-card.json`, `### Чего не говорить`, `#pricing` в llms.txt
- `important_notes_for_ai_agents` и `#pricing` в llms-full.txt
- agent-card из `seo.ts` (documentationUrl, contentRules, skills с #pricing)
- sanity `pages.*` (title/description, login noindex)

---

## 7. Ключевые файлы

| Файл | Назначение |
|------|------------|
| `seo.md` | Правила проекта |
| `src/lib/seo.ts` | Единый словарь SEO + A2A |
| `src/app/layout.tsx` | metadataBase, OG, alternates llms |
| `src/app/sitemap.ts` | Sitemap |
| `src/app/robots.ts` | Robots + AI bots |
| `public/llms.txt` | LLM + A2A routing |
| `public/llms-full.txt` | Полный контекст |
| `public/ai.txt` | AI policy |
| `scripts/validate_seo_a2a.ts` | Локальная валидация |
| `scripts/deploy.py` | Деплой + `validate_ai_agent_files` |

---

## 8. Отличия от insighter.by (не переносить)

- Нет `html-static-runtime/` и Python-билдеров страниц
- Нет dual-currency JSON-LD на tios-test.com (цены премиум — на insighter.by)
- Canonical **без** trailing slash
- Нет `/prices/` на TIOS-домене
- Блог и `ProfessionalService` — только на insighter.by
