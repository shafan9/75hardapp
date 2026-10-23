-- Apply as the database owner. No application rows are changed.
-- Group, membership, progress and completion writes use verified server APIs.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '20s';

-- Prevent a membership/progress write racing the preflight and policy cutover.
lock table public.profiles, public.groups, public.group_members,
  public.challenge_progress, public.task_completions, public.feed_comments,
  public.feed_reactions, public.user_achievements in share row exclusive mode;

-- The server has legacy progress-based membership recovery. Fail closed if
-- unverified historical progress could be promoted after the policy cutover.
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in (
      'profiles', 'groups', 'group_members', 'challenge_progress',
      'task_completions', 'feed_comments', 'feed_reactions', 'user_achievements'
    ) and not c.relrowsecurity
  ) then
    raise exception 'Expected row level security to be enabled before applying';
  end if;
  if exists (
    select 1 from public.challenge_progress p
    where not exists (
      select 1 from public.group_members m
      where m.user_id = p.user_id and m.group_id = p.group_id
    )
  ) then
    raise exception 'Unverified progress without membership: reconcile before applying';
  end if;
end $$;

create schema if not exists squad_private;
revoke all on schema squad_private from public, anon;
grant usage on schema squad_private to authenticated;

create or replace function squad_private.is_group_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = target_group_id and m.user_id = auth.uid()
  );
$$;

create or replace function squad_private.can_access_completion(target_completion_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.task_completions c
    where c.id = target_completion_id
      and squad_private.is_group_member(c.group_id)
  );
$$;

create or replace function squad_private.can_view_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select target_profile_id = auth.uid() or exists (
    select 1 from public.group_members viewer
    join public.group_members member on member.group_id = viewer.group_id
    where viewer.user_id = auth.uid() and member.user_id = target_profile_id
  );
$$;

revoke all on function squad_private.is_group_member(uuid) from public, anon;
revoke all on function squad_private.can_access_completion(uuid) from public, anon;
revoke all on function squad_private.can_view_profile(uuid) from public, anon;
grant execute on function squad_private.is_group_member(uuid) to authenticated;
grant execute on function squad_private.can_access_completion(uuid) to authenticated;
grant execute on function squad_private.can_view_profile(uuid) to authenticated;

-- Older installations may have exposed caller-selected identity helpers.
-- Current invite previews use the server route, not a public RPC.
do $$
declare signature text;
begin
  foreach signature in array array[
    'public.is_group_member(uuid,uuid)',
    'public.can_access_completion(uuid,uuid)',
    'public.lookup_group_by_invite_code(text)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', signature);
    end if;
  end loop;
end $$;

-- Replace all policies on this boundary so an older permissive policy cannot
-- OR itself with a stricter policy. Other notification/settings tables stay as-is.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'profiles', 'groups', 'group_members', 'challenge_progress',
      'task_completions', 'feed_comments', 'feed_reactions', 'user_achievements'
    )
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

revoke insert, update, delete, truncate, references, trigger
  on public.groups, public.group_members, public.challenge_progress, public.task_completions
  from anon, authenticated;

create policy "Squad profiles are visible to self and co-members"
  on public.profiles for select to authenticated
  using (squad_private.can_view_profile(id));
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Group members can view their groups"
  on public.groups for select to authenticated
  using (created_by = auth.uid() or squad_private.is_group_member(id));
create policy "Group members can view members"
  on public.group_members for select to authenticated
  using (squad_private.is_group_member(group_id));
create policy "Group members can view progress"
  on public.challenge_progress for select to authenticated
  using (squad_private.is_group_member(group_id));
create policy "Group members can view completions"
  on public.task_completions for select to authenticated
  using (squad_private.is_group_member(group_id));

create policy "Group members can view comments"
  on public.feed_comments for select to authenticated
  using (squad_private.can_access_completion(completion_id));
create policy "Members can add own comments"
  on public.feed_comments for insert to authenticated
  with check (auth.uid() = user_id and squad_private.can_access_completion(completion_id));
create policy "Members can delete own comments"
  on public.feed_comments for delete to authenticated
  using (auth.uid() = user_id and squad_private.can_access_completion(completion_id));

create policy "Group members can view reactions"
  on public.feed_reactions for select to authenticated
  using (squad_private.can_access_completion(completion_id));
create policy "Members can add own reactions"
  on public.feed_reactions for insert to authenticated
  with check (auth.uid() = user_id and squad_private.can_access_completion(completion_id));
create policy "Members can update own reactions"
  on public.feed_reactions for update to authenticated
  using (auth.uid() = user_id and squad_private.can_access_completion(completion_id))
  with check (auth.uid() = user_id and squad_private.can_access_completion(completion_id));
create policy "Members can delete own reactions"
  on public.feed_reactions for delete to authenticated
  using (auth.uid() = user_id and squad_private.can_access_completion(completion_id));

create policy "Users can view own achievements"
  on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "Users can earn achievements"
  on public.user_achievements for insert to authenticated with check (auth.uid() = user_id);

create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_members_group_id_idx on public.group_members(group_id);
notify pgrst, 'reload schema';
commit;
