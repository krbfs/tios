/** CTA blocks at the bottom of every test result (Insighter services). */

import { initScrollReveal } from "/js/motion.js";

const INSIGHTER = "https://insighter.by";

const PROMO_EVENTS = {
  contact: "result_promo_premium_contact",
  audienceResearch: "result_promo_audience_research",
  effectiveTeam: "result_promo_effective_team",
  leaderResource: "result_promo_leader_resource",
};

export function mountResultPromo(parent) {
  const section = document.createElement("section");
  section.className = "result-promo motion-reveal";
  section.setAttribute("aria-label", "Дополнительные услуги Insighter");
  section.innerHTML = `
    <article class="result-promo-banner">
      <div class="result-promo-banner-head">
        <h2 class="result-promo-banner-title">
          Для получения более точного и полного премиум-отчета свяжитесь с нами
        </h2>
        <a
          class="btn btn-promo"
          href="${INSIGHTER}/contacts/"
          data-ga-event="${PROMO_EVENTS.contact}"
        >Контакт</a>
      </div>
      <p class="result-promo-lead">В премиум-версию входит:</p>
      <ul class="result-promo-list">
        <li>расширенные и уточненные блоки: «Управленческие риски и точки роста»,</li>
        <li>блок «Стресс и выгорание: как не сгореть и оставаться эффективным»,</li>
        <li>долгосрочная стратегия энергоменеджмента;</li>
        <li>блоки «Как создать среду для своей высокой продуктивности» и</li>
        <li>«Когнитивные искажения: откуда берутся ошибки в управлении».</li>
      </ul>
    </article>

    <article class="result-promo-company">
      <p class="result-promo-company-text">
        Психология для B2B — доступ к скрытым драйверам поведения клиентов и сотрудников
        для более точных управленческих решений.
      </p>
    </article>

    <div class="result-promo-grid">
      <article class="result-promo-card">
        <h3 class="result-promo-card-title">Получить Исследование ЦА</h3>
        <p class="result-promo-card-text">
          Узнаете бессознательные паттерны принятия решения вашими клиентами: скрытые
          мотивы, ценности, страхи, барьеры и желания.
        </p>
        <a
          class="btn btn-promo"
          href="${INSIGHTER}/audience-research/"
          data-ga-event="${PROMO_EVENTS.audienceResearch}"
        >Подробнее</a>
      </article>

      <article class="result-promo-card">
        <h3 class="result-promo-card-title">Получить персональный план развития команды</h3>
        <p class="result-promo-card-text">
          Создайте высокопродуктивную и устойчивую рабочую среду через глубокое
          понимание индивидуальных особенностей ваших сотрудников. Получите инструмент
          снижения рисков при формировании команды
        </p>
        <a
          class="btn btn-promo"
          href="${INSIGHTER}/effective-team"
          data-ga-event="${PROMO_EVENTS.effectiveTeam}"
        >Подробнее</a>
      </article>

      <article class="result-promo-card">
        <h3 class="result-promo-card-title">Получить премиум-отчет Ресурс Руководителя</h3>
        <p class="result-promo-card-text">
          Найдите ваши ключевые преимущества и зоны максимальной эффективности, способы
          борьбы со стрессом и портрет оптимального помощника.
        </p>
        <a
          class="btn btn-promo"
          href="${INSIGHTER}/leader-resource/"
          data-ga-event="${PROMO_EVENTS.leaderResource}"
        >Подробнее</a>
      </article>
    </div>
  `;

  parent.appendChild(section);
  initScrollReveal(section.parentElement || document);
}
