"use client";

import { useActionState } from "react";
import { addTarget, type FormState } from "./actions";

type SkillOption = { id: string; name: string; domain: string; inProgram: boolean };

export function AddTargetForm({
  childId,
  skills,
  open,
}: {
  childId: string;
  skills: SkillOption[];
  open: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addTarget, { error: null });

  const domains = [...new Set(skills.map((s) => s.domain))];

  return (
    <details open={open} className="group rounded-2xl border border-border bg-surface">
      <summary className="flex h-12 cursor-pointer list-none items-center justify-center rounded-2xl font-semibold text-primary hover:bg-primary-soft group-open:rounded-b-none group-open:border-b group-open:border-border">
        Добавить навык
      </summary>
      <form action={action} className="space-y-4 p-4">
        <input type="hidden" name="childId" value={childId} />
        <label className="block">
          <span className="text-sm font-semibold">Навык из базы</span>
          <select
            name="skillId"
            required
            defaultValue=""
            className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3"
          >
            <option value="" disabled>
              Выберите навык
            </option>
            {domains.map((d) => (
              <optgroup key={d} label={d}>
                {skills
                  .filter((s) => s.domain === d)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.inProgram ? " — уже в программе" : ""}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Цель</span>
          <input
            name="name"
            maxLength={200}
            placeholder="Например: «Хлопок». Пусто — как название навыка"
            className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 placeholder:text-muted"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Инструкции и примечания</span>
          <textarea
            name="notes"
            rows={2}
            maxLength={2000}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span className="text-sm font-semibold">Ротация стимулов А, Б, В</span>
          <input type="checkbox" name="usesRotation" className="h-6 w-6 accent-primary" />
        </label>
        <p className="text-sm text-muted">Новая цель начинается с задержки 0 сек.</p>
        {state.error && (
          <p role="alert" className="rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Добавить в программу"}
        </button>
      </form>
    </details>
  );
}
