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
  push_enabled: boolean;
  email_enabled: boolean;
  reminder_time: string;
}

export interface MemberDayStatus {
  profile: Profile;
  completedTasks: string[];
  currentDay: number;
  progress: ChallengeProgress | null;
}
