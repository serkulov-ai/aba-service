"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center">
      <h1 className="font-heading text-xl font-bold">Что-то пошло не так</h1>
      <p className="mt-2 text-muted">
        Страница не открылась. Попробуйте ещё раз — отмеченные пробы при этом не теряются.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover"
      >
        Попробовать снова
      </button>
    </div>
  );
}
