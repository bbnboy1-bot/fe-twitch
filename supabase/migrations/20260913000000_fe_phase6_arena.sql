begin;

-- Phase 6: arena overlay.
--
-- active_pokes.arena holds a structured snapshot written by the worker:
--   { v: 1, fighters: [{ name, unitId, hp, maxHp, routed, damage }],
--     events: [{ id, type, at, ... }] }
-- The broadcast trigger ships it on the same overlay:<channel> topic the
-- HP card already listens to, so the arena page needs no new realtime wiring.
alter table public.active_pokes
  add column if not exists arena jsonb not null default '{}'::jsonb;

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
      'lastCatchAt', new.last_catch_at,
      'battleLog', new.battle_log,
      'arena', new.arena
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
  last_catch_poke, last_catch_player, last_catch_at, battle_log, arena
on public.active_pokes
for each row
execute function private.broadcast_active_poke_snapshot();

-- Worker replaces the whole arena object after every battlefield event.
create or replace function public.fe_arena_sync(p_channel text, p_arena jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.active_pokes
  set arena = coalesce(p_arena, '{}'::jsonb),
      updated_at = now()
  where channel = lower(trim(p_channel));
end;
$$;

revoke all on function public.fe_arena_sync(text, jsonb) from public, anon, authenticated;
grant execute on function public.fe_arena_sync(text, jsonb) to service_role;

-- Who wanders the arena between fights: the channel's most recent recruiters
-- and everything they own (the overlay picks each viewer's champion).
-- collections is already publicly readable, so anon access is fine.
create or replace function public.fe_arena_roster(p_channel text, p_limit integer default 40) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('user', r."user", 'units', r.units, 'at', r.last_at) order by r.last_at desc),
    '[]'::jsonb
  )
  from (
    select "user", to_jsonb(array_agg(poke order by created_at desc)) as units, max(created_at) as last_at
    from public.collections
    where channel = lower(trim(p_channel))
    group by "user"
    order by last_at desc
    limit greatest(1, least(coalesce(p_limit, 40), 200))
  ) r;
$$;

grant execute on function public.fe_arena_roster(text, integer) to anon, authenticated, service_role;

commit;
