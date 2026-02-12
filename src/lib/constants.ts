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
  {
    text: "Show up especially when you do not feel like it.",
    author: "75 Squad",
  },
  {
    text: "Today's discipline is tomorrow's freedom.",
    author: "75 Squad",
  },
  {
    text: "Comfort and growth do not coexist.",
    author: "Ginni Rometty",
  },
  {
    text: "The day you plant the seed is not the day you eat the fruit.",
    author: "Fabienne Fredrickson",
  },
  {
    text: "Your only competition is who you were yesterday.",
    author: "Unknown",
  },
  {
    text: "Strong people are built by strong routines.",
    author: "75 Squad",
  },
  {
    text: "Effort counts twice when no one is watching.",
    author: "75 Squad",
  },
  {
    text: "Excuses are decisions in disguise.",
    author: "75 Squad",
  },
  {
    text: "If it costs you your discipline, it is too expensive.",
    author: "Unknown",
  },
  {
    text: "Confidence is earned through kept promises to yourself.",
    author: "75 Squad",
  },
  {
    text: "Make the next choice the right one.",
    author: "75 Squad",
  },
  {
    text: "You are not behind, you are building.",
    author: "75 Squad",
  },
  {
    text: "Consistency beats intensity when intensity is rare.",
    author: "75 Squad",
  },
  {
    text: "Repeat the basics until they become identity.",
    author: "75 Squad",
  },
  {
    text: "Every rep, every page, every ounce matters.",
    author: "75 Squad",
  },
  {
    text: "Discipline is self-respect in action.",
    author: "Unknown",
  },
  {
    text: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe",
  },
  {
    text: "Action creates clarity.",
    author: "Unknown",
  },
  {
    text: "Be stubborn about your goals and flexible about your methods.",
    author: "Unknown",
  },
  {
    text: "Hard work compounds.",
    author: "75 Squad",
  },
  {
    text: "No one is coming to save you. Be your own hero.",
    author: "Unknown",
  },
  {
    text: "Your calendar reveals your priorities.",
    author: "Unknown",
  },
  {
    text: "Keep promises to yourself.",
    author: "75 Squad",
  },
  {
    text: "Done today beats planned tomorrow.",
    author: "75 Squad",
  },
  {
    text: "Train your mind to stay when it gets hard.",
    author: "75 Squad",
  },
  {
    text: "The standard is the standard.",
    author: "75 Squad",
  },
  {
    text: "The secret is doing it when you do not want to.",
    author: "Unknown",
  },
  {
    text: "Ordinary days create extraordinary results.",
    author: "75 Squad",
  },
  {
    text: "Momentum is earned daily.",
    author: "75 Squad",
  },
  {
    text: "Do it tired. Do it busy. Do it anyway.",
    author: "Unknown",
  },
  {
    text: "Each day is a vote for the person you want to become.",
    author: "James Clear",
  },
  {
    text: "Consistency is a superpower.",
    author: "75 Squad",
  },
  {
    text: "There is power in finishing what you start.",
    author: "Unknown",
  },
  {
    text: "Patience and persistence make you unstoppable.",
    author: "75 Squad",
  },
  {
    text: "Discipline feels heavy until regret feels heavier.",
    author: "Unknown",
  },
  {
    text: "Build habits that are stronger than your moods.",
    author: "75 Squad",
  },
  {
    text: "Keep going. Your future is under construction.",
    author: "75 Squad",
  },
  {
    text: "You are closer than you think.",
    author: "Unknown",
  },
  {
    text: "Focus on winning today.",
    author: "75 Squad",
  },
  {
    text: "No zero days.",
    author: "Unknown",
  },
  {
    text: "Make yourself proud today.",
    author: "Unknown",
  },
  {
    text: "Tough times do not last. Tough people do.",
    author: "Robert H. Schuller",
  },
  {
    text: "Your results are hidden in your routine.",
    author: "75 Squad",
  },
  {
    text: "Finish strong.",
    author: "Unknown",
  },
  {
    text: "Day by day, you become who you promised to be.",
    author: "75 Squad",
  },
] as const;

if (MOTIVATIONAL_QUOTES.length !== TOTAL_DAYS) {
  throw new Error(
    `MOTIVATIONAL_QUOTES must include ${TOTAL_DAYS} quotes. Found ${MOTIVATIONAL_QUOTES.length}.`
  );
}
