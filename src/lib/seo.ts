const fallbackSiteUrl = "https://tc26-wppkmlz42a-ew.a.run.app";

export const siteConfig = {
  name: "Teamconstructor",
  shortName: "TC",
  locale: "ru_RU",
  language: "ru",
  url: (process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl).replace(/\/$/, ""),
  email: "support@teamconstructor.pro",
  partner: {
    name: "ООО Инсайтер",
    url: "https://insighter-service.com/",
  },
  questionsCount: 75,
  durationMinutes: 10,
};

export const defaultKeywords = [
  "психологический тест онлайн",
  "тест психотип",
  "управленческий профиль",
  "диагностика руководителя",
  "Teamconstructor",
  "психотип",
  "тест личности",
  "карта эффективности",
  "тест для руководителей",
  "75 вопросов",
];

export const pages = {
  home: {
    path: "/",
    title:
      "Психологический тест онлайн — управленческий психотип за 10 минут | Teamconstructor",
    description:
      "Бесплатный психологический тест Teamconstructor: 75 вопросов ≈ 10 минут. Диагностика управленческого профиля, психотип и карта эффективности — без обязательной регистрации.",
  },
  testIntro: {
    path: "/test",
    title: "Как проходить психологический тест | Teamconstructor",
    description:
      "Инструкция к тесту Teamconstructor: 75 пар утверждений, шкала от −2 до +2. Узнайте, как отвечать честно и получить точный управленческий психопрофиль.",
  },
  testTake: {
    path: "/test/take",
    title: "Пройти психологический тест — 75 вопросов | Teamconstructor",
    description:
      "Пройдите психологический тест онлайн: 75 пар утверждений для диагностики управленческого профиля. Ответьте за ~10 минут и получите психотип.",
  },
  results: {
    path: "/results",
    title: "Пример результата психологического теста | Teamconstructor",
    description:
      "Пример психопрофиля Teamconstructor: радар шкал, основной психотип, карта эффективности и рекомендации по развитию руководителя.",
  },
  login: {
    path: "/login",
    title: "Войти | Teamconstructor",
    description: "Вход в профиль Teamconstructor для сохранения результатов теста.",
    robots: { index: false, follow: false },
  },
} as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export const faqItems = [
  {
    question: "Сколько вопросов в тесте Teamconstructor?",
    answer:
      "Тест состоит из 75 пар утверждений. На прохождение обычно уходит около 10 минут.",
  },
  {
    question: "Нужна ли регистрация?",
    answer:
      "Нет, тест можно пройти анонимно. Результат доступен по специальной ссылке; зарегистрированные пользователи могут сохранять историю.",
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
];

export function buildWebAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Teamconstructor — психологический тест",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "ru-RU",
    url: siteConfig.url,
    description: pages.home.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
    },
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      email: siteConfig.email,
      url: siteConfig.url,
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
    },
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
