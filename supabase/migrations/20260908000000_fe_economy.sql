begin;

-- Gold wallets, scoped per channel like collections.
create table if not exists public.wallets (
  id uuid primary key default extensions.uuid_generate_v4(),
  "user" text not null,
  channel text not null,
  gold integer not null default 0 check (gold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique ("user", channel)
);

-- Purchased weapons with durability (Hudson: 30 uses each).
create table if not exists public.weapons (
  id uuid primary key default extensions.uuid_generate_v4(),
  "user" text not null,
  channel text not null,
  kind text not null check (kind in ('sword','lance','axe','tome','staff')),
  uses smallint not null default 30 check (uses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weapons_owner_idx on public.weapons ("user", channel);

alter table public.wallets enable row level security;
alter table public.weapons enable row level security;

-- Readable by everyone (leaderboards / collection pages), writable only via RPCs.
create policy "wallets are readable" on public.wallets for select using (true);
create policy "weapons are readable" on public.weapons for select using (true);

-- Atomically add gold, creating the wallet on first earn. Returns new balance.
create or replace function public.fe_earn_gold(
  p_channel text,
  p_user text,
  p_amount integer
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_gold integer;
begin
  insert into public.wallets ("user", channel, gold)
  values (p_user, p_channel, greatest(p_amount, 0))
  on conflict ("user", channel)
  do update set gold = public.wallets.gold + greatest(p_amount, 0),
                updated_at = now()
  returning gold into new_gold;
  return new_gold;
end;
$$;

-- Atomically deduct gold and grant a weapon. Returns {ok, gold}.
create or replace function public.fe_buy_weapon(
  p_channel text,
  p_user text,
  p_kind text,
  p_price integer,
  p_uses integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_gold integer;
begin
  select gold into current_gold
  from public.wallets
  where "user" = p_user and channel = p_channel
  for update;

  if current_gold is null or current_gold < p_price then
    return jsonb_build_object('ok', false, 'gold', coalesce(current_gold, 0));
  end if;

  update public.wallets
  set gold = gold - p_price, updated_at = now()
  where "user" = p_user and channel = p_channel
  returning gold into current_gold;

  insert into public.weapons ("user", channel, kind, uses)
  values (p_user, p_channel, p_kind, p_uses);

  return jsonb_build_object('ok', true, 'gold', current_gold);
end;
$$;

-- Consume one use of the newest weapon that still has durability.
-- Returns {kind, uses} (uses AFTER decrement) or null if unarmed.
create or replace function public.fe_use_equipped_weapon(
  p_channel text,
  p_user text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
begin
  select id, kind, uses into w
  from public.weapons
  where "user" = p_user and channel = p_channel and uses > 0
  order by created_at desc
  limit 1
  for update;

  if w is null then
    return null;
  end if;

  update public.weapons
  set uses = uses - 1, updated_at = now()
  where id = w.id;

  return jsonb_build_object('kind', w.kind, 'uses', w.uses - 1);
end;
$$;

revoke all on function public.fe_earn_gold(text, text, integer) from public, anon, authenticated;
revoke all on function public.fe_buy_weapon(text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.fe_use_equipped_weapon(text, text) from public, anon, authenticated;
grant execute on function public.fe_earn_gold(text, text, integer) to service_role;
grant execute on function public.fe_buy_weapon(text, text, text, integer, integer) to service_role;
grant execute on function public.fe_use_equipped_weapon(text, text) to service_role;

commit;
