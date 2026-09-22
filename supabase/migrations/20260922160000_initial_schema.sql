-- Схема ABA-сервиса: сотрудники, дети, база навыков, программа, занятия, сессии по 9 проб.
-- Доступ: руководитель видит всё, специалист — только своих детей (RLS ниже).

-- ---------------------------------------------------------------------------
-- Типы
-- ---------------------------------------------------------------------------

create type public.staff_role as enum ('supervisor', 'specialist');
create type public.target_status as enum ('in_progress', 'mastered', 'paused');
create type public.lesson_status as enum ('in_progress', 'finished');
create type public.target_event_kind as enum ('delay_changed', 'mastered', 'reopened');

-- ---------------------------------------------------------------------------
-- Сотрудники
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  role public.staff_role not null,
  created_at timestamptz not null default now()
);

-- Профиль создаётся только если роль задана в app_metadata. Её может выставить
-- лишь сервер с секретным ключом, поэтому самостоятельная регистрация
-- не даёт доступа ни к чему.
create function public.handle_new_user()
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
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Феи (ассистенты). В сервис не входят, их выбирают из списка на занятии.
create table public.assistants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Дети
-- ---------------------------------------------------------------------------

create table public.children (
  id uuid primary key default gen_random_uuid(),
  last_name text not null check (length(trim(last_name)) > 0),
  first_name text not null check (length(trim(first_name)) > 0),
  patronymic text,
  birth_date date not null,
  -- aba — АВА-терапия, denver — Денверская модель, schieringer — протокол Ширингера,
  -- pecs — PECS, other — другое
  methods text[] not null default '{}'
    check (methods <@ array['aba', 'denver', 'schieringer', 'pecs', 'other']),
  specialist_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index children_specialist_id_idx on public.children (specialist_id);

-- ---------------------------------------------------------------------------
-- База навыков VB-MAPP центра
-- ---------------------------------------------------------------------------

create table public.skill_domains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  position integer not null default 0
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.skill_domains (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  -- порядок внутри раздела = иерархия центра: следующая цель предлагается по нему
  position integer not null default 0,
  instruction text not null default '',
  materials text not null default '',
  curator_comment text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index skills_domain_position_idx on public.skills (domain_id, position);
create index skills_updated_by_idx on public.skills (updated_by);

-- ---------------------------------------------------------------------------
-- Программа ребёнка: цели
-- ---------------------------------------------------------------------------

create table public.child_targets (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete set null,
  name text not null check (length(trim(name)) > 0), -- «Цель» из бланка
  notes text not null default '',                     -- «Инструкции и примечания»
  stimuli text[] not null default '{}' check (cardinality(stimuli) <= 3), -- А, Б, В
  status public.target_status not null default 'in_progress',
  current_delay smallint not null default 0 check (current_delay in (0, 2, 4)),
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  mastered_at timestamptz
);

create index child_targets_child_id_idx on public.child_targets (child_id, position);
create index child_targets_skill_id_idx on public.child_targets (skill_id);
create index child_targets_created_by_idx on public.child_targets (created_by);

-- ---------------------------------------------------------------------------
-- Занятия и сессии
-- ---------------------------------------------------------------------------

-- id может прийти с телефона: занятие начинается и без интернета.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  specialist_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  assistant_id uuid references public.assistants (id) on delete set null,
  parent_present boolean not null default false,
  status public.lesson_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  skills_note text not null default '',
  behavior_note text not null default '',
  general_note text not null default '',
  homework text not null default '',
  ai_recommendations text not null default '',
  parent_report text not null default ''
);

create index lessons_child_started_idx on public.lessons (child_id, started_at desc);
create index lessons_specialist_id_idx on public.lessons (specialist_id);
create index lessons_assistant_id_idx on public.lessons (assistant_id);

-- Одна сессия по цели = 9 проб: S — сам, P — с подсказкой, M — неверно.
-- Проценты считает приложение (src/lib/rules), база проверяет только границы.
create table public.target_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  target_id uuid not null references public.child_targets (id) on delete cascade,
  delay smallint not null check (delay in (0, 2, 4)),
  trials text[] not null
    check (cardinality(trials) = 9 and trials <@ array['S', 'P', 'M']),
  correct_pct smallint not null check (correct_pct between 0 and 100),
  independent_pct smallint not null check (independent_pct between 0 and 100),
  rotation_table smallint check (rotation_table between 1 and 3),
  recorded_at timestamptz not null default now()
);

create index target_sessions_target_recorded_idx on public.target_sessions (target_id, recorded_at desc);
create index target_sessions_lesson_id_idx on public.target_sessions (lesson_id);

-- Смена задержки и освоение: кто, когда, по совету сервиса или сам.
create table public.target_events (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.child_targets (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  kind public.target_event_kind not null,
  from_delay smallint check (from_delay in (0, 2, 4)),
  to_delay smallint check (to_delay in (0, 2, 4)),
  followed_suggestion boolean,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index target_events_target_idx on public.target_events (target_id, created_at desc);
create index target_events_lesson_id_idx on public.target_events (lesson_id);
create index target_events_created_by_idx on public.target_events (created_by);

-- ---------------------------------------------------------------------------
-- Проверки доступа. Схема private не видна через API.
-- ---------------------------------------------------------------------------

create schema private;
grant usage on schema private to authenticated;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

create function private.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'supervisor'
  );
$$;

create function private.can_access_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_supervisor() or exists (
    select 1 from public.children
    where id = p_child_id and specialist_id = (select auth.uid())
  );
$$;

create function private.can_access_target(p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.child_targets t
    where t.id = p_target_id and private.can_access_child(t.child_id)
  );
$$;

create function private.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id and private.can_access_child(l.child_id)
  );
$$;

-- Записывать пробы может автор занятия (или руководитель), и цель должна
-- принадлежать тому же ребёнку, что и занятие.
create function private.can_write_session(p_lesson_id uuid, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    join public.child_targets t on t.child_id = l.child_id
    where l.id = p_lesson_id
      and t.id = p_target_id
      and (l.specialist_id = (select auth.uid()) or private.is_supervisor())
      and private.can_access_child(l.child_id)
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.assistants enable row level security;
alter table public.children enable row level security;
alter table public.skill_domains enable row level security;
alter table public.skills enable row level security;
alter table public.child_targets enable row level security;
alter table public.lessons enable row level security;
alter table public.target_sessions enable row level security;
alter table public.target_events enable row level security;

-- Гостям без входа — ничего.
revoke all on all tables in schema public from anon;

-- profiles: сотрудники видят друг друга (имя специалиста в карточке ребёнка),
-- менять может только руководитель. Создание — только через триггер.
create policy "staff read profiles" on public.profiles
  for select to authenticated using ((select private.is_staff()));
create policy "supervisor updates profiles" on public.profiles
  for update to authenticated
  using ((select private.is_supervisor()))
  with check ((select private.is_supervisor()));

-- assistants
create policy "staff read assistants" on public.assistants
  for select to authenticated using ((select private.is_staff()));
create policy "supervisor inserts assistants" on public.assistants
  for insert to authenticated with check ((select private.is_supervisor()));
create policy "supervisor updates assistants" on public.assistants
  for update to authenticated
  using ((select private.is_supervisor()))
  with check ((select private.is_supervisor()));
create policy "supervisor deletes assistants" on public.assistants
  for delete to authenticated using ((select private.is_supervisor()));

-- children: специалист — только свои, руководитель — все и только он меняет.
create policy "read accessible children" on public.children
  for select to authenticated using (private.can_access_child(id));
create policy "supervisor inserts children" on public.children
  for insert to authenticated with check ((select private.is_supervisor()));
create policy "supervisor updates children" on public.children
  for update to authenticated
  using ((select private.is_supervisor()))
  with check ((select private.is_supervisor()));
create policy "supervisor deletes children" on public.children
  for delete to authenticated using ((select private.is_supervisor()));

-- skill_domains, skills: читают все сотрудники, правит руководитель.
create policy "staff read skill domains" on public.skill_domains
  for select to authenticated using ((select private.is_staff()));
create policy "supervisor inserts skill domains" on public.skill_domains
  for insert to authenticated with check ((select private.is_supervisor()));
create policy "supervisor updates skill domains" on public.skill_domains
  for update to authenticated
  using ((select private.is_supervisor()))
  with check ((select private.is_supervisor()));
create policy "supervisor deletes skill domains" on public.skill_domains
  for delete to authenticated using ((select private.is_supervisor()));

create policy "staff read skills" on public.skills
  for select to authenticated using ((select private.is_staff()));
create policy "supervisor inserts skills" on public.skills
  for insert to authenticated with check ((select private.is_supervisor()));
create policy "supervisor updates skills" on public.skills
  for update to authenticated
  using ((select private.is_supervisor()))
  with check ((select private.is_supervisor()));
create policy "supervisor deletes skills" on public.skills
  for delete to authenticated using ((select private.is_supervisor()));

-- child_targets: руководитель и специалист ребёнка добавляют и меняют цели,
-- удаляет только руководитель.
create policy "read targets of accessible children" on public.child_targets
  for select to authenticated using (private.can_access_child(child_id));
create policy "insert targets for accessible children" on public.child_targets
  for insert to authenticated with check (private.can_access_child(child_id));
create policy "update targets of accessible children" on public.child_targets
  for update to authenticated
  using (private.can_access_child(child_id))
  with check (private.can_access_child(child_id));
create policy "supervisor deletes targets" on public.child_targets
  for delete to authenticated using ((select private.is_supervisor()));

-- lessons: специалист ведёт занятия только со своими детьми и от своего имени.
create policy "read lessons of accessible children" on public.lessons
  for select to authenticated using (private.can_access_child(child_id));
create policy "insert own lessons" on public.lessons
  for insert to authenticated
  with check (
    specialist_id = (select auth.uid()) and private.can_access_child(child_id)
  );
create policy "author or supervisor updates lessons" on public.lessons
  for update to authenticated
  using (
    (specialist_id = (select auth.uid()) or (select private.is_supervisor()))
    and private.can_access_child(child_id)
  )
  with check (
    (specialist_id = (select auth.uid()) or (select private.is_supervisor()))
    and private.can_access_child(child_id)
  );
create policy "supervisor deletes lessons" on public.lessons
  for delete to authenticated using ((select private.is_supervisor()));

-- target_sessions
create policy "read sessions of accessible lessons" on public.target_sessions
  for select to authenticated using (private.can_access_lesson(lesson_id));
create policy "author inserts sessions" on public.target_sessions
  for insert to authenticated with check (private.can_write_session(lesson_id, target_id));
create policy "author updates sessions" on public.target_sessions
  for update to authenticated
  using (private.can_write_session(lesson_id, target_id))
  with check (private.can_write_session(lesson_id, target_id));
create policy "author deletes sessions" on public.target_sessions
  for delete to authenticated using (private.can_write_session(lesson_id, target_id));

-- target_events: только добавление, история не переписывается.
create policy "read events of accessible targets" on public.target_events
  for select to authenticated using (private.can_access_target(target_id));
create policy "insert events for accessible targets" on public.target_events
  for insert to authenticated
  with check (
    created_by = (select auth.uid()) and private.can_access_target(target_id)
  );
