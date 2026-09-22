import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Staff = Tables<"profiles">;

// Текущий сотрудник. Один запрос к базе на всю страницу.
// null — вошёл, но роли нет (сам зарегистрировался): доступа ни к чему нет.
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  // Проверка подписи пропуска на месте, без обращения к серверу базы.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return profile;
});

export const ROLE_LABEL: Record<Staff["role"], string> = {
  supervisor: "Руководитель",
  specialist: "Специалист",
};
