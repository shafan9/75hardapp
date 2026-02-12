alter table public.user_settings
  add column if not exists in_app_enabled boolean default true,
  add column if not exists sms_enabled boolean default false,
  add column if not exists phone_e164 text,
  add column if not exists timezone text default 'UTC';

update public.user_settings
set
  in_app_enabled = coalesce(in_app_enabled, true),
  sms_enabled = coalesce(sms_enabled, false),
  timezone = coalesce(nullif(timezone, ''), 'UTC');

create table if not exists public.push_subscriptions (
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

drop policy if exists "Users can view own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can create own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);

create policy "Users can create own push subscriptions"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can update own push subscriptions"
  on public.push_subscriptions for update using (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

create table if not exists public.in_app_notifications (
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

drop policy if exists "Users can view own in-app notifications" on public.in_app_notifications;
drop policy if exists "Users can update own in-app notifications" on public.in_app_notifications;
drop policy if exists "Users can insert own in-app notifications" on public.in_app_notifications;

create policy "Users can view own in-app notifications"
  on public.in_app_notifications for select using (auth.uid() = user_id);

create policy "Users can update own in-app notifications"
  on public.in_app_notifications for update using (auth.uid() = user_id);

create policy "Users can insert own in-app notifications"
  on public.in_app_notifications for insert with check (auth.uid() = user_id);

create index if not exists in_app_notifications_user_created_idx
  on public.in_app_notifications(user_id, created_at desc);

create table if not exists public.notification_deliveries (
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

drop policy if exists "Users can view own notification deliveries" on public.notification_deliveries;
drop policy if exists "Users can insert own notification deliveries" on public.notification_deliveries;

create policy "Users can view own notification deliveries"
  on public.notification_deliveries for select using (auth.uid() = user_id);

create policy "Users can insert own notification deliveries"
  on public.notification_deliveries for insert with check (auth.uid() = user_id);

create index if not exists notification_deliveries_user_date_idx
  on public.notification_deliveries(user_id, reminder_date desc);

alter publication supabase_realtime add table public.in_app_notifications;
