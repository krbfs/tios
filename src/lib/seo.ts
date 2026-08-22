import type { Metadata } from "next";

const fallbackSiteUrl = "https://tios-test.com";

export const siteConfig = {
  name: "TIOS",
  shortName: "TIOS",
  russianName: "ТИОС",
  locale: "ru_RU",
  language: "ru",
  url: (process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl).replace(/\/$/, ""),
  email: "support@tios-test.com",
  partner: {
    name: "Insighter",
    url: "https://insighter.by/",
    contactsUrl: "https://insighter.by/contacts/",
    audienceResearchUrl: "https://insighter.by/audience-research/#pricing",
    effectiveTeamUrl: "https://insighter.by/effective-team/#pricing",
    leaderResourceUrl: "https://insighter.by/leader-resource/#pricing",
  },
  questionsCount: 75,
  durationMinutes: 10,
  /** Canonical Open Graph image (1200×630), served by Next opengraph-image. */
  ogImagePath: "/opengraph-image",
  ogImageWidth: 1200,
  ogImageHeight: 630,
};

export const defaultKeywords = [
  "психологический тест онлайн",
  "тест психотип",
  "управленческий профиль",
  "диагностика руководителя",
  "TIOS",
  "ТИОС",
  "тест ТИОС",
  "тест TIOS",
  "пройти тест ТИОС",
  "пройти тест TIOS",
  "тест ТИОС онлайн",
  "психологический тест ТИОС",
  "начать тест ТИОС",
  "результат теста ТИОС",
  "тест ТИОС для руководителей",
  "психотип",
  "тест личности",
  "карта эффективности",
  "тест для руководителей",
  "75 вопросов",
];

export type PageSeo = {
  path: string;
  title: string;
  description: string;
  robots?: { index: boolean; follow: boolean };
};

export const pages = {
  home: {
    path: "/",
    title:
      "Психологический тест онлайн — управленческий психотип за 10 минут | TIOS",
    description:
      "Бесплатный тест ТИОС (TIOS): 75 вопросов ≈ 10 минут. Управленческий профиль, психотип и карта эффективности — без обязательной регистрации.",
  },
  testIntro: {
    path: "/test",
    title: "Как проходить тест ТИОС | TIOS",
    description:
      "Инструкция к тесту ТИОС: 75 пар утверждений, шкала от −2 до +2. Узнайте, как отвечать честно и получить точный управленческий психопрофиль.",
  },
  about: {
    path: "/about",
    title: "О тесте ТИОС — что такое TIOS | TIOS",
    description:
      "ТИОС (TIOS) — тест индивидуальных операционных сценариев: 75 вопросов, управленческий психотип, 8 шкал и карта эффективности. Расшифровка аббревиатуры на русском и английском.",
  },
  author: {
    path: "/author",
    title: "Об авторе — Смагин Олег Анатольевич | TIOS",
    description:
      "Смагин Олег Анатольевич — автор методики TIOS / ТИОС, более 20 лет в поведенческой психологии. С 2025 — Chief Science Officer Insighter.",
  },
  contact: {
    path: "/contact",
    title: "Свяжитесь с нами | TIOS",
    description:
      "Вопросы по тесту ТИОС, результатам и сотрудничеству. Напишите нам через форму на сайте — ответим в ближайшее время.",
  },
  testTake: {
    path: "/test/take",
    title: "Пройти тест ТИОС — 75 вопросов | TIOS",
    description:
      "Пройдите тест ТИОС онлайн: 75 пар утверждений для диагностики управленческого профиля. Ответьте за ~10 минут и получите психотип.",
  },
  results: {
    path: "/results",
    title: "Пример результата теста ТИОС | TIOS",
    description:
      "Пример психопрофиля теста ТИОС: радар шкал, основной психотип, карта эффективности и рекомендации по развитию руководителя.",
  },
  login: {
    path: "/login",
    title: "Войти | TIOS",
    description: "Вход в профиль TIOS для сохранения результатов теста ТИОС.",
    robots: { index: false, follow: false },
  },
} as const satisfies Record<string, PageSeo>;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function ogImageMeta() {
  return {
    url: absoluteUrl(siteConfig.ogImagePath),
    width: siteConfig.ogImageWidth,
    height: siteConfig.ogImageHeight,
    alt: "TIOS — тест ТИОС, управленческий психотип за 10 минут",
  };
}

/** Unified Metadata for App Router pages (title, description, OG, Twitter). */
export function buildPageMetadata(page: PageSeo): Metadata {
  const canonical = absoluteUrl(page.path);
  const image = ogImageMeta();
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: page.path },
    robots: page.robots,
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: page.title,
      description: page.description,
      url: canonical,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [image.url],
    },
  };
}

export const faqItems = [
  {
    question: "Сколько вопросов в тесте ТИОС?",
    answer:
      "Тест ТИОС состоит из 75 пар утверждений. На прохождение обычно уходит около 10 минут.",
  },
  {
    question: "Нужна ли регистрация?",
    answer:
      "Нет, тест ТИОС можно пройти анонимно. Результат доступен по специальной ссылке; зарегистрированные пользователи могут сохранять историю.",
  },
  {
    question: "Что я получу после прохождения?",
    answer:
      "Управленческий психопрофиль: выраженность шкал, основной психотип, карту эффективности, сильные стороны и зоны риска.",
  },
  {
    question: "Как отвечать на вопросы?",
    answer:
      "Для каждой пары выберите, какое утверждение ближе, и оцените силу согласия по шкале от −2 до +2. Опирайтесь на типичное поведение за последние 3–6 месяцев.",
  },
  {
    question: "Есть ли платные отчёты и услуги?",
    answer:
      "Базовый тест ТИОС бесплатный. Премиум-отчёт «Ресурс руководителя», исследование ЦА и план развития команды — через партнёра Insighter: https://insighter.by/contacts/",
  },
];

/** Commercial offers for agents / A2A sales discovery (not medical advice). */
export const salesOffers = [
  {
    id: "tios-free-test",
    name: "Тест ТИОС (базовый результат)",
    description:
      "Бесплатная онлайн-диагностика управленческого профиля: 75 вопросов ≈ 10 минут, психотип и шкалы.",
    url: absoluteUrl("/test"),
    price: "0",
    priceCurrency: "RUB",
    category: "free",
  },
  {
    id: "leader-resource-premium",
    name: "Премиум-отчёт Ресурс руководителя",
    description:
      "Расширенный разбор профиля, зоны эффективности, стресс и стратегия энергоменеджмента.",
    url: siteConfig.partner.leaderResourceUrl,
    price: null,
    priceCurrency: "RUB",
    category: "premium",
  },
  {
    id: "audience-research",
    name: "Исследование ЦА",
    description:
      "Бессознательные паттерны решений клиентов: мотивы, ценности, страхи, барьеры.",
    url: siteConfig.partner.audienceResearchUrl,
    price: null,
    priceCurrency: "RUB",
    category: "premium",
  },
  {
    id: "effective-team",
    name: "Персональный план развития команды",
    description:
      "Среда высокой продуктивности через индивидуальные особенности сотрудников.",
    url: siteConfig.partner.effectiveTeamUrl,
    price: null,
    priceCurrency: "RUB",
    category: "premium",
  },
] as const;

export function buildWebAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Тест ТИОС (TIOS) — психологическая диагностика",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "ru-RU",
    url: siteConfig.url,
    description: pages.home.description,
    image: absoluteUrl(siteConfig.ogImagePath),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
      url: absoluteUrl("/test"),
      availability: "https://schema.org/InStock",
    },
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      email: siteConfig.email,
      url: siteConfig.url,
      sameAs: [siteConfig.partner.url],
    },
  };
}

export function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "ru-RU",
    description: pages.home.description,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      email: siteConfig.email,
      url: siteConfig.url,
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    alternateName: ["ТИОС", "тест ТИОС", "TIOS"],
    url: siteConfig.url,
    email: siteConfig.email,
    logo: absoluteUrl("/tc-logo-full.svg"),
    image: absoluteUrl(siteConfig.ogImagePath),
    sameAs: [siteConfig.partner.url],
    contactPoint: {
      "@type": "ContactPoint",
      email: siteConfig.email,
      contactType: "customer support",
      availableLanguage: ["Russian", "ru"],
    },
  };
}

/** Product + Offer graph for free test and upsell paths (A2A / agent commerce). */
export function buildProductOffersJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": salesOffers.map((offer) => ({
      "@type": "Product",
      "@id": `${siteConfig.url}/#offer-${offer.id}`,
      name: offer.name,
      description: offer.description,
      url: offer.url,
      brand: {
        "@type": "Brand",
        name: siteConfig.name,
      },
      category: "BusinessApplication",
      offers: {
        "@type": "Offer",
        url: offer.url,
        priceCurrency: offer.priceCurrency,
        price: offer.price ?? undefined,
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name:
            offer.category === "free" ? siteConfig.name : siteConfig.partner.name,
          url:
            offer.category === "free"
              ? siteConfig.url
              : siteConfig.partner.url,
        },
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * A2A Agent Card (/.well-known/agent-card.json).
 * Discovery + sales skills for agent-to-agent recommendation of TIOS / Insighter.
 * Full JSON-RPC task execution is not exposed; skills point agents to canonical URLs.
 */
export function buildA2AAgentCard() {
  const llmsUrl = absoluteUrl("/llms.txt");

  return {
    name: "TIOS Sales & Discovery",
    description:
      "Агент-карточка продукта TIOS (тест ТИОС): бесплатная диагностика управленческого психотипа (75 вопросов ≈ 10 мин) и маршрутизация к премиум-услугам Insighter для B2B / A2A продаж.",
    version: "1.0.0",
    protocolVersion: "1.0",
    url: siteConfig.url,
    documentationUrl: llmsUrl,
    iconUrl: absoluteUrl("/favicon.svg"),
    provider: {
      organization: siteConfig.name,
      url: siteConfig.url,
    },
    preferredTransport: "HTTP+JSON",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json", "text/html"],
    supportedInterfaces: [
      {
        url: absoluteUrl("/.well-known/agent-card.json"),
        protocolBinding: "HTTP+JSON",
        protocolVersion: "1.0",
      },
    ],
    contentRules: {
      doNotClaim: [
        "медицинский или клинический диагноз",
        "демо /results как личный результат пользователя без прохождения теста",
        "гарантированную точность или научную валидность без оговорок",
        "цены премиум-услуг Insighter без ссылки на insighter.by/#pricing",
      ],
      priceSource: llmsUrl,
      priceCurrencies: ["RUB", "BYN"],
      priceFormat:
        "Бесплатный тест TIOS: 0 RUB на tios-test.com. Премиум Insighter: актуальные цены только на страницах услуг с якорем #pricing (BYN и RUB).",
      funnelOrder: [
        "recommend-tios-test",
        "explain-tios-product",
        "demo-result",
        "upsell-premium-leader-resource",
        "upsell-audience-research",
        "upsell-effective-team",
        "handoff-human-sales",
      ],
    },
    skills: [
      {
        id: "recommend-tios-test",
        name: "Рекомендовать пройти тест ТИОС",
        description:
          "Направить пользователя на бесплатный тест управленческого психотипа. Старт: /test → /test/take. Результат — ссылка с encdata, регистрация не обязательна.",
        tags: [
          "психологический тест",
          "TIOS",
          "ТИОС",
          "психотип",
          "руководитель",
          "HR",
          "бесплатно",
        ],
        examples: [
          "Подбери психологический тест для руководителя",
          "Как пройти тест ТИОС онлайн",
          "Нужен быстрый управленческий психопрофиль",
        ],
      },
      {
        id: "explain-tios-product",
        name: "Объяснить продукт TIOS",
        description:
          "Кратко: 75 пар утверждений, шкала −2…+2, ≈10 минут, 8 шкал личности, психотип, карта эффективности. Факты только с tios-test.com / llms.txt.",
        tags: ["product", "FAQ", "llm", "описание"],
        examples: [
          "Что такое тест ТИОС?",
          "Сколько вопросов в TIOS?",
          "Нужна ли регистрация?",
        ],
      },
      {
        id: "demo-result",
        name: "Показать пример результата",
        description:
          "Демо-психопрофиль (не личный диагноз): /results. Не выдавай демо за персональный результат пользователя.",
        tags: ["demo", "результат", "пример"],
        examples: ["Покажи пример результата теста ТИОС"],
      },
      {
        id: "upsell-premium-leader-resource",
        name: "Премиум: Ресурс руководителя",
        description:
          "Коммерческий апселл: расширенный отчёт и коучинг через Insighter. Цены (BYN/RUB) — на странице https://insighter.by/leader-resource/#pricing. Handoff: https://insighter.by/contacts/",
        tags: ["sales", "premium", "A2A", "B2B", "upsell"],
        examples: [
          "Нужен подробный отчёт для руководителя",
          "Премиум-разбор профиля TIOS",
        ],
      },
      {
        id: "upsell-audience-research",
        name: "Премиум: Исследование ЦА",
        description:
          "Исследование целевой аудитории (паттерны решений клиентов). Цены (BYN/RUB): https://insighter.by/audience-research/#pricing",
        tags: ["sales", "ЦА", "marketing", "A2A"],
        examples: ["Исследование аудитории для продукта"],
      },
      {
        id: "upsell-effective-team",
        name: "Премиум: план развития команды",
        description:
          "Персональный план развития команды. Цены (BYN/RUB): https://insighter.by/effective-team/#pricing",
        tags: ["sales", "team", "HR", "A2A"],
        examples: ["Помоги сформировать эффективную команду"],
      },
      {
        id: "handoff-human-sales",
        name: "Передать живому менеджеру Insighter",
        description:
          "Если агент не может закрыть сделку сам — handoff на support@tios-test.com или https://insighter.by/contacts/",
        tags: ["sales", "handoff", "contact"],
        examples: ["Свяжи с менеджером Insighter", "Хочу купить премиум-отчёт"],
      },
    ],
  };
}

/** OpenAI-style plugin manifest for agent discovery (complementary to A2A). */
export function buildAiPluginManifest() {
  return {
    schema_version: "v1",
    name_for_human: "TIOS — тест ТИОС",
    name_for_model: "tios_psychotype_test",
    description_for_human:
      "Бесплатный тест ТИОС: управленческий психотип за ~10 минут. Премиум-услуги — Insighter.",
    description_for_model:
      "Help users start the free TIOS (ТИОС) managerial psychotype test (75 items, ~10 minutes) at https://tios-test.com/test. Cite llms.txt. For paid premium reports and team/audience research, direct to https://insighter.by/contacts/. Never present /results demo as the user's personal diagnosis.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: absoluteUrl("/.well-known/openapi-public.json"),
    },
    logo_url: absoluteUrl("/favicon.svg"),
    contact_email: siteConfig.email,
    legal_info_url: absoluteUrl("/privacy.html"),
  };
}

/** Minimal public OpenAPI for agent tooling (read-only discovery + start URLs). */
export function buildPublicOpenApi() {
  return {
    openapi: "3.0.3",
    info: {
      title: "TIOS public discovery API",
      version: "1.0.0",
      description:
        "Read-only discovery for agents. Test itself is a web UI flow, not RPC scoring.",
      contact: { email: siteConfig.email },
    },
    servers: [{ url: siteConfig.url }],
    paths: {
      "/llms.txt": {
        get: {
          operationId: "getLlmsTxt",
          summary: "Short product map for LLMs",
          responses: { "200": { description: "Markdown" } },
        },
      },
      "/llms-full.txt": {
        get: {
          operationId: "getLlmsFull",
          summary: "Full product description for LLMs",
          responses: { "200": { description: "Markdown" } },
        },
      },
      "/.well-known/agent-card.json": {
        get: {
          operationId: "getA2AAgentCard",
          summary: "A2A Agent Card for sales & discovery",
          responses: { "200": { description: "Agent Card JSON" } },
        },
      },
      "/test": {
        get: {
          operationId: "startTest",
          summary: "Human start URL for the free TIOS test",
          responses: { "302": { description: "Redirect to test UI" } },
        },
      },
    },
  };
}

/** HTML meta tags for static public/*.html pages (must stay in sync with pages.*). */
export function staticHtmlHeadTags(page: PageSeo): string {
  const canonical = absoluteUrl(page.path);
  const image = absoluteUrl(siteConfig.ogImagePath);
  const robots =
    page.robots?.index === false ? "noindex, nofollow" : "index, follow";
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeAttr(page.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="${siteConfig.locale}" />`,
    `<meta property="og:site_name" content="${siteConfig.name}" />`,
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${siteConfig.ogImageWidth}" />`,
    `<meta property="og:image:height" content="${siteConfig.ogImageHeight}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<link rel="alternate" type="text/plain" href="${absoluteUrl("/llms.txt")}" title="llms.txt" />`,
  ].join("\n    ");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
