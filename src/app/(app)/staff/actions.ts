"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";

// Учётные записи заводит серверная функция Supabase: секретный ключ живёт только там.

export type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  role: "supervisor" | "specialist";
  active: boolean;
  lastSignInAt: string | null;
};

const FAILED = "Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.";

// Временный пароль: читается вслух и вводится руками, поэтому без похожих символов.
function tempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "Aba-" + [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

async function callAdmin(body: Record<string, unknown>): Promise<{ data?: unknown; error?: string }> {
  const staff = await getStaff();
  if (staff?.role !== "supervisor") return { error: "Доступ только у руководителя." };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("staff-admin", { body });
  if (!error) return { data };

  // Текст ошибки от функции: exists — почта уже занята.
  let detail = "";
  if (error instanceof Error && "context" in error) {
    try {
      detail = ((await (error.context as Response).json()) as { error?: string }).error ?? "";
    } catch {
      detail = "";
    }
  }
  if (detail === "exists") return { error: "Такая почта уже заведена." };
  if (detail === "self") return { error: "Нельзя отключить самого себя." };
  return { error: FAILED };
}

export async function listStaff(): Promise<{ staff?: StaffMember[]; error?: string }> {
  const { data, error } = await callAdmin({ action: "list" });
  if (error) return { error };
  return { staff: (data as { staff: StaffMember[] }).staff };
}

export type StaffFormState = { error: string | null; created?: { name: string; email: string; password: string } };

const NewStaff = z.object({
  fullName: z.string().trim().min(2, "Введите имя и фамилию.").max(100),
  email: z.email("Проверьте адрес почты."),
  role: z.enum(["supervisor", "specialist"]),
});

export async function createStaff(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const parsed = NewStaff.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const password = tempPassword();
  const { error } = await callAdmin({ action: "create", ...parsed.data, password });
  if (error) return { error };

  revalidatePath("/staff");
  return { error: null, created: { name: parsed.data.fullName, email: parsed.data.email.toLowerCase(), password } };
}

export type ResetState = { error: string | null; password?: string; name?: string };

export async function resetStaffPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = z
    .object({ userId: z.uuid(), name: z.string().max(100) })
    .safeParse({ userId: formData.get("userId"), name: formData.get("name") ?? "" });
  if (!parsed.success) return { error: FAILED };

  const password = tempPassword();
  const { error } = await callAdmin({ action: "reset_password", userId: parsed.data.userId, password });
  if (error) return { error };
  return { error: null, password, name: parsed.data.name };
}

export async function setStaffActive(userId: string, active: boolean) {
  const { error } = await callAdmin({ action: "set_active", userId, active });
  if (error) throw new Error(error);
  revalidatePath("/staff");
}

// --- Феи (ассистенты): обычная таблица, права проверяет база ------------------

export type AssistantState = { error: string | null };

export async function addAssistant(_prev: AssistantState, formData: FormData): Promise<AssistantState> {
  const parsed = z.string().trim().min(2, "Введите имя.").max(100).safeParse(formData.get("fullName"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAILED };

  const supabase = await createClient();
  const { error } = await supabase.from("assistants").insert({ full_name: parsed.data });
  if (error) return { error: FAILED };

  revalidatePath("/staff");
  return { error: null };
}

export async function setAssistantActive(id: string, active: boolean) {
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("assistants").update({ active }).eq("id", id);
  if (error) throw new Error(FAILED);
  revalidatePath("/staff");
}
