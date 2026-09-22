import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { listStaff } from "./actions";
import { StaffManager } from "./staff-manager";

export const metadata: Metadata = { title: "Сотрудники · АВА-занятия" };

export default async function StaffPage() {
  const staff = await getStaff();
  if (staff?.role !== "supervisor") redirect("/");

  const supabase = await createClient();
  const [{ staff: members, error }, { data: assistants }] = await Promise.all([
    listStaff(),
    supabase.from("assistants").select("id, full_name, active").order("full_name"),
  ]);

  return (
    <StaffManager
      staff={members ?? []}
      error={error}
      selfId={staff.id}
      assistants={assistants ?? []}
    />
  );
}
