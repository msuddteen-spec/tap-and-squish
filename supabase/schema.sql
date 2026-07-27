create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 20),
  country_code char(2) not null check (country_code = upper(country_code)),
  score bigint not null default 0,
  best_combo integer not null default 0,
  total_presses bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_score_desc_idx on public.profiles (score desc);
create index if not exists profiles_country_idx on public.profiles (country_code);
create index if not exists profiles_country_score_idx on public.profiles (country_code, score desc);

create or replace view public.country_leaderboard as
select country_code, sum(score)::bigint as total_score, count(*)::bigint as player_count,
  dense_rank() over (order by sum(score) desc) as rank
from public.profiles group by country_code;

create or replace function public.sync_profile(p_id uuid, p_username text, p_country_code char(2), p_score bigint, p_high_score bigint, p_best_combo integer, p_total_presses bigint)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if auth.uid() is null or auth.uid() <> p_id then raise exception 'not authorized'; end if;
  insert into public.profiles (id, username, country_code, score, best_combo, total_presses, updated_at)
  values (p_id, left(trim(p_username), 20), upper(p_country_code), greatest(p_score, 0), greatest(p_best_combo, 0), greatest(p_total_presses, 0), now())
  on conflict (id) do update set username = excluded.username, country_code = excluded.country_code, score = greatest(public.profiles.score, excluded.score), best_combo = greatest(public.profiles.best_combo, excluded.best_combo), total_presses = greatest(public.profiles.total_presses, excluded.total_presses), updated_at = now();
end; $$;

create or replace function public.get_player_rank(p_id uuid) returns bigint language sql stable security definer set search_path = public
as $$ select 1 + count(*) from public.profiles p where p.score > coalesce((select score from public.profiles where id = p_id), 0); $$;
create or replace function public.get_country_rank(p_country_code char(2)) returns bigint language sql stable security definer set search_path = public
as $$ select rank from public.country_leaderboard where country_code = upper(p_country_code) limit 1; $$;

alter table public.profiles enable row level security;
drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles" on public.profiles for select using (true);
drop policy if exists "Players can insert own profile" on public.profiles;
create policy "Players can insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Players can update own profile" on public.profiles;
create policy "Players can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke all on function public.sync_profile(uuid, text, char(2), bigint, bigint, integer, bigint) from public;
grant execute on function public.sync_profile(uuid, text, char(2), bigint, bigint, integer, bigint) to anon, authenticated;
grant select on public.profiles, public.country_leaderboard to anon, authenticated;
