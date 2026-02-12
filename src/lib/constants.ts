export const DEFAULT_TASKS = [
  {
    key: "workout_outdoor",
    label: "Outdoor Workout",
    emoji: "🏃",
    description: "45-minute workout (outdoors)",
  },
  {
    key: "workout_indoor",
    label: "Second Workout",
    emoji: "💪",
    description: "45-minute workout",
  },
  {
    key: "diet",
    label: "Follow Diet",
    emoji: "🥗",
    description: "No alcohol, no cheat meals",
  },
  {
    key: "water",
    label: "Gallon of Water",
    emoji: "💧",
    description: "Drink 1 gallon of water",
  },
  {
    key: "reading",
    label: "Read 10 Pages",
    emoji: "📖",
    description: "10 pages of nonfiction",
  },
  {
    key: "progress_photo",
    label: "Progress Photo",
    emoji: "📸",
    description: "Take a progress photo (optional)",
    optional: true,
  },
] as const;

export const DEFAULT_TASK_KEYS = DEFAULT_TASKS.filter(
  (t) => !("optional" in t && t.optional)
).map((t) => t.key);

export const TOTAL_DAYS = 75;

export const ACHIEVEMENTS = [
  // Streak milestones
  {
    key: "streak_7",
    label: "Week Warrior",
    emoji: "⭐",
    description: "7-day streak",
    category: "streak",
  },
  {
    key: "streak_14",
    label: "Two Week Terror",
    emoji: "🌟",
    description: "14-day streak",
    category: "streak",
  },
  {
    key: "streak_30",
    label: "Monthly Monster",
    emoji: "💫",
    description: "30-day streak",
    category: "streak",
  },
  {
    key: "streak_50",
    label: "Fifty & Ferocious",
    emoji: "🔥",
    description: "50-day streak",
    category: "streak",
  },
  {
    key: "streak_75",
    label: "75 Hard Legend",
    emoji: "🏆",
    description: "Completed 75 Hard!",
    category: "streak",
  },
  // First to finish
  {
    key: "first_finish_1",
    label: "Early Bird",
    emoji: "🐦",
    description: "First to finish all tasks",
    category: "first",
  },
  {
    key: "first_finish_5",
    label: "Speed Demon",
    emoji: "⚡",
    description: "First to finish 5 times",
    category: "first",
  },
  {
    key: "first_finish_10",
    label: "The Machine",
    emoji: "🤖",
    description: "First to finish 10 times",
    category: "first",
  },
  // Category-specific
  {
    key: "bookworm",
    label: "Bookworm",
    emoji: "🐛",
    description: "Read every day for 14 days straight",
    category: "category",
  },
  {
    key: "iron_will",
    label: "Iron Will",
    emoji: "🦾",
    description: "Never missed an outdoor workout for 30 days",
    category: "category",
  },
  {
    key: "hydration_hero",
    label: "Hydration Hero",
    emoji: "🌊",
    description: "Hit water goal every day for 21 days",
    category: "category",
  },
  {
    key: "clean_machine",
    label: "Clean Machine",
    emoji: "🥦",
    description: "Perfect diet for 30 days straight",
    category: "category",
  },
  {
    key: "double_trouble",
    label: "Double Trouble",
    emoji: "👊",
    description: "Both workouts done every day for 14 days",
    category: "category",
  },
] as const;

export const REACTION_EMOJIS = ["🔥", "💪", "👏", "🙌", "⚡", "❤️"] as const;
