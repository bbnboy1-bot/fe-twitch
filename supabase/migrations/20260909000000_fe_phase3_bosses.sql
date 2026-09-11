begin;

-- Phase 3: announced spawns, stat-scaled enemy HP, timed bosses.
-- active_pokes gains a max HP, an encounter kind (foe | boss | lull) and a
-- boss expiry. During a lull the row keeps the last unit id (column is not
-- null) with health 0 and kind 'lull' — the overlay shows "the field is quiet".

alter table public.active_pokes
  add column if not exists max_health integer not null default 50 check (max_health > 0),
  add column if not exists kind text not null default 'foe' check (kind in ('foe', 'boss', 'lull')),
  add column if not exists expires_at timestamptz;

-- Broadcast the new fields to the overlay.
create or replace function private.broadcast_active_poke_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'health', new.health,
      'maxHealth', new.max_health,
      'kind', new.kind,
      'expiresAt', new.expires_at,
      'poke', new.poke,
      'updatedAt', new.updated_at,
      'lastEventKind', new.last_event_kind,
      'lastEventPlayer', new.last_event_player,
      'lastEventDamage', new.last_event_damage,
      'lastEventAt', new.last_event_at,
      'lastCatchPoke', new.last_catch_poke,
      'lastCatchPlayer', new.last_catch_player,
      'lastCatchAt', new.last_catch_at
    ),
    'snapshot',
    'overlay:' || new.channel,
    false
  );
  return null;
end;
$$;

drop trigger if exists broadcast_active_poke_snapshot on public.active_pokes;
create trigger broadcast_active_poke_snapshot
after insert or update of
  health, max_health, kind, expires_at, poke, updated_at,
  last_event_kind, last_event_player, last_event_damage, last_event_at,
  last_catch_poke, last_catch_player, last_catch_at
on public.active_pokes
for each row
execute function private.broadcast_active_poke_snapshot();

-- Put an enemy (foe or boss) on the field at full HP.
create or replace function public.fe_spawn_encounter(
  p_channel text,
  p_poke text,
  p_max_health integer,
  p_kind text,
  p_duration_seconds integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text := lower(nullif(trim(p_channel), ''));
  u text := lower(nullif(trim(p_poke), ''));
begin
  if c is null or u is null or p_max_health is null or p_max_health < 1 or p_kind not in ('foe', 'boss') then
    raise exception 'Invalid spawn input' using errcode = '22023';
  end if;

  insert into public.active_pokes (channel, poke, health, max_health, kind, expires_at,
                                   last_event_kind, last_event_player, last_event_damage, last_event_at)
  values (c, u, p_max_health, p_max_health, p_kind,
          case when p_duration_seconds is null then null else now() + make_interval(secs => p_duration_seconds) end,
          'spawn', null, null, now())
  on conflict (channel) do update
    set poke = excluded.poke,
        health = excluded.health,
        max_health = excluded.max_health,
        kind = excluded.kind,
        expires_at = excluded.expires_at,
        updated_at = now(),
        last_event_kind = 'spawn',
        last_event_player = null,
        last_event_damage = null,
        last_event_at = now();
end;
$$;

-- Player hit for arbitrary damage. On defeat the finisher recruits the unit and
-- the field goes quiet (kind = 'lull') until the worker spawns the next enemy.
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

-- Boss escaped / field cleared without a recruit.
create or replace function public.fe_end_encounter(p_channel text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.active_pokes
  set health = 0, kind = 'lull', expires_at = null, updated_at = now(),
      last_event_kind = 'fled', last_event_player = null, last_event_damage = null, last_event_at = now()
  where channel = lower(trim(p_channel));
end;
$$;

-- Consume one use of the newest heal staff specifically (not whatever is equipped).
create or replace function public.fe_use_staff(p_channel text, p_user text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
begin
  select id, uses into w from public.weapons
  where "user" = p_user and channel = p_channel and kind = 'staff' and uses > 0
  order by created_at desc limit 1 for update;
  if w is null then
    return null;
  end if;
  update public.weapons set uses = uses - 1, updated_at = now() where id = w.id;
  return jsonb_build_object('kind', 'staff', 'uses', w.uses - 1);
end;
$$;

revoke all on function public.fe_spawn_encounter(text, text, integer, text, integer) from public, anon, authenticated;
revoke all on function public.fe_attack_encounter(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.fe_end_encounter(text) from public, anon, authenticated;
revoke all on function public.fe_use_staff(text, text) from public, anon, authenticated;
grant execute on function public.fe_spawn_encounter(text, text, integer, text, integer) to service_role;
grant execute on function public.fe_attack_encounter(text, integer, text, text) to service_role;
grant execute on function public.fe_end_encounter(text) to service_role;
grant execute on function public.fe_use_staff(text, text) to service_role;

commit;
