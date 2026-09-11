begin;

-- Phase 5: battle log for the overlay + leaderboards.

-- Last few battle lines (raids, routs, crits, boss results) so the overlay can
-- show the fight, not just the enemy HP bar. Worker appends via fe_log_battle.
alter table public.active_pokes
  add column if not exists battle_log jsonb not null default '[]'::jsonb;

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
      'battleLog', new.battle_log
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
  last_catch_poke, last_catch_player, last_catch_at, battle_log
on public.active_pokes
for each row
execute function private.broadcast_active_poke_snapshot();

-- Append one line, keeping the newest 6.
create or replace function public.fe_log_battle(p_channel text, p_line text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.active_pokes
  set battle_log = (
        select coalesce(jsonb_agg(x order by ord), '[]'::jsonb)
        from (
          select x, ord from jsonb_array_elements(battle_log || jsonb_build_array(p_line)) with ordinality as t(x, ord)
          order by ord desc limit 6
        ) s
      ),
      updated_at = now()
  where channel = lower(trim(p_channel));
end;
$$;

revoke all on function public.fe_log_battle(text, text) from public, anon, authenticated;
grant execute on function public.fe_log_battle(text, text) to service_role;

-- Per-channel leaderboards: richest, biggest armies, warlord slayers.
-- wallets/collections are already publicly readable, so this is safe for anon.
create or replace function public.fe_leaderboard(p_channel text, p_limit integer default 10) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'gold', coalesce((
      select jsonb_agg(jsonb_build_object('user', w."user", 'value', w.gold) order by w.gold desc, w."user")
      from (select "user", gold from public.wallets where channel = lower(trim(p_channel)) and gold > 0
            order by gold desc, "user" limit greatest(1, least(p_limit, 50))) w
    ), '[]'::jsonb),
    'army', coalesce((
      select jsonb_agg(jsonb_build_object('user', a."user", 'value', a.n) order by a.n desc, a."user")
      from (select "user", count(*) as n from public.collections where channel = lower(trim(p_channel))
            group by "user" order by n desc, "user" limit greatest(1, least(p_limit, 50))) a
    ), '[]'::jsonb),
    'warlords', coalesce((
      select jsonb_agg(jsonb_build_object('user', b."user", 'value', b.n) order by b.n desc, b."user")
      from (select "user", count(*) as n from public.collections
            where channel = lower(trim(p_channel)) and poke like 'warlord-%'
            group by "user" order by n desc, "user" limit greatest(1, least(p_limit, 50))) b
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.fe_leaderboard(text, integer) to anon, authenticated, service_role;

commit;
