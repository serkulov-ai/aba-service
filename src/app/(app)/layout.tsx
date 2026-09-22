import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { logout } from "@/app/login/actions";
import { getStaff, ROLE_LABEL } from "@/lib/staff";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const staff = await getStaff();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="shrink-0 font-heading text-lg font-bold whitespace-nowrap text-primary">
            АВА-занятия
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {staff && (
              <span className="min-w-0 truncate text-right text-sm leading-tight">
                <span className="block truncate font-semibold">{staff.full_name}</span>
                <span className="block text-muted">{ROLE_LABEL[staff.role]}</span>
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="h-12 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-primary-soft"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>

      {staff && <MainNav isSupervisor={staff.role === "supervisor"} />}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {staff ? (
          children
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center">
            У вашей учётной записи нет доступа. Обратитесь к руководителю центра.
          </p>
        )}
      </main>
    </div>
  );
}
