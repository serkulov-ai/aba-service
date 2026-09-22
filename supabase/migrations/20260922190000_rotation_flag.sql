-- Стимулы на каждом занятии разные, поэтому названия не храним.
-- У цели только отметка: работаем с ротацией стимулов А, Б, В по таблицам.

alter table public.child_targets
  add column uses_rotation boolean not null default false;

update public.child_targets set uses_rotation = cardinality(stimuli) = 3;

alter table public.child_targets drop column stimuli;
