-- Fix recursive RLS checks on group_members and tighten feed/group access.
-- This migration is safe to run multiple times.

create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_members_group_id_idx on public.group_members(group_id);

create or replace function public.is_group_member(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = coalesce(target_user_id, auth.uid())
  );
$$;

create or replace function public.can_access_completion(
  target_completion_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_completions tc
    where tc.id = target_completion_id
      and public.is_group_member(tc.group_id, coalesce(target_user_id, auth.uid()))
  );
$$;

create or replace function public.lookup_group_by_invite_code(code text)
returns table (
  id uuid,
  name text,
  invite_code text,
  member_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.invite_code,
    count(gm.id)::bigint as member_count
  from public.groups g
  left join public.group_members gm on gm.group_id = g.id
  where g.invite_code = code
  group by g.id, g.name, g.invite_code
  limit 1;
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

revoke all on function public.can_access_completion(uuid, uuid) from public;
grant execute on function public.can_access_completion(uuid, uuid) to authenticated;

revoke all on function public.lookup_group_by_invite_code(text) from public;
grant execute on function public.lookup_group_by_invite_code(text) to anon, authenticated;

drop policy if exists "Group members can view their groups" on public.groups;
drop policy if exists "Anyone can find group by invite code" on public.groups;

create policy "Group members can view their groups"
  on public.groups
  for select
  using (
    created_by = auth.uid()
    or public.is_group_member(id)
  );

drop policy if exists "Group members can view members" on public.group_members;

create policy "Group members can view members"
  on public.group_members
  for select
  using (
    auth.uid() = user_id
    or public.is_group_member(group_id)
  );

drop policy if exists "Group members can view progress" on public.challenge_progress;

create policy "Group members can view progress"
  on public.challenge_progress
  for select
  using (public.is_group_member(group_id));

drop policy if exists "Group members can view completions" on public.task_completions;

create policy "Group members can view completions"
  on public.task_completions
  for select
  using (public.is_group_member(group_id));

drop policy if exists "Group members can view reactions" on public.feed_reactions;
drop policy if exists "Authenticated users can react" on public.feed_reactions;

create policy "Group members can view reactions"
  on public.feed_reactions
  for select
  using (public.can_access_completion(completion_id));

create policy "Authenticated users can react"
  on public.feed_reactions
  for insert
  with check (
    auth.uid() = user_id
    and public.can_access_completion(completion_id)
  );

drop policy if exists "Group members can view comments" on public.feed_comments;
drop policy if exists "Authenticated users can comment" on public.feed_comments;

create policy "Group members can view comments"
  on public.feed_comments
  for select
  using (public.can_access_completion(completion_id));

create policy "Authenticated users can comment"
  on public.feed_comments
  for insert
  with check (
    auth.uid() = user_id
    and public.can_access_completion(completion_id)
  );
