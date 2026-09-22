import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { AddDomainForm, AddSkillForm, EditSkillForm } from "./skill-forms";

export const metadata: Metadata = { title: "База навыков · АВА-занятия" };

export default async function SkillsPage() {
  const staff = await getStaff();
  const canEdit = staff?.role === "supervisor";

  const supabase = await createClient();
  const [{ data: domains, error }, { data: skills }] = await Promise.all([
    supabase.from("skill_domains").select("id, name, position").order("position"),
    supabase
      .from("skills")
      .select("id, domain_id, name, position, instruction, materials, curator_comment")
      .order("position"),
  ]);

  if (error) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center">
        Не удалось загрузить базу навыков. Обновите страницу.
      </p>
    );
  }

  const all = domains ?? [];

  return (
    <>
      <h1 className="text-2xl font-bold">База навыков</h1>
      <p className="mt-1 text-muted">
        {canEdit
          ? "Разделы и навыки VB-MAPP центра. Специалисты видят инструкции на занятии."
          : "Инструкции к навыкам. Правит базу руководитель."}
      </p>

      {canEdit && (
        <div className="mt-4 space-y-3">
          <AddSkillForm domains={all.map((d) => ({ id: d.id, name: d.name }))} />
          <AddDomainForm />
        </div>
      )}

      {all.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-surface p-6 text-center text-muted">
          База навыков пуста. Добавьте разделы и навыки VB-MAPP вашего центра.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {all.map((domain) => {
            const list = (skills ?? []).filter((s) => s.domain_id === domain.id);
            return (
              <section key={domain.id}>
                <h2 className="text-lg font-bold">
                  {domain.name} <span className="text-sm font-normal text-muted">· навыков: {list.length}</span>
                </h2>
                {list.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">В разделе пока нет навыков.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {list.map((s) => (
                      <li key={s.id} className="rounded-2xl border border-border bg-surface p-4">
                        <details>
                          <summary className="cursor-pointer">
                            <span className="font-heading font-bold">{s.name}</span>
                            <span className="ml-2 text-sm text-muted">№ {s.position}</span>
                          </summary>
                          <div className="mt-3 space-y-2 text-sm">
                            <p>{s.instruction || <span className="text-muted">Инструкции пока нет.</span>}</p>
                            {s.materials && (
                              <p>
                                <span className="font-semibold">Материалы:</span> {s.materials}
                              </p>
                            )}
                            {s.curator_comment && (
                              <p className="rounded-xl bg-primary-soft p-3">
                                <span className="font-semibold">Комментарий куратора:</span> {s.curator_comment}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <EditSkillForm
                              skill={{
                                id: s.id,
                                name: s.name,
                                position: s.position,
                                instruction: s.instruction,
                                materials: s.materials,
                                curatorComment: s.curator_comment,
                              }}
                            />
                          )}
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
