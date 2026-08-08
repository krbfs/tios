"use client";

import { useEffect, useMemo, useState } from "react";
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
    return <div className="container-page py-10 text-muted">Загрузка…</div>;
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Психологический тест</h1>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
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
                "h-8 min-w-8 px-2 rounded-full border-2 border-solid text-sm font-semibold",
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

      <div className="flex flex-col gap-3 mb-8">
        {pageQuestions.map((question, index) => (
          <div
            key={question.id}
            className={[
              "rounded-0 lg:rounded-lg p-2 lg:px-6 lg:py-2 border border-solid border-border",
              index % 2 === 0 ? "bg-surface-alt" : "bg-white",
            ].join(" ")}
          >
            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-2 lg:gap-4 items-center">
              <p className="text-sm lg:text-base min-h-12 flex items-center lg:justify-end text-left lg:text-right">
                {question.left}
              </p>
              <div className="min-w-[220px] lg:min-w-[280px]">
                <ScaleChoice
                  name={`q-${question.id}`}
                  value={answers[question.id]}
                  onChange={(value) => setAnswer(question.id, value)}
                />
              </div>
              <p className="text-sm lg:text-base min-h-12 flex items-center">
                {question.right}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-3 max-w-xl mx-auto">
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
  );
}
