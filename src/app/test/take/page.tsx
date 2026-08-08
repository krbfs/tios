"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { questions } from "@/data/questions";
import { ScaleChoice } from "@/components/ScaleChoice";
import {
  type AnswerValue,
  loadAnswers,
  saveAnswers,
} from "@/lib/test-storage";

const PAGE_SIZE = 5;
const TOTAL_PAGES = Math.ceil(questions.length / PAGE_SIZE);

export default function TestTakePage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [ready, setReady] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(true);

  useEffect(() => {
    setAnswers(loadAnswers());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveAnswers(answers);
  }, [answers, ready]);

  const pageQuestions = useMemo(() => {
    const start = page * PAGE_SIZE;
    return questions.slice(start, start + PAGE_SIZE);
  }, [page]);

  const pageComplete = pageQuestions.every((q) => answers[q.id] !== undefined);

  const setAnswer = (id: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const goNext = () => {
    if (!pageComplete) return;
    if (page < TOTAL_PAGES - 1) {
      setPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push("/results");
  };

  const goPrev = () => {
    if (page === 0) {
      router.push("/test");
      return;
    }
    setPage((p) => p - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!ready) {
    return <div className="container mx-auto px-4 py-10 text-muted">Загрузка…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-4 lg:py-10">
      {showLoginAlert ? (
        <div
          className="relative mb-[30px] flex items-start justify-center gap-3 border border-solid border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm"
          role="alert"
        >
          <span className="mt-0.5 text-amber-600">⚠</span>
          <div>
            Для того, чтобы результат прохождения психологического теста
            сохранился в вашем профиле, необходимо{" "}
            <Link href="/login" className="underline">
              войти в систему
            </Link>
            .
          </div>
          <button
            type="button"
            className="absolute right-3 top-2 text-lg leading-none text-muted"
            aria-label="close"
            onClick={() => setShowLoginAlert(false)}
          >
            ×
          </button>
        </div>
      ) : null}

      <h2 className="mb-4 text-2xl font-semibold">Психологический тест</h2>

      <div className="rounded-lg border border-solid border-border bg-white">
        <div className="p-4 lg:p-6">
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {Array.from({ length: TOTAL_PAGES }, (_, index) => {
              const start = index * PAGE_SIZE;
              const chunk = questions.slice(start, start + PAGE_SIZE);
              const done = chunk.every((q) => answers[q.id] !== undefined);
              const active = index === page;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-solid text-sm font-semibold",
                    active
                      ? "border-primary bg-primary text-white"
                      : done
                        ? "border-primary bg-white text-primary"
                        : "border-border bg-white text-muted",
                  ].join(" ")}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mb-8 flex flex-col">
            {pageQuestions.map((question, index) => (
              <div
                key={question.id}
                className={[
                  "rounded-0 border-0 p-2 lg:rounded-lg lg:px-6 lg:py-2",
                  index % 2 === 0 ? "bg-gray-100" : "bg-white",
                ].join(" ")}
              >
                <div className="grid items-center gap-2 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
                  <p className="flex min-h-12 items-center text-sm lg:justify-end lg:text-right lg:text-base">
                    {question.left}
                  </p>
                  <div className="min-w-[220px] lg:min-w-[280px]">
                    <ScaleChoice
                      name={`q-${question.id}`}
                      value={answers[question.id]}
                      onChange={(value) => setAnswer(question.id, value)}
                    />
                  </div>
                  <p className="flex min-h-12 items-center text-sm lg:text-base">
                    {question.right}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between gap-3">
            <button type="button" className="btn btn-outline" onClick={goPrev}>
              Назад
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={goNext}
              disabled={!pageComplete}
            >
              {page === TOTAL_PAGES - 1 ? "Завершить" : "Вперед"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
