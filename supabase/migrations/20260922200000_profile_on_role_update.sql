-- Supabase заводит учётную запись в два шага: сначала пользователь, затем роль
-- в app_metadata. Поэтому карточку сотрудника создаём и при создании, и при
-- изменении метаданных. Без этого сотрудник входит, но остаётся без доступа.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'staff_role' in ('supervisor', 'specialist') then
    insert into public.profiles (id, full_name, role)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email),
      (new.raw_app_meta_data ->> 'staff_role')::public.staff_role
    )
    on conflict (id) do update
      set role = excluded.role,
          -- имя из метаданных подставляем, только если в карточке осталась почта
          full_name = case
            when public.profiles.full_name like '%@%' then excluded.full_name
            else public.profiles.full_name
          end;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert or update of raw_app_meta_data, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();
