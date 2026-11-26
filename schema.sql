-- Endesha kwenye Supabase → SQL Editor (mara moja)
create table if not exists public.zuri_usage (
  user_id uuid not null,
  day date not null,
  kind text not null,
  count int not null default 0,
  primary key (user_id, day, kind)
);
create table if not exists public.zuri_reports (
  id bigserial primary key,
  user_id uuid,
  reason text,
  text text,
  created_at timestamptz default now()
);
alter table public.zuri_usage enable row level security;
alter table public.zuri_reports enable row level security;  -- hakuna policy: seva pekee (service role) ndiyo inaingia

create or replace function public.zuri_bump(p_user uuid, p_day date, p_kind text, p_limit int)
returns int language plpgsql security definer as $$
declare v int;
begin
  insert into public.zuri_usage(user_id, day, kind, count) values (p_user, p_day, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.zuri_usage.count + 1
  where public.zuri_usage.count < p_limit
  returning count into v;
  return v;  -- null = kikomo kimefika
end $$;

create or replace function public.zuri_unbump(p_user uuid, p_day date, p_kind text)
returns void language sql security definer as $$
  update public.zuri_usage set count = greatest(count - 1, 0) where user_id = p_user and day = p_day and kind = p_kind;
$$;

revoke all on function public.zuri_bump(uuid, date, text, int) from public, anon, authenticated;
revoke all on function public.zuri_unbump(uuid, date, text) from public, anon, authenticated;
grant execute on function public.zuri_bump(uuid, date, text, int) to service_role;
grant execute on function public.zuri_unbump(uuid, date, text) to service_role;
