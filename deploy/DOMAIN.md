# Домен tios-test.com (Namecheap → Cloud Run)

Продакшен: **https://tios-test.com**  
Сервис Cloud Run: `tc26`, регион `europe-west1`, проект `tc-26-504910`.

Старый URL `*.run.app` продолжит работать параллельно, пока не настроите редирект отдельно.

## 1. Код и переменные (уже в репозитории)

- `NEXT_PUBLIC_SITE_URL=https://tios-test.com` — в `.env`, `.env.example`, `Dockerfile`, `cloudbuild.yaml`, `scripts/deploy.py`
- SEO canonical / sitemap / OG — из `src/lib/seo.ts`
- Контакт: `support@tios-test.com` (настройте пересылку в Namecheap → Email Forwarding, если нужна почта)

## 2. Верификация домена в Google Cloud

Перед маппингом домен должен быть подтверждён в GCP:

1. [Google Search Console](https://search.google.com/search-console) → добавить ресурс `tios-test.com`
2. Способ «DNS-запись» → TXT в Namecheap (Advanced DNS → Add New Record → TXT)
3. Дождаться статуса «Verified» в Search Console

Либо через Cloud Console: **Cloud Run → Manage custom domains → Verify**.

## 3. Domain mapping в Cloud Run

Из каталога `tc_26` (нужен `gcloud` и доступ к проекту):

```bash
./scripts/setup-domain.sh
```

Или вручную:

```bash
gcloud config set project tc-26-504910

gcloud beta run domain-mappings create \
  --service=tc26 \
  --domain=tios-test.com \
  --region=europe-west1

gcloud beta run domain-mappings create \
  --service=tc26 \
  --domain=www.tios-test.com \
  --region=europe-west1
```

Посмотреть, какие DNS-записи нужны:

```bash
gcloud beta run domain-mappings describe --domain=tios-test.com --region=europe-west1
gcloud beta run domain-mappings describe --domain=www.tios-test.com --region=europe-west1
```

В выводе блок `status.resourceRecords` — его и добавляете в Namecheap.

## 4. DNS в Namecheap

**Domain List → tios-test.com → Advanced DNS**

Типичные записи от Google (точные значения — из `describe` выше):

| Host | Type | Value |
|------|------|--------|
| `@` | A | IP из resourceRecords (обычно 4 записи) |
| `@` | AAAA | IPv6 из resourceRecords (если есть) |
| `www` | CNAME | `ghs.googlehosted.com.` |

Удалите конфликтующие A/CNAME на `@` и `www`, если были старые parking-записи Namecheap.

### Редirect www → tios-test.com

Cloud Run **не делает** редирект сам. Канонический домен — **без www** (`NEXT_PUBLIC_SITE_URL`).

**Вариант A (рекомендуемый, уже в коде):** оба домена в Cloud Run + редирект в приложении.

1. Domain mapping для `www.tios-test.com` (см. §3).
2. CNAME `www` → `ghs.googlehosted.com` в Namecheap.
3. `src/middleware.ts` отдаёт **301** с `www.tios-test.com` на `https://tios-test.com` (путь и query сохраняются).
4. Деплой: `python3 scripts/deploy.py --deploy`.

Проверка:

```bash
curl -I https://www.tios-test.com/test
# HTTP/1.1 301
# Location: https://tios-test.com/test
```

**Вариант B (только DNS, без www в Cloud Run):** в Namecheap вместо CNAME для `www`:

| Host | Type | Value |
|------|------|--------|
| `www` | URL Redirect Record | `https://tios-test.com` |

Тогда mapping `www.tios-test.com` в Cloud Run **не нужен** — редирект делает Namecheap.

TTL: Automatic или 300 с — для первой настройки можно меньше, потом увеличить.

Проверка (через 5–30 мин, иногда до 48 ч):

```bash
dig +short tios-test.com A
dig +short www.tios-test.com CNAME
curl -I https://tios-test.com/
```

## 5. Деплой с новым URL

`NEXT_PUBLIC_SITE_URL` вшивается **на этапе сборки** Docker-образа. После смены домена нужен полный деплой:

```bash
python3 scripts/deploy.py --deploy
```

Проверить после деплоя:

- https://tios-test.com/robots.txt
- https://tios-test.com/sitemap.xml
- view-source: canonical и `og:url` указывают на `tios-test.com`

## 6. Google Analytics / Яндекс Метрика

В GA4 → Admin → Data streams → добавить/обновить stream URL на `https://tios-test.com`.

Счётчик Яндекс.Метрики (`111930448`) вшит в сборку (`NEXT_PUBLIC_YANDEX_METRIKA_ID`). После деплоя проверить hit в кабинете Метрики.

## 7. Чеклист

- [ ] TXT верификация в Search Console / GCP
- [ ] Domain mappings `tios-test.com` и `www.tios-test.com`
- [ ] DNS A/AAAA/CNAME в Namecheap
- [ ] HTTPS открывается (сертификат Google, 15–60 мин после DNS)
- [ ] `python3 scripts/deploy.py --deploy`
- [ ] Email forwarding для `support@tios-test.com` (опционально)
