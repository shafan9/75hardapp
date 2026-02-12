export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profiles?: Profile;
}

export interface ChallengeProgress {
  id: string;
  user_id: string;
  group_id: string;
  start_date: string;
  current_day: number;
  is_active: boolean;
  last_completed_date: string | null;
  created_at: string;
}

export interface CustomTask {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  group_id: string;
  task_key: string;
  date: string;
  note: string | null;
  completed_at: string;
  profiles?: Profile;
}

export interface FeedReaction {
  id: string;
  completion_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  profiles?: Profile;
}

export interface FeedComment {
  id: string;
  completion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_e164: string | null;
  timezone: string;
  reminder_time: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type NotificationChannel = "in_app" | "push" | "email" | "sms";

export interface NotificationDelivery {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  reminder_date: string;
  status: "sent" | "failed" | "skipped";
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface MemberDayStatus {
  profile: Profile;
  completedTasks: string[];
  currentDay: number;
  progress: ChallengeProgress | null;
}
