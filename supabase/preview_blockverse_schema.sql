-- BLOCKVERSE-only migration preview. DO NOT apply to NgajiYuk until backup + owner approval.
-- Namespaced bv_* objects avoid changing existing Supabase application tables.
create table if not exists public.bv_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(16) not null default 'Builder0000',
  avatar jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint bv_profiles_name check(display_name ~ '^[A-Za-z0-9_-]{3,16}$')
);
create table if not exists public.bv_worlds (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  world_key text not null default 'my_island',
  title varchar(40) not null default 'My Builder Island',
  visibility text not null default 'private' check (visibility in ('private','unlisted')),
  revision integer not null default 1 check (revision between 1 and 1000000),
  objects jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,world_key),
  constraint bv_worlds_object_shape check(jsonb_typeof(objects)='array' and jsonb_array_length(objects) between 1 and 300),
  constraint bv_world_key_check check(world_key='my_island')
);
create index if not exists bv_worlds_owner_idx on public.bv_worlds(user_id);
alter table public.bv_profiles enable row level security;
alter table public.bv_worlds enable row level security;
revoke all on public.bv_profiles,public.bv_worlds from anon;
grant select,insert,update on public.bv_profiles to authenticated;
grant select,insert,update on public.bv_worlds to authenticated;
drop policy if exists bv_profile_owner_read on public.bv_profiles;
drop policy if exists bv_profile_owner_insert on public.bv_profiles;
drop policy if exists bv_profile_owner_update on public.bv_profiles;
create policy bv_profile_owner_read on public.bv_profiles for select to authenticated
 using (user_id=(select auth.uid()));
create policy bv_profile_owner_insert on public.bv_profiles for insert to authenticated
 with check(user_id=(select auth.uid()));
create policy bv_profile_owner_update on public.bv_profiles for update to authenticated
 using (user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists bv_world_owner_read on public.bv_worlds;
drop policy if exists bv_world_owner_insert on public.bv_worlds;
drop policy if exists bv_world_owner_update on public.bv_worlds;
create policy bv_world_owner_read on public.bv_worlds for select to authenticated
 using (user_id=(select auth.uid()));
create policy bv_world_owner_insert on public.bv_worlds for insert to authenticated
 with check(user_id=(select auth.uid()));
create policy bv_world_owner_update on public.bv_worlds for update to authenticated
 using (user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Transactional compare-and-swap revision. SECURITY INVOKER preserves RLS.
create or replace function public.bv_save_world(
 p_world_key text,p_expected_revision integer,p_title text,p_visibility text,p_objects jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_owner uuid := auth.uid();
 v_rev integer;
begin
 if v_owner is null or p_world_key <> 'my_island'
  or p_expected_revision < 1 or p_title is null or length(p_title) > 40
  or p_visibility not in ('private','unlisted')
  or jsonb_typeof(p_objects) <> 'array'
  or jsonb_array_length(p_objects) not between 1 and 300 then
   raise exception 'invalid world payload' using errcode='22023';
 end if;
 -- Avoid lost updates when two tabs attempt a simultaneous first insert.
 insert into public.bv_worlds(user_id,world_key,title,visibility,revision,objects)
 select v_owner,p_world_key,p_title,p_visibility,2,p_objects
 where p_expected_revision=1
 on conflict(user_id,world_key) do nothing
 returning revision into v_rev;
 if v_rev is null then
  update public.bv_worlds
  set title=p_title,visibility=p_visibility,objects=p_objects,revision=revision+1,updated_at=now()
  where user_id=v_owner and world_key=p_world_key and revision=p_expected_revision
  returning revision into v_rev;
 end if;
 if v_rev is null then return jsonb_build_object('ok',false,'reason','conflict'); end if;
 return jsonb_build_object('ok',true,'revision',v_rev);
end;
$$;
revoke all on function public.bv_save_world(text,integer,text,text,jsonb) from public,anon;
grant execute on function public.bv_save_world(text,integer,text,text,jsonb) to authenticated;
