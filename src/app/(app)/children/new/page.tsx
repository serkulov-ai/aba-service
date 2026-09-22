import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { ChildForm } from "../child-form";

export const metadata: Metadata = { title: "Новый ребёнок · АВА-занятия" };

export default async function NewChildPage() {
  const staff = await getStaff();
  if (staff?.role !== "supervisor") redirect("/");

  const supabase = await createClient();
  const { data: specialists } = await supabase.from("profiles").select("id, full_name, role").order("full_name");

  return (
    <>
      <Link href="/" className="text-sm font-semibold text-primary">
        ← Дети
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Новый ребёнок</h1>
      <div className="mt-4">
        <ChildForm specialists={specialists ?? []} />
      </div>
    </>
  );
}
