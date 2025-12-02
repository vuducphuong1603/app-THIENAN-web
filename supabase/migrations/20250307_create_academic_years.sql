-- Academic year management with semester boundaries
create extension if not exists "pgcrypto";

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  semester1_start date not null,
  semester1_end date not null,
  semester2_start date not null,
  semester2_end date not null,
  total_weeks integer not null default 0,
  semester1_weeks integer,
  semester2_weeks integer,
  is_current boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint academic_years_date_order check (
    start_date <= semester1_start
    and semester1_start <= semester1_end
    and semester1_end < semester2_start
    and semester2_start <= semester2_end
    and semester2_end <= end_date
  ),
  constraint academic_years_positive_weeks check (
    total_weeks >= 0
    and (semester1_weeks is null or semester1_weeks >= 0)
    and (semester2_weeks is null or semester2_weeks >= 0)
  )
);

create unique index if not exists academic_years_name_key on academic_years (name);
create index if not exists academic_years_current_idx on academic_years (is_current) where is_current;

create or replace function academic_years_set_weeks_defaults() returns trigger as $$
declare
  computed_total int;
  computed_sem1 int;
  computed_sem2 int;
begin
  computed_total := ceil(((greatest(NEW.end_date, NEW.start_date) - least(NEW.start_date, NEW.end_date)) + 1)::numeric / 7);
  computed_sem1 := ceil(((NEW.semester1_end - NEW.semester1_start) + 1)::numeric / 7);
  computed_sem2 := ceil(((NEW.semester2_end - NEW.semester2_start) + 1)::numeric / 7);

  if NEW.total_weeks is null or NEW.total_weeks <= 0 then
    NEW.total_weeks := greatest(1, computed_total);
  end if;

  if NEW.semester1_weeks is null or NEW.semester1_weeks <= 0 then
    NEW.semester1_weeks := greatest(1, computed_sem1);
  end if;

  if NEW.semester2_weeks is null or NEW.semester2_weeks <= 0 then
    NEW.semester2_weeks := greatest(1, computed_sem2);
  end if;

  NEW.updated_at := timezone('utc', now());
  return NEW;
end;
$$ language plpgsql;

create or replace function academic_years_set_current() returns trigger as $$
begin
  if NEW.is_current then
    update academic_years
    set is_current = false
    where id <> NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_academic_years_set_defaults on academic_years;
create trigger trg_academic_years_set_defaults
before insert or update on academic_years
for each row execute procedure academic_years_set_weeks_defaults();

drop trigger if exists trg_academic_years_single_current on academic_years;
create trigger trg_academic_years_single_current
after insert or update on academic_years
for each row execute procedure academic_years_set_current();

alter table academic_years enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'academic_years' and policyname = 'Academic years are readable by authenticated users'
  ) then
    create policy "Academic years are readable by authenticated users"
      on academic_years
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'academic_years' and policyname = 'Authenticated users can insert academic years'
  ) then
    create policy "Authenticated users can insert academic years"
      on academic_years
      for insert
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'academic_years' and policyname = 'Authenticated users can update academic years'
  ) then
    create policy "Authenticated users can update academic years"
      on academic_years
      for update
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;
