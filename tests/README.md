# Тесты TIOS (`tc_26/tests`)

Все проверки продукта собраны в одной папке.

## Структура

| Папка | Назначение | Команда |
|-------|------------|---------|
| **`security/`** | **Безопасность:** encdata/HMAC, antibot, IP blocklist, шифрование вопросов, challenge/start/submit/questions API, auth, share tokens, by-encdata | `npm run test:security` |
| `unit/` | Математика, контент, API (не security), режимы | `npm run test:unit` |
| `validation/` | SEO/A2A, каталог контента, demo encdata, content modes, docx↔JSON | см. ниже |
| `e2e/` | Playwright: мобильная вёрстка, полный проход квиза | `npm run test:mobile`, `npm run test:e2e-quiz` |
| `smoke/` | UI/API smoke (V1 профили, triad/complex) | `npm run smoke:ui` |
| `deploy/` | Python-тесты `scripts/deploy.py` | входит в `gcp:deploy` |
| `helpers/` | Общие хелперы vitest (`@/test/helpers/*`) | — |

## Быстрые команды

```bash
npm run test:ci             # короткий CI: vitest + SEO/catalog/demo (без браузера и локального сервера)
npm run test:full           # test:ci + вопросники/контент-режимы + Playwright (e2e квиз + mobile)

npm test                    # все vitest (unit + security) — входит в test:ci
npm run test:security       # только безопасность (не полный CI)
npm run test:unit           # unit без security (не полный CI)
npm run test:validate:extended   # verify:questions + db:verify-content (часть test:full)
npm run test:browser        # все 10 e2e-квизов + mobile all pages (часть test:full)
npm run test:e2e-quiz       # smoke: 4 сценария; полный каталог: test:e2e-quiz:all

npm run validate:seo-a2a
npm run content:validate-catalog
npm run verify:demo
npm run db:verify-content   # JSON по умолчанию; --db нужен DATABASE_URL
```

## Деплой (`gcp:deploy`)

Автоматически: `validate:seo-a2a` → `npm test` → `tests/deploy/test_deploy.py` → Cloud Build → `test:mobile` на prod URL.

**Не в деплое:** `test:e2e-quiz*` (ручной Playwright), `smoke:ui`, `content:verify-docx`.

## Security — что покрыто

- **`encdata.test.ts`** — подпись HMAC, отказ unsigned/legacy в публичном API, demo profile
- **`questions-payload.test.ts`** — шифрование страниц вопросов (без ключей в открытом виде)
- **`antibot-log.test.ts`**, **`ip-blocklist.test.ts`** — rate limit, honeypot, блокировка IP
- **`api/test/*`** — challenge, start (honeypot), questions (токен), submit (antibot timings)
- **`api/results/by-encdata`** — signed-only, rate limit
- **`api/auth/*`**, **`api-auth.test.ts`** — JWT login/register
- **`api/shared/route.test.ts`** — доступ по share token

Подробнее: `METHODOLOGY_PROTECTION.md`, `AGENT_HANDOUT.md` §6.8.
