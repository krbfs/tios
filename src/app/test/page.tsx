import Link from "next/link";

const scaleDemo = [
  "первое утверждение однозначно ближе",
  "скорее ближе первое утверждение",
  "оба утверждения одинаково близко/далеко",
  "скорее ближе второе утверждение",
  "второе утверждение однозначно ближе",
];

export default function TestIntroPage() {
  return (
    <div className="container-page py-10 max-w-[700px]">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center mb-4">
        Диагностика управленческого профиля
      </h1>
      <p className="text-muted text-center mb-8">
        Методика основана на анализе поведенческих паттернов 10 000+ руководителей. Получите объективное
        подтверждение ваших сильных сторон в управлении. Результаты доступны только вам. Конфиденциальность
        гарантирована.
      </p>

      <h2 className="text-xl font-bold text-center mb-4">Как проходить?</h2>
      <p className="text-muted text-center mb-8">
        Тест состоит из 75 вопросов, которые помогут вам больше узнать о своей личности и психологическом
        профиле. Каждый вопрос представляет собой пару утверждений — выберите, какое из двух вам ближе и
        насколько вы с ним согласны.
      </p>

      <div className="rounded-lg border border-solid border-border p-4 mb-6 bg-white">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
          <div className="text-center font-semibold text-primary">Утверждение 1</div>
          <div />
          <div className="text-center font-semibold text-primary">Утверждение 2</div>
        </div>
        <div className="flex justify-around items-start gap-2">
          {scaleDemo.map((label, index) => (
            <div key={label} className="flex flex-col items-center text-center mx-1 max-w-[90px]">
              <div className="mb-2 size-[36px] rounded-full border-4 border-solid border-primary flex items-center justify-center text-[8px] md:text-xs lg:text-sm font-bold text-primary">
                {index < 2 ? "←" : index === 2 ? "=" : "→"}
              </div>
              <div className="text-[8px] md:text-xs lg:text-sm text-muted leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-muted text-center mb-8">
        Отвечая на вопросы, старайтесь объективно оценивать себя и честно указывать, как бы вы поступили в той
        или иной ситуации без чьей-либо помощи и подсказок.
      </p>

      <div className="flex justify-center">
        <Link href="/test/take" className="btn btn-primary btn-lg">
          Начать
        </Link>
      </div>
    </div>
  );
}
