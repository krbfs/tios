# TC26 — UI prototype (`tc_26`)

Визуальная копия ключевых страниц без бэкенда:

- `/` — лендинг
- `/test` — инструкция «Как проходить?»
- `/test/take` — 75 вопросов (по 5 на страницу, шкала −2…+2)
- `/results` — пример результата / личный кабинет
- `/login` — демо-форма входа

Ответы теста сохраняются в `localStorage`.

## Локальный запуск

```bash
npm install
npm run dev
```

## Google Cloud Run

Деплой только через Cloud Build:

```bash
python3 scripts/deploy.py --setup    # один раз
python3 scripts/deploy.py --deploy
```

Или:

```bash
npm run gcp:setup
npm run gcp:deploy
```

Конфиг в `.env` (`PROJECT_ID`, `REGION`, `NEXT_PUBLIC_SITE_URL`, …).

SEO / LLM-правила: [`seo.md`](./seo.md).
