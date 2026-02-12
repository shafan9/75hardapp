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

export const MOTIVATIONAL_QUOTES = [
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln (attributed)",
  },
  {
    text: "Small steps every day lead to massive results over time.",
    author: "75 Squad",
  },
  {
    text: "You do not have to be extreme, just consistent.",
    author: "75 Squad",
  },
  {
    text: "The hard days are what make you stronger.",
    author: "Aly Raisman",
  },
  {
    text: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    text: "When you feel like quitting, remember why you started.",
    author: "Unknown",
  },
  {
    text: "Do something today your future self will thank you for.",
    author: "Unknown",
  },
  {
    text: "You never regret the workout you did.",
    author: "Unknown",
  },
  {
    text: "Progress, not perfection.",
    author: "Unknown",
  },
  {
    text: "If it is important, you will find a way.",
    author: "Unknown",
  },
  {
    text: "Motivation gets you started. Habit keeps you going.",
    author: "Jim Ryun",
  },
  {
    text: "Consistency is what transforms average into excellence.",
    author: "Unknown",
  },
  {
    text: "You are one decision away from a completely different day.",
    author: "Unknown",
  },
  {
    text: "Stay committed to your decisions, but stay flexible in your approach.",
    author: "Tony Robbins",
  },
  {
    text: "The body achieves what the mind believes.",
    author: "Unknown",
  },
  {
    text: "You can do hard things.",
    author: "Unknown",
  },
  {
    text: "No shortcuts. Just work.",
    author: "75 Squad",
  },
  {
    text: "The difference between who you are and who you want to be is what you do today.",
    author: "Unknown",
  },
  {
    text: "Your habits shape your future.",
    author: "75 Squad",
  },
  {
    text: "One task at a time. One day at a time.",
    author: "75 Squad",
  },
  {
    text: "Hard choices, easy life. Easy choices, hard life.",
    author: "Jerzy Gregorek",
  },
  {
    text: "Results happen over time, not overnight.",
    author: "Unknown",
  },
  {
    text: "The obstacle is the way.",
    author: "Marcus Aurelius",
  },
  {
    text: "Action cures fear.",
    author: "David J. Schwartz",
  },
  {
    text: "Done is better than perfect.",
    author: "Sheryl Sandberg",
  },
  {
    text: "Future you is watching.",
    author: "75 Squad",
  },
  {
    text: "A little progress each day adds up to big results.",
    author: "Satya Nani",
  },
  {
    text: "Strength does not come from what you can do. It comes from overcoming what you thought you could not.",
    author: "Rikki Rogers",
  },
  {
    text: "There is no finish line for self-improvement.",
    author: "Unknown",
  },
  {
    text: "You are building proof that you can trust yourself.",
    author: "75 Squad",
  },
] as const;
