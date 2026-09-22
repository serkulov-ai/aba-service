"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Заполните почту и пароль." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Сервер не ответил — это связь, а не пароль.
    if (!error.status || error.name === "AuthRetryableFetchError") {
      return {
        error: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.",
      };
    }
    // Один текст на все остальные случаи: не подсказываем, какая почта заведена.
    return { error: "Неверная почта или пароль. Проверьте и попробуйте ещё раз." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
