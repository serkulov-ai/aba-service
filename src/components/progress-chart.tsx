"use client";

import { useId, useState } from "react";

export type ChartPoint = { correctPct: number; independentPct: number; delay: number };

// Мини-график по цели: % правильных и % самостоятельных за последние сессии.
// Пунктир — порог 90% из правил центра. Наведение или касание показывает цифры.
const W = 320;
const H = 96;
const PAD = { top: 8, right: 8, bottom: 8, left: 8 };

const SERIES = [
  { key: "correctPct", label: "Правильных", color: "var(--chart-primary)" },
  { key: "independentPct", label: "Самостоятельных", color: "var(--chart-independent)" },
] as const;

export function ProgressChart({ points }: { points: ChartPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  const n = points.length;
  const x = (i: number) => PAD.left + (n === 1 ? 0 : (i * (W - PAD.left - PAD.right)) / (n - 1));
  const y = (v: number) => PAD.top + ((100 - v) * (H - PAD.top - PAD.bottom)) / 100;

  const nearest = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  };

  const shown = active ?? n - 1;
  const p = points[shown];

  return (
    <figure className="mt-3">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t border-dashed border-muted" />
          порог 90%
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-24 w-full touch-none select-none"
        role="img"
        aria-labelledby={titleId}
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerDown={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
      >
        <title id={titleId}>
          {`Последние ${n} сессий: правильных ${points.map((q) => q.correctPct).join(", ")}%; самостоятельных ${points
            .map((q) => q.independentPct)
            .join(", ")}%`}
        </title>
        <line x1={PAD.left} x2={W - PAD.right} y1={y(100)} y2={y(100)} stroke="var(--border)" strokeWidth={1} />
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--border)" strokeWidth={1} />
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(90)}
          y2={y(90)}
          stroke="var(--muted)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted)" strokeWidth={1} />
        )}
        {SERIES.map((s) => (
          <g key={s.key}>
            <polyline
              points={points.map((q, i) => `${x(i)},${y(q[s.key])}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(shown)}
              cy={y(points[shown][s.key])}
              r={4}
              fill={s.color}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>

      <p className="mt-1 text-xs text-muted" aria-live="polite">
        {active === null ? "Последняя сессия" : `Сессия ${shown + 1} из ${n}`} · {p.delay} сек · правильных{" "}
        <span className="font-semibold text-foreground">{p.correctPct}%</span> · самостоятельных{" "}
        <span className="font-semibold text-foreground">{p.independentPct}%</span>
      </p>
    </figure>
  );
}
