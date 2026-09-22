"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";

// Детей заводит и правит только руководитель — это правило в самой базе (RLS).

export type ChildFormState = { error: string | null; saved?: boolean };

const FAILED = "Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.";

const Child = z.object({
  lastName: z.string().trim().min(1, "Введите фамилию.").max(100),
  firstName: z.string().trim().min(1, "Введите имя.").max(100),
  patronymic: z.string().trim().max(100),
  birthDate: z.iso.date("Укажите дату рождения."),
  methods: z.array(z.enum(["aba", "denver", "schieringer", "pecs", "other"])),
  specialistId: z.union([z.uuid(), z.literal("")]),
});

function read(formData: FormData) {
  return Child.safeParse({
    lastName: formData.get("lastName"),
    firstName: formData.get("firstName"),
    patronymic: formData.get("patronymic") ?? "",
    birthDate: formData.get("birthDate"),
    methods: formData.getAll("methods"),
    specialistId: formData.get("specialistId") ?? "",
  });
}

function row(data: z.infer<typeof Child>) {
  return {
    last_name: data.lastName,
    first_name: data.firstName,
    patronymic: data.patronymic || null,
    birth_date: data.birthDate,
    methods: data.methods,
    specialist_id: data.specialistId || null,
  };
}

export async function createChild(_prev: ChildFormState, formData: FormData): Promise<ChildFormState> {
  const parsed = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const staff = await getStaff();
  if (staff?.role !== "supervisor") return { error: "Детей заводит только руководитель." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("children").insert(row(parsed.data)).select("id").single();
  if (error || !data) return { error: FAILED };

  revalidatePath("/");
  redirect(`/children/${data.id}?tab=program`);
}

export async function updateChild(_prev: ChildFormState, formData: FormData): Promise<ChildFormState> {
  const childId = z.uuid().safeParse(formData.get("childId"));
  const parsed = read(formData);
  if (!childId.success) return { error: FAILED };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const staff = await getStaff();
  if (staff?.role !== "supervisor") return { error: "Данные ребёнка правит только руководитель." };

  const supabase = await createClient();
  const { error } = await supabase.from("children").update(row(parsed.data)).eq("id", childId.data);
  if (error) return { error: FAILED };

  revalidatePath(`/children/${childId.data}`);
  revalidatePath("/");
  return { error: null, saved: true };
}
