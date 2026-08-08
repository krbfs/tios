"use client";

import type { AnswerValue } from "@/lib/test-storage";

const OPTIONS: { value: AnswerValue; short: string; title: string }[] = [
  { value: -2, short: "←←", title: "первое утверждение однозначно ближе" },
  { value: -1, short: "←", title: "скорее ближе первое утверждение" },
  { value: 0, short: "=", title: "оба утверждения одинаково близко/далеко" },
  { value: 1, short: "→", title: "скорее ближе второе утверждение" },
  { value: 2, short: "→→", title: "второе утверждение однозначно ближе" },
];

type Props = {
  name: string;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
};

export function ScaleChoice({ name, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-around gap-1 py-2 w-full">
      {OPTIONS.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            title={option.title}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <span
              className={[
                "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-solid border-primary transition-colors",
                checked ? "bg-primary text-white" : "bg-white text-primary",
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
              <span className="text-[10px] font-bold leading-none">{option.short}</span>
            </span>
            <span className="hidden md:block text-[10px] text-muted text-center max-w-[72px] leading-tight">
              {option.title}
            </span>
          </label>
        );
      })}
    </div>
  );
}
