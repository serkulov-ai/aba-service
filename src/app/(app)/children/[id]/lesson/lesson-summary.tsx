"use client";

import { useState } from "react";
import { enqueue, flush, pendingCount, useSyncStatus } from "@/lib/offline/outbox";
import type { Delay } from "@/lib/rules";
import { prepareLessonDraft } from "./actions";

export type Report = {
  skills: string;
  behavior: string;
  general: string;
  homework: string;
  recommendations: string;
  parent: string;
  aiDraft: boolean; // тексты подготовил ИИ — показываем предупреждение
};

export const EMPTY_REPORT: Report = {
  skills: "",
  behavior: "",
  general: "",
  homework: "",
  recommendations: "",
  parent: "",
  aiDraft: false,
};

type TargetSummary = {
  id: string;
  name: string;
  sessions: { id: string; correctPct: number; independentPct: number; delay: Delay }[];
  fromDelay: Delay;
  toDelay: Delay;
  mastered: boolean;
};

const NOTE_FIELDS: { key: "skills" | "behavior" | "general" | "homework"; label: string }[] = [
  { key: "skills", label: "По навыкам" },
  { key: "behavior", label: "По поведению" },
  { key: "general", label: "Общий комментарий" },
  { key: "homework", label: "Домашнее задание для родителей" },
];

export function reportPatch(r: Report) {
  return {
    skills_note: r.skills,
    behavior_note: r.behavior,
    general_note: r.general,
    homework: r.homework,
    ai_recommendations: r.recommendations,
    parent_report: r.parent,
  };
}

// Буфер обмена есть только на https и localhost; в локальной сети — запасной путь.
async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export function LessonSummary({
  lessonId,
  targets,
  report,
  onReport,
  onLeave,
}: {
  lessonId: string;
  targets: TargetSummary[];
  report: Report;
  onReport: (r: Report) => void;
  onLeave: () => void;
}) {
  const sync = useSyncStatus();
  const [ai, setAi] = useState<"idle" | "loading" | "error" | "offline">("idle");
  const [notice, setNotice] = useState<string | null>(null);

  const set = (patch: Partial<Report>) => {
    setNotice(null);
    onReport({ ...report, ...patch });
  };

  const save = (message = "Занятие сохранено.") => {
    void enqueue({ type: "lesson.update", id: lessonId, patch: reportPatch(report) });
    setNotice(message);
  };

  async function makeDraft() {
    setAi("loading");
    setNotice(null);
    try {
      // ИИ читает занятие из базы — сначала досылаем все отметки.
      await flush();
      if ((await pendingCount()) > 0) {
        setAi("offline");
        return;
      }
      const res = await prepareLessonDraft({
        lessonId,
        notes: { skills: report.skills, behavior: report.behavior, general: report.general, homework: report.homework },
      });
      if (!res.ok) {
        setAi("error");
        return;
      }
      onReport({ ...report, recommendations: res.recommendations, parent: res.parentReport, aiDraft: true });
      setAi("idle");
    } catch {
      setAi(navigator.onLine ? "error" : "offline");
    }
  }

  const synced = sync.state === "synced" && sync.online;

  return (
    <>
      <h1 className="text-2xl font-bold">Итог занятия</h1>
      {!synced && (
        <p className="mt-3 rounded-2xl bg-prompted/15 p-4 text-sm">
          Занятие сохранено на телефоне. Отправим на сервер, когда появится связь.
        </p>
      )}

      {targets.length === 0 ? (
        <p className="mt-4 text-muted">На этом занятии пробы не отмечались.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {targets.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border bg-surface p-4">
              <p className="font-heading font-bold">{t.name}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {t.sessions.map((s, i) => (
                  <li key={s.id}>
                    Круг {i + 1}: правильных {s.correctPct}% · самостоятельных {s.independentPct}% · {s.delay} сек
                  </li>
                ))}
              </ul>
              {t.mastered ? (
                <p className="mt-2 text-sm font-semibold text-independent">Цель освоена</p>
              ) : (
                t.fromDelay !== t.toDelay && (
                  <p className="mt-2 text-sm font-semibold text-primary">
                    Задержка: {t.fromDelay} → {t.toDelay} сек
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-bold">Заметки специалиста</h2>
        {NOTE_FIELDS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="text-sm font-semibold">{label}</span>
            <textarea
              value={report[key]}
              onChange={(e) => set({ [key]: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        ))}
      </section>

      <section className="mt-6">
        <button
          type="button"
          onClick={makeDraft}
          disabled={ai === "loading"}
          className="h-12 w-full rounded-xl border-2 border-primary font-semibold text-primary hover:bg-primary-soft disabled:opacity-60"
        >
          {ai === "loading" ? "Готовим черновик…" : "Подготовить черновик с помощью ИИ"}
        </button>
        {ai === "loading" && <p className="mt-2 text-sm text-muted">Обычно 10–20 секунд.</p>}
        {ai === "error" && (
          <p role="alert" className="mt-2 rounded-xl bg-incorrect/10 px-4 py-3 text-sm text-incorrect">
            Не получилось подготовить черновик. Напишите отчёт сами или попробуйте ещё раз.
          </p>
        )}
        {ai === "offline" && (
          <p role="alert" className="mt-2 rounded-xl bg-prompted/15 px-4 py-3 text-sm">
            Нет интернета. Черновик можно будет подготовить, когда связь появится.
          </p>
        )}
      </section>

      {report.aiDraft && (
        <p className="mt-6 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold">
          Черновик от ИИ. Проверьте перед отправкой.
        </p>
      )}

      {(report.recommendations || report.aiDraft) && (
        <label className="mt-4 block">
          <span className="text-lg font-bold">Рекомендации специалисту</span>
          <span className="block text-sm text-muted">Видят только специалист и руководитель</span>
          <textarea
            value={report.recommendations}
            onChange={(e) => set({ recommendations: e.target.value })}
            rows={6}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      )}

      <label className="mt-4 block">
        <span className="text-lg font-bold">Отчёт для родителей</span>
        <textarea
          value={report.parent}
          onChange={(e) => set({ parent: e.target.value })}
          rows={8}
          placeholder="Напишите сообщение родителям или подготовьте черновик с помощью ИИ"
          className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 outline-none placeholder:text-muted focus:border-primary"
        />
      </label>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          disabled={!report.parent.trim()}
          onClick={() => {
            save();
            window.open(`https://wa.me/?text=${encodeURIComponent(report.parent.trim())}`, "_blank", "noopener");
          }}
          className="h-12 rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Отправить в WhatsApp
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!report.parent.trim()}
            onClick={async () => {
              await copyText(report.parent.trim());
              setNotice("Текст скопирован.");
            }}
            className="h-12 rounded-xl border border-border font-semibold hover:bg-primary-soft disabled:opacity-50"
          >
            Скопировать текст
          </button>
          <button
            type="button"
            onClick={() => save()}
            className="h-12 rounded-xl border border-border font-semibold hover:bg-primary-soft"
          >
            Сохранить
          </button>
        </div>
        {notice && (
          <p role="status" className="rounded-xl bg-independent/10 px-4 py-3 text-sm font-semibold text-independent">
            {notice}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="mt-6 h-12 w-full rounded-xl border border-border font-semibold hover:bg-primary-soft"
      >
        К списку детей
      </button>
    </>
  );
}
