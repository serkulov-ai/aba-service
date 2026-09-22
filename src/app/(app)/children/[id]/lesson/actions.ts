"use server";

import { z } from "zod";
import { draftLessonReport, type DraftResult, type LessonFacts } from "@/lib/ai/lesson-report";
import { ageLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";

const Input = z.object({
  lessonId: z.uuid(),
  notes: z.object({
    skills: z.string().max(3000),
    behavior: z.string().max(3000),
    general: z.string().max(3000),
    homework: z.string().max(3000),
  }),
});

const SIGN: Record<string, string> = { S: "С", P: "+", M: "−" };

// Черновик рекомендаций и отчёта родителям. Данные занятия берём из базы
// (RLS: только занятия доступных сотруднику детей), заметки — из формы.
export async function prepareLessonDraft(input: z.infer<typeof Input>): Promise<DraftResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { lessonId, notes } = parsed.data;

  const staff = await getStaff();
  if (!staff) return { ok: false };

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, parent_present, assistant_id, child:children(first_name, birth_date)")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson?.child) return { ok: false };

  const [{ data: sessions }, { data: events }] = await Promise.all([
    supabase
      .from("target_sessions")
      .select(
        "target_id, delay, trials, correct_pct, independent_pct, target:child_targets(name, skill:skills(name, domain:skill_domains(name)))",
      )
      .eq("lesson_id", lessonId)
      .order("recorded_at"),
    supabase
      .from("target_events")
      .select("target_id, kind, from_delay, to_delay, followed_suggestion")
      .eq("lesson_id", lessonId)
      .order("created_at"),
  ]);

  const byTarget = new Map<string, LessonFacts["targets"][number]>();
  for (const s of sessions ?? []) {
    let t = byTarget.get(s.target_id);
    if (!t) {
      t = {
        name: s.target?.name ?? "Цель",
        skill: s.target?.skill?.name ?? null,
        domain: s.target?.skill?.domain?.name ?? null,
        sessions: [],
        delayChange: null,
        mastered: false,
      };
      byTarget.set(s.target_id, t);
    }
    t.sessions.push({
      delay: s.delay,
      trials: s.trials.map((x) => SIGN[x] ?? x).join(" "),
      correctPct: s.correct_pct,
      independentPct: s.independent_pct,
    });
  }

  for (const e of events ?? []) {
    const t = byTarget.get(e.target_id);
    if (!t) continue;
    if (e.kind === "mastered") t.mastered = true;
    if (e.kind === "delay_changed") {
      // Итоговое изменение за занятие: от первой задержки к последней.
      const from = t.delayChange ? t.delayChange.split(" → ")[0] : String(e.from_delay);
      t.delayChange = `${from} → ${e.to_delay} сек${e.followed_suggestion ? " (по совету сервиса)" : ""}`;
    }
  }

  return draftLessonReport({
    childFirstName: lesson.child.first_name,
    childAge: ageLabel(lesson.child.birth_date),
    parentPresent: lesson.parent_present,
    withAssistant: lesson.assistant_id !== null,
    targets: [...byTarget.values()],
    notes,
  });
}
