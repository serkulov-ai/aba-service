import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressChart } from "@/components/progress-chart";
import {
  ageLabel,
  dateLabel,
  dateTimeLabel,
  fullName,
  METHOD_LABEL,
  TARGET_STATUS_LABEL,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { ChildForm } from "../child-form";
import { addSuggestedTarget, setTargetStatus } from "./actions";
import { AddTargetForm } from "./add-target-form";

export const metadata: Metadata = { title: "Карточка ребёнка · АВА-занятия" };

const TABS = [
  { key: "program", label: "Программа" },
  { key: "history", label: "История" },
  { key: "data", label: "Данные" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const SIGN: Record<string, string> = { S: "С", P: "+", M: "−" };

const STATUS_STYLE: Record<string, string> = {
  in_progress: "bg-primary-soft text-primary",
  mastered: "bg-independent/10 text-independent",
  paused: "bg-border text-muted",
};

export default async function ChildPage({ params, searchParams }: PageProps<"/children/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "program";

  const staff = await getStaff();
  if (!staff) notFound();
  const supabase = await createClient();

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, last_name, first_name, patronymic, birth_date, methods, specialist_id, specialist:profiles!children_specialist_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (childError) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center">
        Не удалось загрузить данные ребёнка. Обновите страницу.
      </p>
    );
  }
  if (!child) notFound();

  const isSupervisor = staff.role === "supervisor";
  const [{ data: targets }, { data: sessions }, { data: lessons }, { data: skills }, { data: specialists }] = await Promise.all([
    supabase
      .from("child_targets")
      .select("id, name, notes, status, current_delay, uses_rotation, skill_id, position")
      .eq("child_id", id)
      .order("position"),
    supabase
      .from("target_sessions")
      .select("id, lesson_id, target_id, delay, trials, correct_pct, independent_pct, recorded_at, target:child_targets!inner(child_id)")
      .eq("target.child_id", id)
      .order("recorded_at")
      .limit(2000),
    supabase
      .from("lessons")
      .select(
        "id, started_at, parent_present, skills_note, behavior_note, general_note, homework, ai_recommendations, parent_report, specialist:profiles!lessons_specialist_id_fkey(full_name), assistant:assistants(full_name)",
      )
      .eq("child_id", id)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("skills")
      .select("id, name, position, domain_id, domain:skill_domains(name, position)")
      .order("position"),
    isSupervisor
      ? supabase.from("profiles").select("id, full_name, role").order("full_name")
      : Promise.resolve({ data: [] }),
  ]);

  const allTargets = targets ?? [];
  const allSessions = sessions ?? [];
  const allSkills = (skills ?? []).sort(
    (a, b) => (a.domain?.position ?? 0) - (b.domain?.position ?? 0) || a.position - b.position,
  );
  const skillById = new Map(allSkills.map((s) => [s.id, s]));
  const targetName = new Map(allTargets.map((t) => [t.id, t.name]));

  return (
    <>
      <Link href="/" className="text-sm font-semibold text-primary">
        ← Дети
      </Link>
      <header className="mt-2">
        <h1 className="text-2xl font-bold">{fullName(child)}</h1>
        <p className="text-muted">{ageLabel(child.birth_date)}</p>
        {child.methods.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {child.methods.map((m) => (
              <li key={m} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm text-primary">
                {METHOD_LABEL[m] ?? m}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-muted">Специалист: {child.specialist?.full_name ?? "не назначен"}</p>
        <Link
          href={`/children/${child.id}/lesson`}
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover"
        >
          Начать занятие
        </Link>
      </header>

      <nav className="mt-6 flex gap-1 rounded-xl bg-border/60 p-1" aria-label="Разделы карточки">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/children/${child.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold ${
              tab === t.key ? "bg-surface text-primary shadow-sm" : "text-foreground hover:bg-surface/60"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "program" && (
          <ProgramTab
            childId={child.id}
            added={sp.added === "1"}
            openForm={sp.add === "1"}
            targets={allTargets}
            sessions={allSessions}
            skills={allSkills}
            skillById={skillById}
          />
        )}
        {tab === "history" && <HistoryTab lessons={lessons ?? []} sessions={allSessions} targetName={targetName} />}
        {tab === "data" && isSupervisor && (
          <ChildForm
            child={{
              id: child.id,
              last_name: child.last_name,
              first_name: child.first_name,
              patronymic: child.patronymic,
              birth_date: child.birth_date,
              methods: child.methods,
              specialist_id: child.specialist_id,
            }}
            specialists={specialists ?? []}
          />
        )}
        {tab === "data" && !isSupervisor && (
          <dl className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            {[
              ["ФИО", fullName(child)],
              ["Дата рождения", `${dateLabel(child.birth_date)} (${ageLabel(child.birth_date)})`],
              ["Методики", child.methods.map((m) => METHOD_LABEL[m] ?? m).join(", ") || "не указаны"],
              ["Специалист", child.specialist?.full_name ?? "не назначен"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </>
  );
}

type Target = {
  id: string;
  name: string;
  notes: string;
  status: string;
  current_delay: number;
  uses_rotation: boolean;
  skill_id: string | null;
};
type Session = {
  id: string;
  lesson_id: string;
  target_id: string;
  delay: number;
  trials: string[];
  correct_pct: number;
  independent_pct: number;
};
type Skill = {
  id: string;
  name: string;
  position: number;
  domain_id: string;
  domain: { name: string; position: number } | null;
};

function ProgramTab({
  childId,
  added,
  openForm,
  targets,
  sessions,
  skills,
  skillById,
}: {
  childId: string;
  added: boolean;
  openForm: boolean;
  targets: Target[];
  sessions: Session[];
  skills: Skill[];
  skillById: Map<string, Skill>;
}) {
  const inProgram = new Set(targets.map((t) => t.skill_id));

  // Освоенная цель → следующий навык того же раздела по порядку центра, которого ещё нет в программе.
  const suggestions: { target: Target; next: Skill }[] = [];
  for (const t of targets) {
    if (t.status !== "mastered" || !t.skill_id) continue;
    const skill = skillById.get(t.skill_id);
    if (!skill) continue;
    const next = skills.find(
      (s) => s.domain_id === skill.domain_id && s.position > skill.position && !inProgram.has(s.id),
    );
    if (next && !suggestions.some((x) => x.next.id === next.id)) suggestions.push({ target: t, next });
  }

  const groups = new Map<string, Target[]>();
  const order = (t: Target) => {
    const s = t.skill_id ? skillById.get(t.skill_id) : undefined;
    return s?.domain?.position ?? 999;
  };
  for (const t of [...targets].sort((a, b) => order(a) - order(b))) {
    const domain = (t.skill_id && skillById.get(t.skill_id)?.domain?.name) || "Без раздела";
    groups.set(domain, [...(groups.get(domain) ?? []), t]);
  }

  return (
    <div className="space-y-4">
      {added && (
        <p role="status" className="rounded-xl bg-independent/10 px-4 py-3 text-sm font-semibold text-independent">
          Навык добавлен в программу.
        </p>
      )}

      {suggestions.map(({ target, next }) => (
        <section key={next.id} className="rounded-2xl border-2 border-primary bg-primary-soft p-4">
          <p className="font-semibold">
            Цель «{target.name}» освоена. Предлагаем следующую: «{next.name}».
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={`/children/${childId}?tab=program&add=1`}
              className="flex h-12 items-center justify-center rounded-xl border border-border bg-surface font-semibold hover:bg-background"
            >
              Выбрать другую
            </Link>
            <form action={addSuggestedTarget.bind(null, childId, next.id)}>
              <button type="submit" className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover">
                Добавить в программу
              </button>
            </form>
          </div>
        </section>
      ))}

      {targets.length === 0 && (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-muted">
          Программа ещё не составлена. Добавьте первый навык из базы.
        </p>
      )}

      <AddTargetForm
        childId={childId}
        open={openForm || targets.length === 0}
        skills={skills.map((s) => ({
          id: s.id,
          name: s.name,
          domain: s.domain?.name ?? "Без раздела",
          inProgram: inProgram.has(s.id),
        }))}
      />

      {[...groups].map(([domain, list]) => (
        <section key={domain}>
          <h2 className="text-lg font-bold">{domain}</h2>
          <ul className="mt-2 space-y-3">
            {list.map((t) => {
              const own = sessions.filter((s) => s.target_id === t.id);
              const last = own.slice(-10);
              const skill = t.skill_id ? skillById.get(t.skill_id) : undefined;
              return (
                <li key={t.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {skill && <p className="text-sm text-muted">{skill.name}</p>}
                      <p className="font-heading text-lg font-bold">{t.name}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_STYLE[t.status]}`}>
                      {TARGET_STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">
                    Задержка: {t.current_delay} сек{t.uses_rotation && " · ротация А, Б, В"} · сессий: {own.length}
                  </p>
                  {t.notes && <p className="mt-1 text-sm text-muted">{t.notes}</p>}

                  {last.length >= 2 ? (
                    <ProgressChart
                      points={last.map((s) => ({ correctPct: s.correct_pct, independentPct: s.independent_pct, delay: s.delay }))}
                    />
                  ) : last.length === 1 ? (
                    <p className="mt-2 text-sm text-muted">
                      Одна сессия: правильных {last[0].correct_pct}% · самостоятельных {last[0].independent_pct}%
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Сессий пока не было.</p>
                  )}

                  <form
                    action={setTargetStatus.bind(null, childId, t.id, t.status === "in_progress" ? "paused" : "in_progress")}
                    className="mt-3"
                  >
                    <button type="submit" className="h-12 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
                      {t.status === "in_progress" ? "Отложить" : "Вернуть в работу"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

type Lesson = {
  id: string;
  started_at: string;
  parent_present: boolean;
  skills_note: string;
  behavior_note: string;
  general_note: string;
  homework: string;
  ai_recommendations: string;
  parent_report: string;
  specialist: { full_name: string } | null;
  assistant: { full_name: string } | null;
};

function HistoryTab({
  lessons,
  sessions,
  targetName,
}: {
  lessons: Lesson[];
  sessions: Session[];
  targetName: Map<string, string>;
}) {
  if (lessons.length === 0) {
    return <p className="rounded-2xl border border-border bg-surface p-6 text-center text-muted">Занятий пока не было.</p>;
  }

  return (
    <ul className="space-y-3">
      {lessons.map((l) => {
        const own = sessions.filter((s) => s.lesson_id === l.id);
        const byTarget = new Map<string, Session[]>();
        for (const s of own) byTarget.set(s.target_id, [...(byTarget.get(s.target_id) ?? []), s]);
        const notes = [
          ["По навыкам", l.skills_note],
          ["По поведению", l.behavior_note],
          ["Общий комментарий", l.general_note],
          ["Домашнее задание", l.homework],
        ].filter(([, v]) => v.trim());

        return (
          <li key={l.id} className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-heading font-bold">{dateTimeLabel(l.started_at)}</p>
            <p className="text-sm text-muted">
              {l.specialist?.full_name ?? "—"}
              {l.assistant && ` · фея: ${l.assistant.full_name}`}
              {l.parent_present && " · родитель на занятии"}
            </p>

            {byTarget.size === 0 ? (
              <p className="mt-2 text-sm text-muted">Пробы не отмечались.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {[...byTarget].map(([targetId, list]) => (
                  <li key={targetId}>
                    <span className="font-semibold">{targetName.get(targetId) ?? "Цель"}:</span>{" "}
                    {list.map((s) => `${s.correct_pct}% / ${s.independent_pct}% (${s.delay} сек)`).join(", ")}
                  </li>
                ))}
              </ul>
            )}

            {notes.length > 0 && (
              <dl className="mt-3 space-y-1 text-sm">
                {notes.map(([k, v]) => (
                  <div key={k}>
                    <dt className="inline font-semibold">{k}: </dt>
                    <dd className="inline">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {l.parent_report.trim() && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Отчёт для родителей</summary>
                <p className="mt-2 whitespace-pre-line text-sm">{l.parent_report}</p>
              </details>
            )}
            {l.ai_recommendations.trim() && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Рекомендации специалисту</summary>
                <p className="mt-2 whitespace-pre-line text-sm">{l.ai_recommendations}</p>
              </details>
            )}
            {own.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Все пробы</summary>
                <ul className="mt-2 space-y-1 text-sm">
                  {own.map((s) => (
                    <li key={s.id}>
                      {targetName.get(s.target_id) ?? "Цель"}: {s.trials.map((x) => SIGN[x] ?? x).join(" ")}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
