"use client";

import type { ScaleScore } from "@/data/mock-result";

type Props = {
  scales: ScaleScore[];
  max?: number;
};

export function RadarChart({ scales, max = 10 }: Props) {
  const size = 320;
  const center = size / 2;
  const radius = 110;
  const levels = 5;
  const angleStep = (Math.PI * 2) / scales.length;

  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const r = (value / max) * radius;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };

  const polygon = scales
    .map((scale, index) => {
      const p = point(index, scale.value);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px] mx-auto">
      {Array.from({ length: levels }, (_, level) => {
        const r = ((level + 1) / levels) * radius;
        const pts = scales
          .map((_, index) => {
            const angle = -Math.PI / 2 + index * angleStep;
            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
          })
          .join(" ");
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
        );
      })}

      {scales.map((_, index) => {
        const p = point(index, max);
        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="#d1d5db"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={polygon}
        fill="rgba(26, 84, 216, 0.22)"
        stroke="#1a54d8"
        strokeWidth="2"
      />

      {scales.map((scale, index) => {
        const labelPoint = point(index, max + 1.6);
        return (
          <text
            key={scale.key}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted"
            style={{ fontSize: 11 }}
          >
            {scale.label}
          </text>
        );
      })}
    </svg>
  );
}
