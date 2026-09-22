import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { ageLabel, fullName } from "@/lib/format";
import type { Delay } from "@/lib/rules";
import { LessonRunner, type LessonTarget, type PastSession } from "./lesson-runner";

export const metadata: Metadata = { title: "Занятие · АВА-занятия" };

export default async function LessonPage({ params }: PageProps<"/children/[id]/lesson">) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff) notFound();

  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("id, last_name, first_name, patronymic, birth_date")
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();

  const [{ data: targets }, { data: assistants }] = await Promise.all([
    supabase
      .from("child_targets")
      .select(
        "id, name, notes, uses_rotation, current_delay, skill:skills(name, instruction, materials, curator_comment, domain:skill_domains(name))",
      )
      .eq("child_id", id)
      .eq("status", "in_progress")
      .order("position"),
    supabase.from("assistants").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  const targetIds = (targets ?? []).map((t) => t.id);
  const { data: sessions } = targetIds.length
    ? await supabase
        .from("target_sessions")
        .select("id, target_id, delay, correct_pct, independent_pct, recorded_at")
        .in("target_id", targetIds)
        .order("recorded_at")
        .limit(1000)
    : { data: [] };

  const lessonTargets: LessonTarget[] = (targets ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    notes: t.notes,
    usesRotation: t.uses_rotation,
    currentDelay: t.current_delay as Delay,
    skillName: t.skill?.name ?? null,
    domainName: t.skill?.domain?.name ?? null,
    instruction: t.skill?.instruction ?? "",
    materials: t.skill?.materials ?? "",
    curatorComment: t.skill?.curator_comment ?? "",
  }));

  const history: PastSession[] = (sessions ?? []).map((s) => ({
    id: s.id,
    targetId: s.target_id,
    delay: s.delay as Delay,
    correctPct: s.correct_pct,
    independentPct: s.independent_pct,
  }));

  return (
    <LessonRunner
      child={{ id: child.id, name: fullName(child), age: ageLabel(child.birth_date) }}
      staffName={staff.full_name}
      targets={lessonTargets}
      history={history}
      assistants={assistants ?? []}
    />
  );
}
