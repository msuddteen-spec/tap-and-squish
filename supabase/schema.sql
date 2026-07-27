-- Squishy Bread / Supabase schema
-- Run this entire file in the Supabase SQL Editor.
-- Players must use Supabase Anonymous Auth before syncing a profile.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(trim(username)) between 3 and 20),
  country_code text not null check (country_code = upper(country_code) and char_length(country_code) = 2),
  score bigint not null default 0 check (score >= 0),
  high_score bigint not null default 0 check (high_score >= 0),
  best_combo integer not null default 0 check (best_combo >= 0),
  total_presses bigint not null default 0 check (total_presses >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists high_score bigint not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists profiles_score_desc_idx on public.profiles (score desc);
create index if not exists profiles_country_code_idx on public.profiles (country_code);
create index if not exists profiles_country_score_idx on public.profiles (country_code, score desc);
create index if not exists profiles_updated_at_idx on public.profiles (updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop view if exists public.player_leaderboard;
drop view if exists public.country_leaderboard;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace view public.player_leaderboard
with (security_invoker = true)
as
select
  row_number() over (order by p.score desc, p.updated_at asc, p.id) as rank,
  p.id,
  p.username,
  p.country_code,
  p.score,
  p.best_combo,
  p.total_presses,
  p.updated_at
from public.profiles as p;

create or replace view public.country_leaderboard
with (security_invoker = true)
as
select
  dense_rank() over (order by sum(p.score) desc, p.country_code) as rank,
  p.country_code,
  sum(p.score)::bigint as total_score,
  count(*)::bigint as player_count,
  max(p.updated_at) as updated_at
from public.profiles as p
group by p.country_code;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
for select to anon, authenticated using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

grant select on public.profiles to anon, authenticated;
grant select on public.player_leaderboard to anon, authenticated;
grant select on public.country_leaderboard to anon, authenticated;

create or replace function public.sync_profile(
  p_id uuid, p_username text, p_country_code text, p_score bigint,
  p_high_score bigint, p_best_combo integer, p_total_presses bigint
)
returns public.profiles language plpgsql security definer set search_path = public
as $$
declare result public.profiles;
begin
  if auth.uid() is null or auth.uid() <> p_id then raise exception 'not authorized'; end if;
  if char_length(trim(p_username)) not between 3 and 20 then raise exception 'username must be between 3 and 20 characters'; end if;
  if p_country_code is null or p_country_code !~ '^[A-Za-z]{2}$' then raise exception 'country_code must be an ISO alpha-2 code'; end if;

  insert into public.profiles (id, username, country_code, score, high_score, best_combo, total_presses)
  values (p_id, trim(p_username), upper(p_country_code), greatest(coalesce(p_score, 0), 0), greatest(coalesce(p_high_score, 0), 0), greatest(coalesce(p_best_combo, 0), 0), greatest(coalesce(p_total_presses, 0), 0))
  on conflict (id) do update set
    username = excluded.username,
    country_code = excluded.country_code,
    score = greatest(public.profiles.score, excluded.score),
    high_score = greatest(public.profiles.high_score, excluded.high_score, excluded.score),
    best_combo = greatest(public.profiles.best_combo, excluded.best_combo),
    total_presses = greatest(public.profiles.total_presses, excluded.total_presses),
    updated_at = timezone('utc', now())
  returning * into result;
  return result;
end;
$$;

create or replace function public.get_player_rank(p_id uuid)
returns bigint language sql stable security definer set search_path = public
as $$
  select coalesce((select rank from public.player_leaderboard where id = p_id), (select count(*) + 1 from public.profiles where score > coalesce((select score from public.profiles where id = p_id), 0)))::bigint;
$$;

create or replace function public.get_country_rank(p_country_code text)
returns bigint language sql stable security definer set search_path = public
as $$
  select rank::bigint from public.country_leaderboard where country_code = upper(p_country_code) limit 1;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.sync_profile(uuid, text, text, bigint, bigint, integer, bigint) from public;
revoke all on function public.get_player_rank(uuid) from public;
revoke all on function public.get_country_rank(text) from public;
grant execute on function public.sync_profile(uuid, text, text, bigint, bigint, integer, bigint) to authenticated;
grant execute on function public.get_player_rank(uuid) to anon, authenticated;
grant execute on function public.get_country_rank(text) to anon, authenticated;