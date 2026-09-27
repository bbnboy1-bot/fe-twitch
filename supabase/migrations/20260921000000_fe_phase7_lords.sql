begin;

-- Phase 7: lords, chosen champions, realm names.

-- ---------------------------------------------------------------------------
-- Realm names: per-channel naming mode + custom lord names. Public read so the
-- overlays and leaderboard can resolve names; writes only by the channel owner
-- through fe_set_channel_settings.
-- ---------------------------------------------------------------------------
create table if not exists public.channel_settings (
  channel text primary key,
  unit_name_mode text not null default 'official' check (unit_name_mode in ('official', 'original')),
  unit_names jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.channel_settings enable row level security;
drop policy if exists "channel settings are readable" on public.channel_settings;
create policy "channel settings are readable" on public.channel_settings for select using (true);
revoke all on table public.channel_settings from public, anon, authenticated;
grant select on table public.channel_settings to anon, authenticated;
grant all on table public.channel_settings to service_role;

create or replace function public.fe_set_channel_settings(p_mode text, p_names jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text;
begin
  select a.channel into v_channel
  from public.accounts a
  where a.user_id = auth.uid()
  limit 1;
  if v_channel is null then
    raise exception 'No streamer account for this user';
  end if;
  if p_mode not in ('official', 'original') then
    raise exception 'Invalid name mode';
  end if;

  insert into public.channel_settings (channel, unit_name_mode, unit_names, updated_at)
  values (lower(trim(v_channel)), p_mode, coalesce(p_names, '{}'::jsonb), now())
  on conflict (channel) do update
    set unit_name_mode = excluded.unit_name_mode,
        unit_names = excluded.unit_names,
        updated_at = now();

  return jsonb_build_object('channel', v_channel, 'mode', p_mode);
end;
$$;

revoke all on function public.fe_set_channel_settings(text, jsonb) from public, anon;
grant execute on function public.fe_set_channel_settings(text, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Chosen champion: which owned unit fights for a viewer. Null/absent = strongest.
-- ---------------------------------------------------------------------------
create table if not exists public.player_champions (
  channel text not null,
  "user" text not null,
  unit_id text,
  updated_at timestamptz not null default now(),
  primary key (channel, "user")
);

alter table public.player_champions enable row level security;
drop policy if exists "champions are readable" on public.player_champions;
create policy "champions are readable" on public.player_champions for select using (true);
revoke all on table public.player_champions from public, anon, authenticated;
grant select on table public.player_champions to anon, authenticated;
grant all on table public.player_champions to service_role;

-- Sets the champion. Returns false if the viewer does not own that unit.
create or replace function public.fe_set_champion(p_channel text, p_user text, p_unit text) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text := lower(trim(p_channel));
  v_user text := lower(trim(p_user));
begin
  if p_unit is null then
    insert into public.player_champions (channel, "user", unit_id, updated_at)
    values (v_channel, v_user, null, now())
    on conflict (channel, "user") do update set unit_id = null, updated_at = now();
    return true;
  end if;
  if not exists (select 1 from public.collections c where c.channel = v_channel and c."user" = v_user and c.poke = p_unit) then
    return false;
  end if;
  insert into public.player_champions (channel, "user", unit_id, updated_at)
  values (v_channel, v_user, p_unit, now())
  on conflict (channel, "user") do update set unit_id = excluded.unit_id, updated_at = now();
  return true;
end;
$$;

revoke all on function public.fe_set_champion(text, text, text) from public, anon, authenticated;
grant execute on function public.fe_set_champion(text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Choose (or swap) a lord. A viewer holds exactly one lord-* unit; picking a new
-- one replaces the old and makes the new lord the champion.
-- Returns { previous: text|null, first: boolean }.
-- ---------------------------------------------------------------------------
create or replace function public.fe_choose_lord(p_channel text, p_user text, p_lord text, p_twitch_id text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text := lower(trim(p_channel));
  v_user text := lower(trim(p_user));
  v_prev text;
  v_first boolean;
begin
  if p_lord is null or p_lord not like 'lord-%' then
    raise exception 'Not a lord';
  end if;

  select c.poke into v_prev
  from public.collections c
  where c.channel = v_channel and c."user" = v_user and c.poke like 'lord-%'
  order by c.created_at desc
  limit 1;

  v_first := not exists (select 1 from public.collections c where c.channel = v_channel and c."user" = v_user);

  if v_prev = p_lord then
    return jsonb_build_object('previous', v_prev, 'first', false, 'same', true);
  end if;

  delete from public.collections c
  where c.channel = v_channel and c."user" = v_user and c.poke like 'lord-%';

  insert into public.collections ("user", channel, poke, owner_twitch_id)
  values (v_user, v_channel, p_lord, nullif(trim(p_twitch_id), ''));

  insert into public.player_champions (channel, "user", unit_id, updated_at)
  values (v_channel, v_user, p_lord, now())
  on conflict (channel, "user") do update set unit_id = excluded.unit_id, updated_at = now();

  return jsonb_build_object('previous', v_prev, 'first', v_first, 'same', false);
end;
$$;

revoke all on function public.fe_choose_lord(text, text, text, text) from public, anon, authenticated;
grant execute on function public.fe_choose_lord(text, text, text, text) to service_role;

commit;
