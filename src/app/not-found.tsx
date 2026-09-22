import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="font-heading text-xl font-bold">Страница не найдена</h1>
        <p className="mt-2 text-muted">Возможно, ребёнка удалили или ссылка устарела.</p>
        <Link
          href="/"
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-primary font-semibold text-on-primary hover:bg-primary-hover"
        >
          К списку детей
        </Link>
      </div>
    </main>
  );
}
