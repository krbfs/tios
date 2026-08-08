import Link from "next/link";

const reasons = [
  {
    title: "Научно‑обоснованный метод",
    text: "Алгоритм проверен на 10 000+ пользователей.",
  },
  {
    title: "75 вопросов ≈ 10 минут",
    text: "Завершите тест за кофе‑брейк и получите результат мгновенно.",
  },
  {
    title: "Бесплатно и без регистрации",
    text: "Можно пройти анонимно, а результат останется по уникальной ссылке.",
  },
  {
    title: "Детальный психопрофиль",
    text: "Инструмент снижения рисков при работе в команде.",
  },
  {
    title: "Конфиденциальность данных",
    text: "Результаты шифруются, доступны только вам и нашим специалистам.",
  },
];

const benefits = [
  {
    icon: "/taking-notes.svg",
    title: "Динамика наблюдений",
    text: "Вы можете проходить наши тесты периодически, отслеживая своё психологическое состояние.",
  },
  {
    icon: "/genius.svg",
    title: "Безопасность результатов",
    text: "Все результаты тестирований хранятся в безопасной базе данных. Доступ имеете только вы и наши специалисты.",
  },
  {
    icon: "/calculator.svg",
    title: "Индивидуальный подход",
    text: "Вы всегда можете обратиться к нашим специалистам за персональным разбором управленческого профиля.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-solid border-border bg-[linear-gradient(180deg,#eef1fb_0%,#ffffff_55%)]">
        <div className="container-page grid lg:grid-cols-2 gap-8 items-center py-12 lg:py-16">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-primary mb-4">
              Диагностика управленческого профиля: сфера ваших талантов и карта эффективности
            </h1>
            <p className="text-muted text-lg mb-8 max-w-xl">
              Получите объективное подтверждение ваших сильных сторон и рекомендации по их оптимизации
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/test" className="btn btn-primary btn-lg">
                Узнать свой психотип
              </Link>
              <Link href="/results" className="btn btn-outline btn-lg">
                Пример результата
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rocket.svg"
              alt="Иллюстрация Teamconstructor"
              width={420}
              height={420}
              className="w-full max-w-[420px] h-auto"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Почему стоит пройти тест Teamconstructor
        </h2>
        <div className="grid gap-4 max-w-3xl mx-auto">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="relative rounded-lg border border-solid border-border bg-white/80 backdrop-blur p-4 pl-14"
            >
              <span className="absolute left-4 top-7 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-sm font-bold">
                ✓
              </span>
              <h3 className="font-semibold mb-1 leading-tight">{item.title}</h3>
              <p className="text-muted text-md">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-muted max-w-3xl mx-auto mt-8">
          Тест состоит из 75 пар утверждений. Для каждого выберите, какое утверждение ближе и насколько вы с ним согласны.
          Отвечайте честно — так вы получите наиболее точный психопрофиль.
        </p>
      </section>

      <section className="bg-surface border-y border-solid border-border py-12">
        <div className="container-page">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Что вы получите после ответа на 75 вопросов
          </h2>
          <p className="text-center text-muted max-w-3xl mx-auto mb-10">
            С помощью нашего теста вы сможете узнать особенности своего характера и получить инструмент
            подтверждения управленческой компетентности.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((item) => (
              <div key={item.title} className="text-center flex flex-col items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.icon} alt="" width={140} height={140} className="h-[140px] w-auto" />
                <h3 className="text-xl font-bold text-primary">{item.title}</h3>
                <p className="text-muted">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-muted max-w-3xl mx-auto mt-10">
            Тест можно проходить без регистрации. В таком случае вы всегда сможете получить доступ к результату
            по специальной ссылке. Зарегистрированные пользователи могут сохранять все результаты и наблюдать
            за динамикой изменения своего состояния.
          </p>
          <div className="flex justify-center mt-8">
            <Link href="/test" className="btn btn-primary btn-lg">
              Пройти тест
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-8 text-center text-muted">
        Наш партнер —{" "}
        <a
          href="https://insighter.pro"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          ООО Инсайтер
        </a>
      </section>
    </div>
  );
}
