# Защита методики TIOS

Документ собирает все меры защиты публичного контура `tc_26`.  
Цель: усложнить кражу ключей, формул и массовый scrape/oracle — **без поломки UX** (анонимный тест и ссылка `?encdata=` без логина).

Код: `src/lib/calculations.ts`, `src/lib/encdata.ts`, `src/lib/test-access.ts`,  
`src/app/api/test/*`, `src/app/api/results/by-encdata/*`, `public/test/*`.

---

## 1. Что защищаем

| Актив | Угроза |
|--------|--------|
| Ключи (вопрос → шкала / тенденция) | Скачать из API вопросов |
| Формулы / алгоритм психотипа | Вынести в клиент или восстановить через oracle |
| Тексты 75 вопросов | Массовый dump одним запросом |
| Сырые answers + полный score-вектор | Собрать датасет для reverse-engineering |

**Честно:** тексты вопросов всё равно видны при прохождении. Защищаем ключи, алгоритм, массовый scrape и oracle.

---

## 2. API — что отдаём наружу

| Endpoint | Защита |
|----------|--------|
| `GET /api/test/challenge` | Выдаёт одноразовый JWT-challenge; rate-limit по IP |
| `POST /api/test/start` | Challenge (dwell ≥2 с, one-time) + пустой honeypot `website` + Origin/Referer (prod) → `test_token` |
| `GET /api/test/questions?page=0…14` | Нужен `X-Test-Token`; **только** `id`, `left_text`, `right_text`; по **5** вопросов; страницы **строго по порядку**; ≤45 page-запросов / IP / час |
| `POST /api/test/submit` | Нужен `X-Test-Token`; ответ только `result_id`, `encdata`, `session_uuid` (без scores); обязателен `time_per_question` |
| `GET /api/results/by-encdata` | Публично, без логина; **без** raw `answers`; только **HMAC-signed** encdata; ≤60 / IP / час |

Заголовок теста: **`X-Test-Token`** (не путать с `Authorization` — это JWT пользователя для ЛК).

Расчёт только на сервере: `src/lib/calculations.ts`. В `public/js` формул/ключей нет.

---

## 3. Антибот

1. **Challenge** — `GET /api/test/challenge`, redeem на start не раньше ~2 с, один раз.
2. **Honeypot** — скрытое поле `website`; если заполнено → soft-fail (невалидный token).
3. **Origin / Referer** — в production только с хоста сайта.
4. **Rate-limit** (in-memory, по IP) — challenge / start / questions / submit / by-encdata.
5. **Тайминги на submit** — отказ 429, если:
   - сумма `time_per_question` &lt; 120 с;
   - слишком много мгновенных ответов;
   - тайминги подозрительно ровные (одинаковые / низкая дисперсия).
6. **Постраничные вопросы** — нельзя получить все 75 одним вызовом; нельзя прыгнуть на page=10 без 0…9.

Клиент: `public/js/session.js` (`startTestWithAntiBot`), honeypot на `start.html`, страницы на `take.html`.

---

## 4. Защита методики (ядро)

1. **Ключи не в API** — нет `factor_group`, `tendency_*`, `sub_factor` в ответе вопросов.
2. **Минимальный submit** — браузер не получает полный score-вектор «забесплатно» с submit.
3. **Нет answers в by-encdata** — нельзя сопоставить ответы с вопросами из публичной ссылки.
4. **HMAC на encdata** (`JWT_SECRET`) — нельзя подделать произвольный вектор ответов и крутить публичный scoring-oracle через `?encdata=`. Исключение: фиксированный демо-профиль (всегда unsigned в `getDemoEncdata`) принимается по совпадению ответов, чтобы лендинг и mobile-тесты не зависели от секрета окружения.
5. **Математика только на сервере**.

---

## 5. UX — что не ломаем

- Старт теста без регистрации.
- Прохождение → редирект на `/quiz/result?encdata=…`.
- Анонимное открытие результата по ссылке **без логина**.
- Демо «Пример результата» с сайта (signed demo encdata).
- Капчи на странице результата нет.

**Нюанс:** старые **unsigned** ссылки (до HMAC) by-encdata больше не откроет. Новые после прохождения и демо с сайта — как раньше.

---

## 6. Лимиты (ориентир)

| Ключ | Лимит (in-memory / IP / час) |
|------|------------------------------|
| challenge | 60 |
| start | 40 |
| questions (страницы) | 45 (~3 полных теста) |
| submit | 20 |
| by-encdata | 60 |

На нескольких инстансах Cloud Run лимит «мягкий» (у каждого свой Map).

---

## 7. Секреты

| Переменная | Роль |
|------------|------|
| `JWT_SECRET` | JWT (ЛК + test/challenge tokens) и **HMAC encdata** |

Без корректного `JWT_SECRET` в production подпись/токены не должны работать.

---

## 8. Чего меры не обещают

- Полностью скрыть тексты 75 вопросов при живом прохождении.
- Остановить целеустремлённого человека с браузерной автоматизацией «под человека».
- Защитить код, если утёк репозиторий / Docker-образ (`calculations.ts`).

---

## 9. Быстрая проверка

```bash
cd tc_26
npm test   # в т.ч. questions / start / challenge / submit / encdata / by-encdata
```

Ручной smoke: `/test` → согласие → пройти несколько страниц → submit → открыть `?encdata=` без логина → демо с главной.
