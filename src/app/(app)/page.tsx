import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { ageLabel, fullName, METHOD_LABEL, shortDateLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Дети · АВА-занятия" };

export default async function ChildrenPage({ searchParams }: PageProps<"/">) {
  const { q } = await searchParams;
  // Убираем символы, которыми можно испортить фильтр поиска.
  const query = (typeof q === "string" ? q : "").replace(/[,()%*\\]/g, " ").trim().slice(0, 50);
  const staff = await getStaff();
  const isSupervisor = staff?.role === "supervisor";

  const supabase = await createClient();
  // RLS сама отдаёт специалисту только его детей, руководителю — всех.
  const [{ data: children, error }, { data: lessons }] = await Promise.all([
    (query
      ? supabase
          .from("children")
          .select(
            "id, last_name, first_name, patronymic, birth_date, methods, specialist:profiles!children_specialist_id_fkey(full_name)",
          )
          .or(`last_name.ilike.%${query}%,first_name.ilike.%${query}%`)
      : supabase
          .from("children")
          .select(
            "id, last_name, first_name, patronymic, birth_date, methods, specialist:profiles!children_specialist_id_fkey(full_name)",
          )
    )
      .order("last_name")
      .order("first_name"),
    supabase.from("lessons").select("child_id, started_at").order("started_at", { ascending: false }).limit(500),
  ]);

  const lastLesson = new Map<string, string>();
  for (const l of lessons ?? []) if (!lastLesson.has(l.child_id)) lastLesson.set(l.child_id, l.started_at);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Дети</h1>
        {isSupervisor && (
          <Link
            href="/children/new"
            className="flex h-12 items-center rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-hover"
          >
            Добавить ребёнка
          </Link>
        )}
      </div>

      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Найти ребёнка"
          aria-label="Найти ребёнка"
          className="h-12 flex-1 rounded-xl border border-border bg-surface px-4 placeholder:text-muted"
        />
        <button type="submit" className="h-12 rounded-xl border border-border px-4 font-semibold hover:bg-primary-soft">
          Найти
        </button>
      </form>

      {error ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
          <p>Не удалось загрузить список. Обновите страницу.</p>
          <Link
            href="/"
            className="mt-4 inline-flex h-12 items-center rounded-xl bg-primary px-5 font-semibold text-white hover:bg-primary-hover"
          >
            Обновить
          </Link>
        </div>
      ) : children.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-muted">
          {query
            ? `Никого не нашли по запросу «${query}».`
            : isSupervisor
              ? "Детей пока нет. Добавьте первого ребёнка, чтобы составить программу."
              : "У вас пока нет детей. Руководитель назначит их вам."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {children.map((child) => (
            <li
              key={child.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <Link href={`/children/${child.id}`} className="font-heading text-lg font-bold hover:text-primary">
                {fullName(child)}
              </Link>
              <p className="text-muted">{ageLabel(child.birth_date)}</p>
              {child.methods.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {child.methods.map((m) => (
                    <li
                      key={m}
                      className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm text-primary"
                    >
                      {METHOD_LABEL[m] ?? m}
                    </li>
                  ))}
                </ul>
              )}
              {isSupervisor && (
                <p className="mt-2 text-sm text-muted">
                  Специалист: {child.specialist?.full_name ?? "не назначен"}
                </p>
              )}
              <p className="mt-1 text-sm text-muted">
                {lastLesson.has(child.id)
                  ? `Последнее занятие: ${shortDateLabel(lastLesson.get(child.id)!)}`
                  : "Занятий ещё не было"}
              </p>
              <Link
                href={`/children/${child.id}`}
                className="mt-3 inline-flex h-12 items-center text-sm font-semibold text-primary"
              >
                Программа и прогресс →
              </Link>
              <Link
                href={`/children/${child.id}/lesson`}
                className="mt-1 flex h-12 items-center justify-center rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover"
              >
                Начать занятие
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
