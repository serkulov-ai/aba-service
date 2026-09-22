"use client";

import { useActionState } from "react";
import { addDomain, addSkill, updateSkill, type DomainState, type SkillFormState } from "./actions";

export type SkillFields = {
  id?: string;
  name: string;
  position: number;
  instruction: string;
  materials: string;
  curatorComment: string;
};

const input = "mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2";

function Fields({ skill }: { skill?: SkillFields }) {
  return (
    <>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-sm font-semibold">Название навыка</span>
          <input name="name" required maxLength={200} defaultValue={skill?.name} className={`${input} h-12`} />
        </label>
        <label className="w-24">
          <span className="text-sm font-semibold">Порядок</span>
          <input
            name="position"
            type="number"
            min={0}
            max={999}
            defaultValue={skill?.position ?? 0}
            className={`${input} h-12`}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Инструкция для ребёнка</span>
        <textarea name="instruction" rows={3} maxLength={4000} defaultValue={skill?.instruction} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Материалы</span>
        <input name="materials" maxLength={1000} defaultValue={skill?.materials} className={`${input} h-12`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Комментарий куратора</span>
        <textarea name="curatorComment" rows={2} maxLength={2000} defaultValue={skill?.curatorComment} className={input} />
      </label>
    </>
  );
}

function Result({ state }: { state: SkillFormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
        {state.error}
      </p>
    );
  if (state.saved)
    return (
      <p role="status" className="rounded-xl bg-independent/10 px-4 py-3 text-sm font-semibold text-independent">
        Изменения сохранены.
      </p>
    );
  return null;
}

export function EditSkillForm({ skill }: { skill: SkillFields & { id: string } }) {
  const [state, action, pending] = useActionState<SkillFormState, FormData>(updateSkill, { error: null });
  return (
    <form action={action} className="mt-3 space-y-3 border-t border-border pt-3">
      <input type="hidden" name="skillId" value={skill.id} />
      <Fields skill={skill} />
      <Result state={state} />
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}

export function AddSkillForm({ domains }: { domains: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<SkillFormState, FormData>(addSkill, { error: null });
  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex h-12 cursor-pointer list-none items-center justify-center rounded-2xl font-semibold text-primary hover:bg-primary-soft group-open:rounded-b-none group-open:border-b group-open:border-border">
        Добавить навык
      </summary>
      <form action={action} className="space-y-3 p-4">
        <label className="block">
          <span className="text-sm font-semibold">Раздел</span>
          <select name="domainId" required defaultValue="" className={`${input} h-12`}>
            <option value="" disabled>
              Выберите раздел
            </option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <Fields />
        <Result state={state} />
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Добавить навык"}
        </button>
      </form>
    </details>
  );
}

export function AddDomainForm() {
  const [state, action, pending] = useActionState<DomainState, FormData>(addDomain, { error: null });
  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex h-12 cursor-pointer list-none items-center justify-center rounded-2xl font-semibold text-primary hover:bg-primary-soft group-open:rounded-b-none group-open:border-b group-open:border-border">
        Добавить раздел
      </summary>
      <form action={action} className="flex flex-wrap gap-2 p-4">
        <label className="min-w-40 flex-1">
          <span className="text-sm font-semibold">Название раздела</span>
          <input name="name" required maxLength={100} className={`${input} h-12`} />
        </label>
        <label className="w-24">
          <span className="text-sm font-semibold">Порядок</span>
          <input name="position" type="number" min={0} max={999} defaultValue={0} className={`${input} h-12`} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-6 h-12 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Добавить"}
        </button>
        {state.error && (
          <p role="alert" className="w-full rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
            {state.error}
          </p>
        )}
      </form>
    </details>
  );
}
