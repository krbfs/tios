/** Контент с https://insighter.by/prices/ — блоки до «Хотите порадовать друга?». */

const INSIGHTER = "https://insighter.by";

export type WhereUsedRow = {
  service: string;
  href: string;
  /** Колонка «Оптимально, если ищете» с insighter.by/prices/ */
  ifLookingFor: string;
};

export type WhereUsedBlock = {
  id: string;
  title: string;
  rows: WhereUsedRow[];
};

export const WHERE_USED_BLOCKS: WhereUsedBlock[] = [
  {
    id: "sales",
    title: "Отдел продаж не выполняет план?",
    rows: [
      {
        service: "Повышение эффективности продаж",
        href: `${INSIGHTER}/povyshenie-effektivnosti-prodazh/`,
        ifLookingFor: "Способы повышения эффективности продаж",
      },
      {
        service: "Анализ целевой аудитории",
        href: `${INSIGHTER}/audience-research/`,
        ifLookingFor: "Способы усовершенствования скриптов продаж",
      },
      {
        service: "Бизнес-игры и тренинги",
        href: `${INSIGHTER}/vebinary-biznes-igry/`,
        ifLookingFor: "Обучение для продажников",
      },
    ],
  },
  {
    id: "churn",
    title: "Клиенты быстро уходят?",
    rows: [
      {
        service: "Повышение LTV",
        href: `${INSIGHTER}/ltv/`,
        ifLookingFor:
          "Способы персонализации коммуникации с клиентом для повышения удержания и снижения оттока. Точную информацию о причинах оттока",
      },
      {
        service: "Продуктивная команда",
        href: `${INSIGHTER}/effective-team/`,
        ifLookingFor: "Способы улучшения клиентского сервиса через работу с командой",
      },
      {
        service: "Анализ целевой аудитории",
        href: `${INSIGHTER}/audience-research/`,
        ifLookingFor: "Способы повышения метрик лояльности",
      },
    ],
  },
  {
    id: "marketing",
    title: "Маркетинг не окупается?",
    rows: [
      {
        service: "Анализ целевой аудитории",
        href: `${INSIGHTER}/audience-research/`,
        ifLookingFor: "Быстрый и качественный анализ глубинных потребностей ЦА",
      },
      {
        service: "Повышение LTV",
        href: `${INSIGHTER}/ltv/`,
        ifLookingFor:
          "Способы повышения LTV и retention. Способы повышения эффективности рекламы",
      },
    ],
  },
  {
    id: "team-productivity",
    title: "Сотрудники не дают ожидаемой отдачи?",
    rows: [
      {
        service: "Продуктивная команда",
        href: `${INSIGHTER}/effective-team/`,
        ifLookingFor:
          "Решение проблем внутри команды: низкая продуктивность, выгорание, нет инициативы, саботаж",
      },
      {
        service: "Управление стрессом",
        href: `${INSIGHTER}/stress-management/`,
        ifLookingFor:
          "Решение для снижения выгорания и стресса внутри команды, в том числе топов и С-level",
      },
      {
        service: "Бизнес-игры и тренинги",
        href: `${INSIGHTER}/vebinary-biznes-igry/`,
        ifLookingFor: "Решения для тимбилдинга",
      },
    ],
  },
  {
    id: "retention",
    title: "Ключевые сотрудники уходят?",
    rows: [
      {
        service: "Удержание ключевых сотрудников",
        href: `${INSIGHTER}/retention/`,
        ifLookingFor: "Решение проблемы удержания в компании",
      },
      {
        service: "Управление стрессом",
        href: `${INSIGHTER}/stress-management/`,
        ifLookingFor: "Решение проблемы выгорания в компании",
      },
      {
        service: "Бизнес-игры и тренинги",
        href: `${INSIGHTER}/vebinary-biznes-igry/`,
        ifLookingFor: "Формат тимбилдинга для удержания ключевых сотрудников",
      },
    ],
  },
  {
    id: "personal",
    title: "Проседает личная эффективность?",
    rows: [
      {
        service: "Ресурс руководителя",
        href: `${INSIGHTER}/leader-resource/`,
        ifLookingFor: "Стратегию развития с персональным куратором и приоритетной поддержкой",
      },
      {
        service: "Ресурс эксперта",
        href: `${INSIGHTER}/expert-resource/`,
        ifLookingFor: "Стратегию роста личной эффективности специалиста",
      },
      {
        service: "Управление стрессом",
        href: `${INSIGHTER}/stress-management/`,
        ifLookingFor: "Способы справиться с стрессом для повышения личной эффективности",
      },
    ],
  },
];

export const INSIGHTER_PRICES_URL = `${INSIGHTER}/prices/`;
