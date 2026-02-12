-- 75 Squad Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Player'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

create policy "Group members can view their groups"
  on public.groups for select using (
    id in (select group_id from public.group_members where user_id = auth.uid())
    or created_by = auth.uid()
  );

create policy "Authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = created_by);

-- Allow anyone to read groups by invite code (for joining)
create policy "Anyone can find group by invite code"
  on public.groups for select using (true);

-- Group Members
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Group members can view members"
  on public.group_members for select using (
    group_id in (select group_id from public.group_members gm where gm.user_id = auth.uid())
  );

create policy "Authenticated users can join groups"
  on public.group_members for insert with check (auth.uid() = user_id);

-- Challenge Progress
create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  start_date date not null default current_date,
  current_day int default 0,
  is_active boolean default true,
  last_completed_date date,
  created_at timestamptz default now(),
  unique(user_id, group_id)
);

alter table public.challenge_progress enable row level security;

create policy "Group members can view progress"
  on public.challenge_progress for select using (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can manage own progress"
  on public.challenge_progress for insert with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.challenge_progress for update using (auth.uid() = user_id);

-- Custom Tasks
create table public.custom_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  emoji text default '⭐',
  created_at timestamptz default now()
);

alter table public.custom_tasks enable row level security;

create policy "Users can view own custom tasks"
  on public.custom_tasks for select using (auth.uid() = user_id);

create policy "Users can create custom tasks"
  on public.custom_tasks for insert with check (auth.uid() = user_id);

create policy "Users can delete own custom tasks"
  on public.custom_tasks for delete using (auth.uid() = user_id);

-- Task Completions
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  task_key text not null,
  date date not null default current_date,
  note text,
  completed_at timestamptz default now(),
  unique(user_id, group_id, task_key, date)
);

alter table public.task_completions enable row level security;

create policy "Group members can view completions"
  on public.task_completions for select using (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can create own completions"
  on public.task_completions for insert with check (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.task_completions for delete using (auth.uid() = user_id);

-- Feed Reactions
create table public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid references public.task_completions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text default '🔥',
  created_at timestamptz default now(),
  unique(completion_id, user_id)
);

alter table public.feed_reactions enable row level security;

create policy "Group members can view reactions"
  on public.feed_reactions for select using (true);

create policy "Authenticated users can react"
  on public.feed_reactions for insert with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.feed_reactions for delete using (auth.uid() = user_id);

-- Feed Comments
create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid references public.task_completions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.feed_comments enable row level security;

create policy "Group members can view comments"
  on public.feed_comments for select using (true);

create policy "Authenticated users can comment"
  on public.feed_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.feed_comments for delete using (auth.uid() = user_id);

-- User Achievements
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz default now(),
  unique(user_id, achievement_key)
);

alter table public.user_achievements enable row level security;

create policy "Anyone can view achievements"
  on public.user_achievements for select using (true);

create policy "Users can earn achievements"
  on public.user_achievements for insert with check (auth.uid() = user_id);

-- User Settings
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  in_app_enabled boolean default true,
  push_enabled boolean default false,
  email_enabled boolean default true,
  sms_enabled boolean default false,
  phone_e164 text,
  timezone text default 'UTC',
  reminder_time time default '21:00',
  created_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);

create policy "Users can create own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

-- Web Push Subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);

create policy "Users can create own push subscriptions"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can update own push subscriptions"
  on public.push_subscriptions for update using (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- In-App Notifications
create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null default 'reminder',
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.in_app_notifications enable row level security;

create policy "Users can view own in-app notifications"
  on public.in_app_notifications for select using (auth.uid() = user_id);

create policy "Users can update own in-app notifications"
  on public.in_app_notifications for update using (auth.uid() = user_id);

create policy "Users can insert own in-app notifications"
  on public.in_app_notifications for insert with check (auth.uid() = user_id);

create index in_app_notifications_user_created_idx
  on public.in_app_notifications(user_id, created_at desc);

-- Notification Delivery Dedupe Log
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'push', 'email', 'sms')),
  reminder_date date not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  created_at timestamptz default now(),
  unique(user_id, channel, reminder_date)
);

alter table public.notification_deliveries enable row level security;

create policy "Users can view own notification deliveries"
  on public.notification_deliveries for select using (auth.uid() = user_id);

create policy "Users can insert own notification deliveries"
  on public.notification_deliveries for insert with check (auth.uid() = user_id);

create index notification_deliveries_user_date_idx
  on public.notification_deliveries(user_id, reminder_date desc);

-- Enable realtime for key tables
alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.feed_reactions;
alter publication supabase_realtime add table public.feed_comments;
alter publication supabase_realtime add table public.in_app_notifications;
