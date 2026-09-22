"use client";

import { useState, type ReactNode } from "react";

// Данные всех трёх вкладок приходят с сервера сразу, поэтому переключение
// делаем на месте: без перезагрузки страницы и без ожидания сервера.
const TABS = [
  { key: "program", label: "Программа" },
  { key: "history", label: "История" },
  { key: "data", label: "Данные" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function ChildTabs({
  initial,
  program,
  history,
  data,
}: {
  initial: TabKey;
  program: ReactNode;
  history: ReactNode;
  data: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>(initial);
  const panels: Record<TabKey, ReactNode> = { program, history, data };

  return (
    <>
      <nav className="mt-6 flex gap-1 rounded-xl bg-border/60 p-1" aria-label="Разделы карточки">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold ${
              tab === t.key ? "bg-surface text-primary shadow-sm" : "text-foreground hover:bg-surface/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="mt-4">{panels[tab]}</div>
    </>
  );
}
