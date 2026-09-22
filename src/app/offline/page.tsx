import type { Metadata } from "next";

export const metadata: Metadata = { title: "Нет интернета · АВА-занятия" };

// Этот экран показывается, когда приложение открыли без связи.
// Данных детей здесь нет — страница одинакова для всех.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="font-heading text-xl font-bold">Нет интернета</h1>
        <p className="mt-2 text-muted">
          Сервис откроется, когда появится связь. Отметки, сделанные на занятии, сохранены
          на телефоне и отправятся сами.
        </p>
      </div>
    </main>
  );
}
