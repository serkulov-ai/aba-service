"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";

// Права проверяет база (RLS): программу меняют руководитель и специалист этого ребёнка.

export type FormState = { error: string | null };

const SAVE_FAILED = "Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.";

async function insertTarget(input: {
  childId: string;
  skillId: string;
  name: string;
  notes: string;
  usesRotation: boolean;
}): Promise<string | null> {
  const staff = await getStaff();
  if (!staff) return SAVE_FAILED;
  const supabase = await createClient();

  const [{ data: skill }, { data: last }] = await Promise.all([
    supabase.from("skills").select("name").eq("id", input.skillId).maybeSingle(),
    supabase
      .from("child_targets")
      .select("position")
      .eq("child_id", input.childId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!skill) return "Навык не найден в базе. Обновите страницу.";

  const { error } = await supabase.from("child_targets").insert({
    child_id: input.childId,
    skill_id: input.skillId,
    name: input.name || skill.name,
    notes: input.notes,
    uses_rotation: input.usesRotation,
    position: (last?.position ?? 0) + 1,
    created_by: staff.id,
  });
  return error ? SAVE_FAILED : null;
}

const AddTarget = z.object({
  childId: z.uuid(),
  skillId: z.uuid({ error: "Выберите навык из списка." }),
  name: z.string().trim().max(200),
  notes: z.string().trim().max(2000),
  usesRotation: z.boolean(),
});

export async function addTarget(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = AddTarget.safeParse({
    childId: formData.get("childId"),
    skillId: formData.get("skillId"),
    name: formData.get("name") ?? "",
    notes: formData.get("notes") ?? "",
    usesRotation: formData.get("usesRotation") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? SAVE_FAILED };

  const error = await insertTarget(parsed.data);
  if (error) return { error };

  revalidatePath(`/children/${parsed.data.childId}`);
  redirect(`/children/${parsed.data.childId}?tab=program&added=1`);
}

// «Добавить в программу» из подсказки после освоения цели.
export async function addSuggestedTarget(childId: string, skillId: string) {
  const ids = z.object({ childId: z.uuid(), skillId: z.uuid() }).safeParse({ childId, skillId });
  if (!ids.success) return;
  const error = await insertTarget({ ...ids.data, name: "", notes: "", usesRotation: false });
  if (error) throw new Error(error);
  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}?tab=program&added=1`);
}

const Status = z.enum(["in_progress", "paused"]);

// Отложить цель или вернуть в работу (в том числе освоенную).
export async function setTargetStatus(childId: string, targetId: string, status: "in_progress" | "paused") {
  const parsed = z.object({ childId: z.uuid(), targetId: z.uuid(), status: Status }).safeParse({ childId, targetId, status });
  if (!parsed.success) return;
  const staff = await getStaff();
  if (!staff) return;
  const supabase = await createClient();

  const { data: target } = await supabase
    .from("child_targets")
    .select("status")
    .eq("id", targetId)
    .eq("child_id", childId)
    .maybeSingle();
  if (!target || target.status === status) return;

  const { error } = await supabase
    .from("child_targets")
    .update({ status, ...(target.status === "mastered" ? { mastered_at: null } : {}) })
    .eq("id", targetId);
  if (error) throw new Error(SAVE_FAILED);

  if (target.status === "mastered") {
    await supabase.from("target_events").insert({ target_id: targetId, kind: "reopened" });
  }
  revalidatePath(`/children/${childId}`);
}
