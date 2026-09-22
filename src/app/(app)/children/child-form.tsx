"use client";

import { useActionState } from "react";
import { METHOD_LABEL } from "@/lib/format";
import { createChild, updateChild, type ChildFormState } from "./actions";

export type ChildValues = {
  id?: string;
  last_name: string;
  first_name: string;
  patronymic: string | null;
  birth_date: string;
  methods: string[];
  specialist_id: string | null;
};

const METHODS = ["aba", "denver", "schieringer", "pecs", "other"] as const;
const input = "mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3";

export function ChildForm({
  child,
  specialists,
}: {
  child?: ChildValues;
  specialists: { id: string; full_name: string; role: string }[];
}) {
  const [state, action, pending] = useActionState<ChildFormState, FormData>(
    child ? updateChild : createChild,
    { error: null },
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      {child?.id && <input type="hidden" name="childId" value={child.id} />}
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-sm font-semibold">Фамилия</span>
          <input name="lastName" required maxLength={100} defaultValue={child?.last_name} className={input} />
        </label>
        <label className="flex-1">
          <span className="text-sm font-semibold">Имя</span>
          <input name="firstName" required maxLength={100} defaultValue={child?.first_name} className={input} />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Отчество</span>
        <span className="ml-1 text-sm text-muted">необязательно</span>
        <input name="patronymic" maxLength={100} defaultValue={child?.patronymic ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Дата рождения</span>
        <input name="birthDate" type="date" required defaultValue={child?.birth_date} className={input} />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">Методики</legend>
        <div className="mt-1 space-y-1">
          {METHODS.map((m) => (
            <label key={m} className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                name="methods"
                value={m}
                defaultChecked={child?.methods.includes(m)}
                className="h-6 w-6 accent-primary"
              />
              <span>{METHOD_LABEL[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold">Специалист</span>
        <select name="specialistId" defaultValue={child?.specialist_id ?? ""} className={input}>
          <option value="">Не назначен</option>
          {specialists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
              {s.role === "supervisor" ? " (руководитель)" : ""}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-xl bg-independent/10 px-4 py-3 text-sm font-semibold text-independent">
          Изменения сохранены.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Сохраняем…" : child ? "Сохранить" : "Добавить ребёнка"}
      </button>
    </form>
  );
}
