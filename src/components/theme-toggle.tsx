"use client";

import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";

const LABEL: Record<Theme, string> = { system: "Как в системе", light: "Светлая", dark: "Тёмная" };
const ICON: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };
const ORDER: Theme[] = ["system", "light", "dark"];
const EVENT = "aba-theme-change";

// Ставится в <head> до отрисовки страницы, чтобы ночью не мигнуло белым.
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})()`;

// Источник правды — атрибут на странице: его же ставит скрипт выше.
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
const currentTheme = (): Theme => (document.documentElement.dataset.theme as Theme) ?? "system";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "system" as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  function change(value: Theme) {
    if (value === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
    try {
      if (value === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", value);
    } catch {
      // приватный режим: тема продержится до перезагрузки
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={() => change(next)}
      title={`Тема: ${LABEL[theme]}. Нажмите, чтобы выбрать «${LABEL[next]}»`}
      aria-label={`Тема оформления: ${LABEL[theme]}. Переключить на «${LABEL[next]}»`}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border text-lg hover:bg-primary-soft"
    >
      <span aria-hidden>{ICON[theme]}</span>
    </button>
  );
}
