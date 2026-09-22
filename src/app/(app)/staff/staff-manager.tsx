"use client";

import { useActionState } from "react";
import { dateTimeLabel } from "@/lib/format";
import {
  addAssistant,
  createStaff,
  resetStaffPassword,
  setAssistantActive,
  setStaffActive,
  type AssistantState,
  type ResetState,
  type StaffFormState,
  type StaffMember,
} from "./actions";

const ROLE_LABEL = { supervisor: "Руководитель", specialist: "Специалист" } as const;

function Credentials({ name, email, password }: { name: string; email: string; password: string }) {
  const text = `Доступ в сервис АВА-занятия\nАдрес: ${typeof window === "undefined" ? "" : window.location.origin}\nПочта: ${email}\nПароль: ${password}`;
  return (
    <div className="rounded-xl bg-independent/10 p-4 text-sm">
      <p className="font-semibold text-independent">Готово. Передайте {name} эти данные.</p>
      <p className="mt-2">
        Почта: <span className="font-semibold">{email}</span>
        <br />
        Временный пароль: <span className="font-mono font-semibold">{password}</span>
      </p>
      <p className="mt-2 text-muted">Пароль показывается один раз. Сохраните его сейчас.</p>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(text)}
        className="mt-3 h-12 w-full rounded-xl border border-border bg-surface font-semibold hover:bg-primary-soft"
      >
        Скопировать
      </button>
    </div>
  );
}

function NewStaffForm() {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(createStaff, { error: null });

  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex h-12 cursor-pointer list-none items-center justify-center rounded-2xl font-semibold text-primary hover:bg-primary-soft group-open:rounded-b-none group-open:border-b group-open:border-border">
        Добавить сотрудника
      </summary>
      <form action={action} className="space-y-4 p-4">
        <label className="block">
          <span className="text-sm font-semibold">Имя и фамилия</span>
          <input name="fullName" required maxLength={100} className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Почта</span>
          <input name="email" type="email" required inputMode="email" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Роль</span>
          <select name="role" defaultValue="specialist" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3">
            <option value="specialist">Специалист — видит только своих детей</option>
            <option value="supervisor">Руководитель — видит всех детей и правит базу навыков</option>
          </select>
        </label>
        <p className="text-sm text-muted">Пароль сервис придумает сам и покажет один раз.</p>
        {state.error && (
          <p role="alert" className="rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
            {state.error}
          </p>
        )}
        {state.created && <Credentials {...state.created} />}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Заводим…" : "Завести доступ"}
        </button>
      </form>
    </details>
  );
}

function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetStaffPassword, { error: null });

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-bold">
            {member.fullName}
            {isSelf && <span className="ml-2 text-sm font-normal text-muted">это вы</span>}
          </p>
          <p className="truncate text-sm text-muted">{member.email}</p>
          <p className="text-sm text-muted">
            {ROLE_LABEL[member.role]}
            {member.lastSignInAt ? ` · последний вход ${dateTimeLabel(member.lastSignInAt)}` : " · ещё не входил"}
          </p>
        </div>
        {!member.active && <span className="shrink-0 rounded-full bg-border px-2.5 py-0.5 text-sm text-muted">Отключён</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="userId" value={member.id} />
          <input type="hidden" name="name" value={member.fullName} />
          <button type="submit" disabled={pending} className="h-12 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60">
            {pending ? "Меняем…" : "Сбросить пароль"}
          </button>
        </form>
        {!isSelf && (
          <form action={setStaffActive.bind(null, member.id, !member.active)}>
            <button type="submit" className="h-12 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
              {member.active ? "Отключить доступ" : "Включить доступ"}
            </button>
          </form>
        )}
      </div>

      {state.error && (
        <p role="alert" className="mt-2 rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
          {state.error}
        </p>
      )}
      {state.password && (
        <div className="mt-2">
          <Credentials name={state.name ?? member.fullName} email={member.email} password={state.password} />
        </div>
      )}
    </li>
  );
}

function NewAssistantForm() {
  const [state, action, pending] = useActionState<AssistantState, FormData>(addAssistant, { error: null });
  return (
    <form action={action} className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-4">
      <label className="min-w-40 flex-1">
        <span className="text-sm font-semibold">Имя феи</span>
        <input name="fullName" required maxLength={100} className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3" />
      </label>
      <button type="submit" disabled={pending} className="mt-6 h-12 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
        {pending ? "Добавляем…" : "Добавить"}
      </button>
      {state.error && (
        <p role="alert" className="w-full rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function StaffManager({
  staff,
  error,
  selfId,
  assistants,
}: {
  staff: StaffMember[];
  error?: string;
  selfId: string;
  assistants: { id: string; full_name: string; active: boolean }[];
}) {
  return (
    <>
      <h1 className="text-2xl font-bold">Сотрудники</h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-incorrect/10 p-4 text-sm text-incorrect">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-4">
            <NewStaffForm />
          </div>
          <ul className="mt-4 space-y-3">
            {staff.map((m) => (
              <StaffRow key={m.id} member={m} isSelf={m.id === selfId} />
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 text-lg font-bold">Феи (ассистенты)</h2>
      <p className="text-sm text-muted">В сервис не входят. Специалист выбирает фею в начале занятия.</p>
      <div className="mt-3">
        <NewAssistantForm />
      </div>
      {assistants.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface p-4 text-center text-muted">Фей пока нет.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assistants.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-2">
              <span className={a.active ? "" : "text-muted line-through"}>{a.full_name}</span>
              <form action={setAssistantActive.bind(null, a.id, !a.active)}>
                <button type="submit" className="h-12 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
                  {a.active ? "Скрыть" : "Вернуть"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
