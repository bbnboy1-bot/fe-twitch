begin;

-- Phase 9: per-channel encounter timing and wandering creatures.

-- ---------------------------------------------------------------------------
-- Timing settings live beside the realm names. Defaults match the old
-- hard-coded behaviour (boss every 30-45 min) plus creatures every 5-10 min.
-- ---------------------------------------------------------------------------
alter table public.channel_settings
  add column if not exists boss_min_minutes integer not null default 30,
  add column if not exists boss_max_minutes integer not null default 45,
  add column if not exists creatures_enabled boolean not null default true,
  add column if not exists creature_min_minutes integer not null default 5,
  add column if not exists creature_max_minutes integer not null default 10;

alter table public.channel_settings drop constraint if exists channel_settings_timing_check;
alter table public.channel_settings add constraint channel_settings_timing_check check (
  boss_min_minutes between 5 and 240
  and boss_max_minutes between boss_min_minutes and 240
  and creature_min_minutes between 1 and 60
  and creature_max_minutes between creature_min_minutes and 60
);

create or replace function public.fe_set_game_settings(
  p_boss_min integer,
  p_boss_max integer,
  p_creatures boolean,
  p_creature_min integer,
  p_creature_max integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text;
begin
  select lower(trim(a.channel)) into v_channel
  from public.accounts a
  where a.user_id = auth.uid()
  limit 1;
  if v_channel is null then
    raise exception 'No streamer account for this user';
  end if;

  insert into public.channel_settings (
    channel, boss_min_minutes, boss_max_minutes, creatures_enabled, creature_min_minutes, creature_max_minutes, updated_at
  )
  values (v_channel, p_boss_min, p_boss_max, coalesce(p_creatures, true), p_creature_min, p_creature_max, now())
  on conflict (channel) do update
    set boss_min_minutes = excluded.boss_min_minutes,
        boss_max_minutes = excluded.boss_max_minutes,
        creatures_enabled = excluded.creatures_enabled,
        creature_min_minutes = excluded.creature_min_minutes,
        creature_max_minutes = excluded.creature_max_minutes,
        updated_at = now();

  return jsonb_build_object('channel', v_channel);
end;
$$;

revoke all on function public.fe_set_game_settings(integer, integer, boolean, integer, integer) from public, anon;
grant execute on function public.fe_set_game_settings(integer, integer, boolean, integer, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Attack: creatures (poke like 'creature-%') are slain, not recruited. No army
-- row, no "last recruit" update, and the overlay event is 'slain'.
-- ---------------------------------------------------------------------------
create or replace function public.fe_attack_encounter(
  p_channel text,
  p_damage integer,
  p_twitch_id text,
  p_username text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text := lower(nullif(trim(p_channel), ''));
  tid text := nullif(trim(p_twitch_id), '');
  usr text := lower(nullif(trim(p_username), ''));
  e public.active_pokes%rowtype;
  remaining integer;
begin
  if c is null or tid is null or usr is null or p_damage is null or p_damage < 1 or p_damage > 999 then
    raise exception 'Invalid attack input' using errcode = '22023';
  end if;

  select * into e from public.active_pokes where channel = c for update;
  if not found or e.kind = 'lull' or e.health <= 0 then
    return jsonb_build_object('outcome', 'none');
  end if;

  remaining := e.health - p_damage;

  if remaining > 0 then
    update public.active_pokes
    set health = remaining, updated_at = now(),
        last_event_kind = 'hit', last_event_player = usr, last_event_damage = p_damage, last_event_at = now()
    where id = e.id;
    return jsonb_build_object('outcome', 'hit', 'damage', p_damage, 'health', remaining,
                              'maxHealth', e.max_health, 'poke', e.poke, 'kind', e.kind);
  end if;

  if e.poke like 'creature-%' then
    update public.active_pokes
    set health = 0, kind = 'lull', expires_at = null, updated_at = now(),
        last_event_kind = 'slain', last_event_player = usr, last_event_damage = p_damage, last_event_at = now()
    where id = e.id;
    return jsonb_build_object('outcome', 'caught', 'damage', p_damage, 'poke', e.poke, 'kind', e.kind,
                              'maxHealth', e.max_health, 'slain', true);
  end if;

  insert into public.collections ("user", channel, poke, owner_twitch_id)
  values (usr, c, e.poke, tid);

  update public.active_pokes
  set health = 0, kind = 'lull', expires_at = null, updated_at = now(),
      last_event_kind = 'caught', last_event_player = usr, last_event_damage = p_damage, last_event_at = now(),
      last_catch_poke = e.poke, last_catch_player = usr, last_catch_at = now()
  where id = e.id;

  return jsonb_build_object('outcome', 'caught', 'damage', p_damage, 'poke', e.poke, 'kind', e.kind,
                            'maxHealth', e.max_health, 'lastCatchPoke', e.poke, 'lastCatchPlayer', usr);
end;
$$;

-- The realm dropdown was removed from the site; its channel list goes too.
drop function if exists public.fe_list_realms();

commit;
