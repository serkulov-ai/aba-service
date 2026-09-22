import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход · АВА-занятия" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-primary">АВА-занятия</h1>
        <p className="mt-1 text-muted">Учёт занятий и прогресса детей</p>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-muted">
          Нет доступа? Обратитесь к руководителю центра.
        </p>
      </div>
    </main>
  );
}
