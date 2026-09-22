"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function MainNav({ isSupervisor }: { isSupervisor: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Дети" },
    { href: "/skills", label: "Навыки" },
    ...(isSupervisor ? [{ href: "/staff", label: "Сотрудники" }] : []),
  ];

  const current = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/children") : pathname.startsWith(href);

  return (
    <nav aria-label="Разделы" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4">
        {/* На узких экранах меню прокручивается вбок, страница при этом не едет */}
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current(item.href) ? "page" : undefined}
              className={`flex h-12 shrink-0 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap ${
                current(item.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="shrink-0 py-1">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
