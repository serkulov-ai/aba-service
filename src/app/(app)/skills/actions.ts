"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";

// Базу навыков правит только руководитель — это правило в самой базе (RLS).

export type SkillFormState = { error: string | null; saved?: boolean };

const FAILED = "Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.";

const SkillFields = z.object({
  name: z.string().trim().min(2, "Введите название навыка.").max(200),
  position: z.coerce.number().int().min(0).max(999),
  instruction: z.string().trim().max(4000),
  materials: z.string().trim().max(1000),
  curatorComment: z.string().trim().max(2000),
});

function read(formData: FormData) {
  return {
    name: formData.get("name"),
    position: formData.get("position") || 0,
    instruction: formData.get("instruction") ?? "",
    materials: formData.get("materials") ?? "",
    curatorComment: formData.get("curatorComment") ?? "",
  };
}

export async function addSkill(_prev: SkillFormState, formData: FormData): Promise<SkillFormState> {
  const parsed = z
    .object({ domainId: z.uuid("Выберите раздел.") })
    .extend(SkillFields.shape)
    .safeParse({ domainId: formData.get("domainId"), ...read(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const staff = await getStaff();
  if (staff?.role !== "supervisor") return { error: "Правит базу только руководитель." };

  const supabase = await createClient();
  const { error } = await supabase.from("skills").insert({
    domain_id: parsed.data.domainId,
    name: parsed.data.name,
    position: parsed.data.position,
    instruction: parsed.data.instruction,
    materials: parsed.data.materials,
    curator_comment: parsed.data.curatorComment,
    updated_by: staff.id,
  });
  if (error) return { error: FAILED };

  revalidatePath("/skills");
  return { error: null, saved: true };
}

export async function updateSkill(_prev: SkillFormState, formData: FormData): Promise<SkillFormState> {
  const parsed = z
    .object({ skillId: z.uuid() })
    .extend(SkillFields.shape)
    .safeParse({ skillId: formData.get("skillId"), ...read(formData) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const staff = await getStaff();
  if (staff?.role !== "supervisor") return { error: "Правит базу только руководитель." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("skills")
    .update({
      name: parsed.data.name,
      position: parsed.data.position,
      instruction: parsed.data.instruction,
      materials: parsed.data.materials,
      curator_comment: parsed.data.curatorComment,
      updated_at: new Date().toISOString(),
      updated_by: staff.id,
    })
    .eq("id", parsed.data.skillId);
  if (error) return { error: FAILED };

  revalidatePath("/skills");
  return { error: null, saved: true };
}

export type DomainState = { error: string | null };

export async function addDomain(_prev: DomainState, formData: FormData): Promise<DomainState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Введите название раздела.").max(100),
      position: z.coerce.number().int().min(0).max(999),
    })
    .safeParse({ name: formData.get("name"), position: formData.get("position") || 0 });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const staff = await getStaff();
  if (staff?.role !== "supervisor") return { error: "Правит базу только руководитель." };

  const supabase = await createClient();
  const { error } = await supabase.from("skill_domains").insert(parsed.data);
  if (error) return { error: error.code === "23505" ? "Такой раздел уже есть." : FAILED };

  revalidatePath("/skills");
  return { error: null };
}
