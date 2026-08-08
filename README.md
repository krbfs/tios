# Teamconstructor 2.0 — UI prototype (`tc_26`)

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

## Контейнер (локально, как на Cloud Run)

```bash
chmod +x scripts/*.sh
npm run docker:build
npm run docker:run
# или
npm run docker:up
```

Сервис слушает `http://localhost:8080`.

## Google Cloud Run

Инфра в репозитории:

| Файл | Назначение |
|------|------------|
| `Dockerfile` | multi-stage Next.js standalone → Node на порту 8080 |
| `cloudbuild.yaml` | Cloud Build: build → Artifact Registry → Cloud Run |
| `deploy/service.yaml` | манифест сервиса Cloud Run |
| `scripts/setup-gcp.sh` | один раз: API + Artifact Registry + IAM |
| `scripts/deploy.sh` | деплой через Cloud Build (или `LOCAL=1` локально) |
| `deploy/env.example` | переменные окружения |

### 1. Bootstrap GCP (один раз)

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=europe-west1
npm run gcp:setup
```

### 2. Деплой

```bash
export PROJECT_ID=your-gcp-project-id
npm run gcp:deploy
```

Локальная сборка образа + push + deploy:

```bash
LOCAL=1 npm run gcp:deploy
```

### 3. Ручной Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=europe-west1,_SERVICE=tc26,_REPO=tc26,_IMAGE=tc26
```
