"use client";

import type { AnswerValue } from "@/lib/test-storage";

const OPTIONS: { value: AnswerValue; title: string }[] = [
  { value: -2, title: "первое утверждение однозначно ближе" },
  { value: -1, title: "скорее ближе первое утверждение" },
  { value: 0, title: "оба утверждения одинаково близко/далеко" },
  { value: 1, title: "скорее ближе второе утверждение" },
  { value: 2, title: "второе утверждение однозначно ближе" },
];

type Props = {
  name: string;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
};

export function ScaleChoice({ name, value, onChange }: Props) {
  return (
    <div className="flex w-full items-center justify-around py-2">
      {OPTIONS.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            title={option.title}
            className="flex cursor-pointer flex-col items-center justify-center"
          >
            <span
              className={[
                "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-solid border-primary",
                checked ? "bg-primary" : "bg-white",
              ].join(" ")}
            >
              <input
                className="sr-only"
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
              />
            </span>
          </label>
        );
      })}
    </div>
  );
}
