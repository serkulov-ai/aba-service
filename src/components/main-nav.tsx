"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MainNav({ isSupervisor }: { isSupervisor: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Дети" },
    { href: "/skills", label: "База навыков" },
    ...(isSupervisor ? [{ href: "/staff", label: "Сотрудники" }] : []),
  ];

  const current = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/children") : pathname.startsWith(href);

  return (
    <nav aria-label="Разделы" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl gap-1 px-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current(item.href) ? "page" : undefined}
            className={`flex h-12 items-center border-b-2 px-3 text-sm font-semibold ${
              current(item.href)
                ? "border-primary text-primary"
                : "border-transparent text-foreground hover:text-primary"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
