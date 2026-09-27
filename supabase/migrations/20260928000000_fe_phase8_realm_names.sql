begin;

-- Phase 8: four lords were renamed so no two units share an original name
-- (Sable/Aldric/Brannoc/Caelan already existed in the roster). Carry over any
-- rows created under the old ids.
update public.collections set poke = 'lord-wren' where poke = 'lord-sable';
update public.collections set poke = 'lord-anselm' where poke = 'lord-aldric';
update public.collections set poke = 'lord-hadrian' where poke = 'lord-brannoc';
update public.collections set poke = 'lord-cassian' where poke = 'lord-caelan';
update public.player_champions set unit_id = 'lord-wren' where unit_id = 'lord-sable';
update public.player_champions set unit_id = 'lord-anselm' where unit_id = 'lord-aldric';
update public.player_champions set unit_id = 'lord-hadrian' where unit_id = 'lord-brannoc';
update public.player_champions set unit_id = 'lord-cassian' where unit_id = 'lord-caelan';
update public.active_pokes set poke = 'lord-wren' where poke = 'lord-sable';

-- Realms: the public list of channels running the game, for the site's realm
-- picker. Only channel names (public Twitch logins) are exposed.
create or replace function public.fe_list_realms() returns table(channel text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct lower(a.channel) as channel
  from public.accounts a
  where a.channel is not null and a.channel <> ''
  order by 1;
$$;

grant execute on function public.fe_list_realms() to anon, authenticated, service_role;

commit;
