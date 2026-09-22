"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enqueue } from "@/lib/offline/outbox";
import { DRAFTS, get, put, remove } from "@/lib/offline/store";
import {
  rotationStep,
  rotationTableFor,
  scoreSession,
  suggest,
  TRIALS_PER_SESSION,
  type Delay,
  type Suggestion,
  type Trial,
} from "@/lib/rules";
import { uuid } from "@/lib/uuid";
import {
  ConfirmDialog,
  DelayPicker,
  MarkButtons,
  RotationCard,
  SyncBanner,
  TrialDots,
  TrialRow,
} from "./lesson-parts";
import { EMPTY_REPORT, LessonSummary, reportPatch, type Report } from "./lesson-summary";

export type LessonTarget = {
  id: string;
  name: string;
  notes: string;
  usesRotation: boolean; // стимулы А, Б, В по таблицам ротации
  currentDelay: Delay;
  skillName: string | null;
  domainName: string | null;
  instruction: string;
  materials: string;
  curatorComment: string;
};

export type PastSession = {
  id: string;
  targetId: string;
  delay: Delay;
  correctPct: number;
  independentPct: number;
};

type DoneSession = PastSession & {
  trials: Trial[];
  suggestion: Suggestion | null;
  decision: "accepted" | "declined" | null;
};

type Draft = {
  lessonId: string;
  assistantId: string | null;
  parentPresent: boolean;
  step: "pick" | "session" | "result" | "finished";
  targetId: string | null;
  trials: Trial[];
  editing: number | null;
  partial: Record<string, Trial[]>; // незаконченные сессии по целям
  delays: Record<string, Delay>;
  mastered: string[];
  done: DoneSession[];
  report?: Report; // заметки и отчёт на экране итога
  finishedAt?: string;
};

type Props = {
  child: { id: string; name: string; age: string };
  staffName: string;
  targets: LessonTarget[];
  history: PastSession[];
  assistants: { id: string; full_name: string }[];
};

const now = () => new Date().toISOString();

export function LessonRunner({ child, staffName, targets, history, assistants }: Props) {
  const router = useRouter();
  const draftKey = `lesson:${child.id}`;

  const [loaded, setLoaded] = useState(false);
  const [draft, setDraftState] = useState<Draft | null>(null);
  const [confirmExit, setConfirmExit] = useState<null | "pick" | "list">(null);

  // Незаконченное занятие этого ребёнка продолжается с того же места.
  // Завершённое держим до ухода с экрана итога, но не дольше 6 часов.
  useEffect(() => {
    get<Draft>(DRAFTS, draftKey).then((saved) => {
      const stale =
        saved?.step === "finished" &&
        Date.now() - new Date(saved.finishedAt ?? 0).getTime() > 6 * 60 * 60 * 1000;
      if (saved && !stale) setDraftState(saved);
      else if (saved) void remove(DRAFTS, draftKey);
      setLoaded(true);
    });
  }, [draftKey]);

  function save(next: Draft) {
    setDraftState(next);
    void put(DRAFTS, draftKey, next);
  }

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-2xl bg-border/60" aria-busy="true" />;
  }

  if (!draft) {
    return (
      <Setup
        child={child}
        staffName={staffName}
        assistants={assistants}
        hasTargets={targets.length > 0}
        onStart={(assistantId, parentPresent) => {
          const lessonId = uuid();
          void enqueue({
            type: "lesson.start",
            row: {
              id: lessonId,
              child_id: child.id,
              assistant_id: assistantId,
              parent_present: parentPresent,
              started_at: now(),
            },
          });
          save({
            lessonId,
            assistantId,
            parentPresent,
            step: "pick",
            targetId: null,
            trials: [],
            editing: null,
            partial: {},
            delays: Object.fromEntries(targets.map((t) => [t.id, t.currentDelay])),
            mastered: [],
            done: [],
          });
        }}
      />
    );
  }

  const d = draft;
  const target = targets.find((t) => t.id === d.targetId) ?? null;
  // Цель из черновика могли убрать из программы — тогда возвращаемся к выбору.
  const step = (d.step === "session" || d.step === "result") && !target ? "pick" : d.step;

  // Все сессии цели по времени: из базы и из этого занятия, без повторов.
  function targetHistory(targetId: string): PastSession[] {
    const local = d.done.filter((s) => s.targetId === targetId);
    const localIds = new Set(local.map((s) => s.id));
    return [...history.filter((s) => s.targetId === targetId && !localIds.has(s.id)), ...local];
  }

  function changeDelay(targetId: string, to: Delay, followedSuggestion: boolean) {
    const from = d.delays[targetId];
    void enqueue(
      { type: "target.update", id: targetId, patch: { current_delay: to } },
      {
        type: "event.add",
        row: {
          id: uuid(),
          target_id: targetId,
          lesson_id: d.lessonId,
          kind: "delay_changed",
          from_delay: from,
          to_delay: to,
          followed_suggestion: followedSuggestion,
        },
      },
    );
    return { ...d.delays, [targetId]: to };
  }

  function openTarget(targetId: string) {
    save({ ...d, step: "session", targetId, trials: d.partial[targetId] ?? [], editing: null });
  }

  function leaveSession(to: "pick" | "list") {
    const partial = { ...d.partial };
    if (d.targetId) {
      if (d.trials.length > 0) partial[d.targetId] = d.trials;
      else delete partial[d.targetId];
    }
    if (to === "pick") {
      save({ ...d, step: "pick", targetId: null, trials: [], editing: null, partial });
    } else {
      // Остаёмся на этой же сессии: вернувшись, специалист продолжит с того же места.
      void put(DRAFTS, draftKey, { ...d, partial });
      router.push("/");
    }
  }

  function requestLeave(to: "pick" | "list") {
    if (step === "finished") {
      leaveSummary();
    } else if (step === "session" && d.trials.length > 0 && d.trials.length < TRIALS_PER_SESSION) {
      setConfirmExit(to);
    } else if (to === "pick") {
      leaveSession("pick");
    } else {
      router.push("/");
    }
  }

  function finishLesson() {
    const finishedAt = now();
    void enqueue({ type: "lesson.update", id: d.lessonId, patch: { status: "finished", finished_at: finishedAt } });
    save({ ...d, step: "finished", targetId: null, trials: [], editing: null, finishedAt });
  }

  // С экрана итога уходим только с сохранением заметок и отчёта.
  function leaveSummary() {
    if (d.report) void enqueue({ type: "lesson.update", id: d.lessonId, patch: reportPatch(d.report) });
    void remove(DRAFTS, draftKey);
    router.push("/");
  }

  // -------------------------------------------------------------------------

  const header = (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => requestLeave("list")}
        className="text-sm font-semibold text-primary"
      >
        ← К списку детей
      </button>
      <p className="mt-1 font-heading text-xl font-bold">{child.name}</p>
      <p className="text-sm text-muted">
        {child.age} · {staffName}
        {d.assistantId && ` · фея: ${assistants.find((a) => a.id === d.assistantId)?.full_name ?? "—"}`}
        {d.parentPresent && " · родитель на занятии"}
      </p>
    </div>
  );

  const exitDialog = confirmExit && (
    <ConfirmDialog
      text={`Сессия не закончена (отмечено ${d.trials.length} из ${TRIALS_PER_SESSION}). Выйти? Отметки сохранятся как черновик.`}
      confirmLabel="Выйти"
      cancelLabel="Остаться"
      onCancel={() => setConfirmExit(null)}
      onConfirm={() => {
        const to = confirmExit;
        setConfirmExit(null);
        leaveSession(to);
      }}
    />
  );

  // --- Выбор цели ----------------------------------------------------------
  if (step === "pick") {
    const active = targets.filter((t) => !d.mastered.includes(t.id));
    return (
      <>
        <SyncBanner />
        {header}
        <h1 className="text-2xl font-bold">Выберите цель</h1>
        <ul className="mt-4 space-y-3">
          {active.map((t) => {
            const today = d.done.filter((s) => s.targetId === t.id);
            const draftCount = d.partial[t.id]?.length ?? 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openTarget(t.id)}
                  className="w-full rounded-2xl border border-border bg-surface p-4 text-left hover:border-primary"
                >
                  <p className="text-sm text-muted">
                    {[t.domainName, t.skillName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="font-heading text-lg font-bold">{t.name}</p>
                  <p className="mt-1 text-sm">
                    Задержка: {d.delays[t.id]} сек
                    {today.length > 0 &&
                      ` · сегодня: ${today.map((s) => `${s.correctPct}%`).join(", ")}`}
                    {draftCount > 0 && ` · черновик: ${draftCount} из ${TRIALS_PER_SESSION}`}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
        {active.length === 0 && (
          <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-center text-muted">
            Все цели на этом занятии отмечены освоенными.
          </p>
        )}
        <button
          type="button"
          onClick={finishLesson}
          className="mt-6 h-12 w-full rounded-xl border border-border font-semibold hover:bg-primary-soft"
        >
          Завершить занятие
        </button>
      </>
    );
  }

  // --- Сессия: 9 проб ------------------------------------------------------
  if (step === "session" && target) {
    const delay = d.delays[target.id];
    const current = d.editing ?? d.trials.length;
    const past = targetHistory(target.id);
    const rotationTable = target.usesRotation ? rotationTableFor(past.length) : null;

    const mark = (t: Trial) => {
      if (d.editing !== null) {
        const trials = [...d.trials];
        trials[d.editing] = t;
        save({ ...d, trials, editing: null });
        return;
      }
      const trials = [...d.trials, t];
      if (trials.length < TRIALS_PER_SESSION) {
        save({ ...d, trials });
        return;
      }

      // 9-я проба — сессия закончена.
      const { correctPct, independentPct } = scoreSession(trials);
      const session: DoneSession = {
        id: uuid(),
        targetId: target.id,
        delay,
        correctPct,
        independentPct,
        trials,
        suggestion: null,
        decision: null,
      };
      session.suggestion = suggest([...past, session], delay);

      void enqueue({
        type: "session.add",
        row: {
          id: session.id,
          lesson_id: d.lessonId,
          target_id: target.id,
          delay,
          trials,
          correct_pct: correctPct,
          independent_pct: independentPct,
          rotation_table: rotationTable,
          recorded_at: now(),
        },
      });

      const partial = { ...d.partial };
      delete partial[target.id];
      save({ ...d, step: "result", trials: [], editing: null, partial, done: [...d.done, session] });
    };

    const undo = () => {
      if (d.editing !== null) save({ ...d, editing: null });
      else if (d.trials.length > 0) save({ ...d, trials: d.trials.slice(0, -1) });
    };

    return (
      <>
        <SyncBanner />
        {exitDialog}
        <div className="pb-60 md:grid md:grid-cols-2 md:gap-6 md:pb-0">
          <div className="space-y-4">
            <div>
              {/* На время проб шапка короткая: всё место — под раскладку и отметки. */}
              <div className="flex items-baseline justify-between gap-3">
                <button
                  type="button"
                  onClick={() => requestLeave("pick")}
                  className="text-sm font-semibold text-primary"
                >
                  ← К целям
                </button>
                <span className="truncate text-sm text-muted">{child.name}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {[target.domainName, target.skillName].filter(Boolean).join(" · ")}
              </p>
              <h1 className="text-2xl font-bold">{target.name}</h1>
            </div>

            <details className="rounded-2xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-primary">Инструкция</summary>
              <div className="mt-3 space-y-2 text-sm">
                {target.instruction ? <p>{target.instruction}</p> : <p className="text-muted">Инструкции в базе пока нет.</p>}
                {target.materials && <p><span className="font-semibold">Материалы:</span> {target.materials}</p>}
                {target.notes && <p><span className="font-semibold">Примечания к цели:</span> {target.notes}</p>}
                {target.curatorComment && (
                  <p className="rounded-xl bg-primary-soft p-3">
                    <span className="font-semibold">Комментарий куратора:</span> {target.curatorComment}
                  </p>
                )}
              </div>
            </details>

            <DelayPicker
              value={delay}
              onChange={(to) => save({ ...d, delays: changeDelay(target.id, to, false) })}
            />

            {rotationTable && (
              <RotationCard
                step={rotationStep(rotationTable, current)}
                trialNumber={current + 1}
                table={rotationTable}
              />
            )}
          </div>

          {/* Телефон: ход сессии и кнопки прижаты к низу экрана, под большой палец. */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto max-w-3xl space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {d.editing !== null ? `Исправляем пробу ${d.editing + 1}` : `Проба ${current + 1} из ${TRIALS_PER_SESSION}`}
                </p>
                <button
                  type="button"
                  onClick={undo}
                  disabled={d.trials.length === 0 && d.editing === null}
                  className="h-12 rounded-xl px-3 text-sm font-semibold text-primary disabled:text-muted"
                >
                  {d.editing !== null ? "Отменить исправление" : "Отменить последнюю"}
                </button>
              </div>
              <TrialDots
                trials={d.trials}
                current={current}
                onSelect={(i) => save({ ...d, editing: d.editing === i ? null : i })}
              />
              <MarkButtons onMark={mark} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- Итог сессии ---------------------------------------------------------
  if (step === "result" && target) {
    const last = d.done[d.done.length - 1];
    const s = last.suggestion;
    const delay = d.delays[target.id];
    const isMastered = d.mastered.includes(target.id);

    const decide = (accepted: boolean) => {
      const done = d.done.map((x) => (x.id === last.id ? { ...x, decision: accepted ? ("accepted" as const) : ("declined" as const) } : x));
      if (!accepted || !s) {
        save({ ...d, done });
        return;
      }
      if (s.kind === "mastered") {
        void enqueue(
          { type: "target.update", id: target.id, patch: { status: "mastered", mastered_at: now() } },
          {
            type: "event.add",
            row: { id: uuid(), target_id: target.id, lesson_id: d.lessonId, kind: "mastered", followed_suggestion: true },
          },
        );
        save({ ...d, done, mastered: [...d.mastered, target.id] });
      } else {
        save({ ...d, done, delays: changeDelay(target.id, s.to, true) });
      }
    };

    return (
      <>
        <SyncBanner />
        {header}
        <p className="text-sm text-muted">{[target.domainName, target.skillName].filter(Boolean).join(" · ")}</p>
        <h1 className="text-2xl font-bold">{target.name}</h1>

        <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted">Правильных</p>
              <p className="text-[28px] font-bold">{last.correctPct}%</p>
            </div>
            <div>
              <p className="text-sm text-muted">Самостоятельных</p>
              <p className="text-[28px] font-bold">{last.independentPct}%</p>
            </div>
          </div>
          <div className="mt-3">
            <TrialRow trials={last.trials} />
          </div>
          <p className="mt-2 text-sm text-muted">Задержка на этой сессии: {last.delay} сек</p>
        </section>

        {s && last.decision === null && (
          <SuggestionBox suggestion={s} delay={last.delay} onAccept={() => decide(true)} onDecline={() => decide(false)} />
        )}
        {s && last.decision === "accepted" && (
          <p className="mt-4 rounded-2xl bg-independent/10 p-4 font-semibold text-independent-ink">
            {s.kind === "mastered" ? "Цель отмечена освоенной." : `Задержка изменена: ${s.to} сек.`}
          </p>
        )}

        <div className="mt-6 grid gap-2">
          {!isMastered && (
            <button
              type="button"
              onClick={() => openTarget(target.id)}
              className="h-12 rounded-xl bg-primary font-semibold text-on-primary hover:bg-primary-hover"
            >
              Ещё круг по этой цели ({delay} сек)
            </button>
          )}
          <button
            type="button"
            onClick={() => save({ ...d, step: "pick", targetId: null })}
            className={`h-12 rounded-xl font-semibold ${
              isMastered ? "bg-primary text-white hover:bg-primary-hover" : "border border-border hover:bg-primary-soft"
            }`}
          >
            Следующая цель
          </button>
          <button
            type="button"
            onClick={finishLesson}
            className="h-12 rounded-xl border border-border font-semibold hover:bg-primary-soft"
          >
            Завершить занятие
          </button>
        </div>
      </>
    );
  }

  // --- Итог занятия ---------------------------------------------------------
  const summary = targets
    .map((t) => ({
      id: t.id,
      name: t.name,
      sessions: d.done.filter((s) => s.targetId === t.id),
      fromDelay: t.currentDelay,
      toDelay: d.delays[t.id],
      mastered: d.mastered.includes(t.id),
    }))
    .filter((x) => x.sessions.length > 0);

  return (
    <>
      <SyncBanner />
      {header}
      <LessonSummary
        lessonId={d.lessonId}
        targets={summary}
        report={d.report ?? EMPTY_REPORT}
        onReport={(report) => save({ ...d, report })}
        onLeave={leaveSummary}
      />
    </>
  );
}

function SuggestionBox({
  suggestion,
  delay,
  onAccept,
  onDecline,
}: {
  suggestion: Suggestion;
  delay: Delay;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const text =
    suggestion.kind === "mastered"
      ? "2 сессии подряд 100% самостоятельно. Цель освоена!"
      : suggestion.kind === "increase"
        ? delay === 0
          ? `3 сессии подряд 100% правильных. Советуем перейти на ${suggestion.to} сек.`
          : `3 сессии подряд ≥ 90%. Советуем перейти на ${suggestion.to} сек.`
        : `2 сессии подряд меньше 90%. Советуем вернуться на ${suggestion.to} сек.`;

  const [accept, decline] =
    suggestion.kind === "mastered"
      ? ["Отметить освоенной", "Продолжить работу"]
      : suggestion.kind === "increase"
        ? ["Принять", `Оставить ${delay} сек`]
        : ["Принять", "Оставить"];

  return (
    <section className="mt-4 rounded-2xl border-2 border-primary bg-primary-soft p-4">
      <p className="font-semibold">{text}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDecline}
          className="h-12 rounded-xl border border-border bg-surface font-semibold hover:bg-background"
        >
          {decline}
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="h-12 rounded-xl bg-primary font-semibold text-on-primary hover:bg-primary-hover"
        >
          {accept}
        </button>
      </div>
    </section>
  );
}

function Setup({
  child,
  staffName,
  assistants,
  hasTargets,
  onStart,
}: {
  child: Props["child"];
  staffName: string;
  assistants: Props["assistants"];
  hasTargets: boolean;
  onStart: (assistantId: string | null, parentPresent: boolean) => void;
}) {
  const [assistantId, setAssistantId] = useState("");
  const [parentPresent, setParentPresent] = useState(false);

  return (
    <>
      <SyncBanner />
      <Link href="/" className="text-sm font-semibold text-primary">
        ← К списку детей
      </Link>
      <p className="mt-1 font-heading text-xl font-bold">{child.name}</p>
      <p className="text-sm text-muted">{child.age}</p>

      {!hasTargets ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-muted">
          В программе ребёнка нет целей. Попросите руководителя составить программу.
        </p>
      ) : (
        <section className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-4">
          <h1 className="text-xl font-bold">Кто на занятии</h1>
          <div>
            <p className="text-sm font-semibold">Специалист</p>
            <p>{staffName}</p>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Фея (ассистент)</span>
            <select
              value={assistantId}
              onChange={(e) => setAssistantId(e.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3"
            >
              <option value="">Без феи</option>
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-12 items-center justify-between gap-3">
            <span className="text-sm font-semibold">Родитель присутствует</span>
            <input
              type="checkbox"
              checked={parentPresent}
              onChange={(e) => setParentPresent(e.target.checked)}
              className="h-6 w-6 accent-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => onStart(assistantId || null, parentPresent)}
            className="h-12 w-full rounded-xl bg-primary font-semibold text-on-primary hover:bg-primary-hover"
          >
            Начать
          </button>
        </section>
      )}
    </>
  );
}
