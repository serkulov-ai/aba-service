"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };
const OFFLINE = "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  const [offline, setOffline] = useState(false);

  const error = offline ? OFFLINE : state.error;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const isOffline = !navigator.onLine;
        setOffline(isOffline);
        if (isOffline) e.preventDefault();
      }}
      className="mt-8 space-y-4"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Почта</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          className="h-12 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Пароль</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-primary font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
