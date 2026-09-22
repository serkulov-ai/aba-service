"use client";

import { useSyncStatus } from "@/lib/offline/outbox";
import {
  DELAYS,
  POSITION_LABEL,
  STIMULUS_LETTER,
  TRIALS_PER_SESSION,
  type Delay,
  type RotationStep,
  type Trial,
} from "@/lib/rules";

export const TRIAL_SIGN: Record<Trial, string> = { S: "С", P: "+", M: "−" };

const TRIAL_COLOR: Record<Trial, string> = {
  S: "bg-independent text-white border-independent",
  P: "bg-prompted text-white border-prompted",
  M: "bg-incorrect text-white border-incorrect",
};

export function SyncBanner() {
  const { state, online } = useSyncStatus();
  if (!online || state === "offline") {
    return (
      <p role="status" className="mb-4 rounded-xl bg-prompted/15 px-4 py-3 text-sm">
        Нет интернета. Отметки сохранены на телефоне и отправятся, когда связь появится.
      </p>
    );
  }
  if (state === "error") {
    return (
      <p role="alert" className="mb-4 rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect-ink">
        Не удалось сохранить сессию. Мы попробуем ещё раз автоматически.
      </p>
    );
  }
  return null;
}

export function DelayPicker({ value, onChange }: { value: Delay; onChange: (d: Delay) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold">Задержка:</span>
      <div role="radiogroup" aria-label="Задержка подсказки" className="flex flex-1 gap-1 rounded-xl bg-border/60 p-1">
        {DELAYS.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={value === d}
            onClick={() => value !== d && onChange(d)}
            className={`h-12 flex-1 rounded-lg text-sm font-semibold transition-colors ${
              value === d ? "bg-primary text-white" : "text-foreground hover:bg-surface"
            }`}
          >
            {d} сек
          </button>
        ))}
      </div>
    </div>
  );
}

export function TrialDots({
  trials,
  current,
  onSelect,
}: {
  trials: readonly Trial[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="grid grid-cols-9 gap-1.5" aria-label="Пробы">
      {Array.from({ length: TRIALS_PER_SESSION }, (_, i) => {
        const t = trials[i];
        const isCurrent = i === current;
        return (
          <li key={i}>
            <button
              type="button"
              disabled={t === undefined}
              onClick={() => onSelect(i)}
              aria-label={t ? `Проба ${i + 1}: ${TRIAL_SIGN[t]}. Нажмите, чтобы исправить` : `Проба ${i + 1}`}
              className={`flex aspect-square w-full items-center justify-center rounded-full border-2 text-sm font-bold ${
                t ? TRIAL_COLOR[t] : "border-dashed border-border text-muted"
              } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              {t ? TRIAL_SIGN[t] : i + 1}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function TrialRow({ trials }: { trials: readonly Trial[] }) {
  return (
    <p className="flex gap-1.5" aria-label="Пробы">
      {trials.map((t, i) => (
        <span
          key={i}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${TRIAL_COLOR[t]}`}
        >
          {TRIAL_SIGN[t]}
        </span>
      ))}
    </p>
  );
}

// Стимулы на каждом занятии разные, поэтому только буквы А, Б, В — без названий.
export function RotationCard({
  step,
  trialNumber,
  table,
}: {
  step: RotationStep;
  trialNumber: number;
  table: number;
}) {
  const positions = ["L", "C", "R"] as const;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-semibold">
        Проба {trialNumber} из {TRIALS_PER_SESSION} · Просим:{" "}
        <span className="text-primary">стимул {STIMULUS_LETTER[step.asked]}</span>
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {positions.map((pos, i) => {
          const key = step.layout[i];
          const isTarget = pos === step.position;
          return (
            <div
              key={pos}
              className={`rounded-xl border-2 p-2 text-center ${
                isTarget ? "border-primary bg-primary-soft" : "border-border"
              }`}
            >
              <p className="text-xs text-muted">{POSITION_LABEL[pos]}</p>
              <p className={`text-3xl font-bold ${isTarget ? "text-primary" : ""}`}>{STIMULUS_LETTER[key]}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Раскладка со стороны специалиста · таблица {table}</p>
    </section>
  );
}

export function MarkButtons({ onMark, disabled }: { onMark: (t: Trial) => void; disabled?: boolean }) {
  const buttons: { t: Trial; label: string }[] = [
    { t: "S", label: "Сам" },
    { t: "P", label: "С подсказкой" },
    { t: "M", label: "Неверно" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {buttons.map(({ t, label }) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onMark(t)}
          className={`flex h-20 flex-col items-center justify-center rounded-2xl font-bold text-white active:scale-[0.97] disabled:opacity-50 ${
            TRIAL_COLOR[t]
          }`}
        >
          <span className="text-3xl leading-none">{TRIAL_SIGN[t]}</span>
          <span className="mt-1 text-xs font-semibold">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5">
        <p>{text}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl border border-border font-semibold hover:bg-primary-soft"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 rounded-xl bg-primary font-semibold text-on-primary hover:bg-primary-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
