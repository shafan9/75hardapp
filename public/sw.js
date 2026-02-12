const CACHE_NAME = "75squad-v3";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const CACHEABLE_PATH_PREFIXES = ["/_next/static/", "/icons/"];
const CACHEABLE_EXACT_PATHS = new Set(["/manifest.json", "/favicon.ico"]);

const DAILY_MOTIVATION_QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "Small steps every day lead to massive results over time.",
  "You do not have to be extreme, just consistent.",
  "The hard days are what make you stronger.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "When you feel like quitting, remember why you started.",
  "Do something today your future self will thank you for.",
  "You never regret the workout you did.",
  "Progress, not perfection.",
  "If it is important, you will find a way.",
  "Motivation gets you started. Habit keeps you going.",
  "Consistency is what transforms average into excellence.",
  "You are one decision away from a completely different day.",
  "Stay committed to your decisions, but stay flexible in your approach.",
  "The body achieves what the mind believes.",
  "You can do hard things.",
  "No shortcuts. Just work.",
  "The difference between who you are and who you want to be is what you do today.",
  "Your habits shape your future.",
  "One task at a time. One day at a time.",
  "Hard choices, easy life. Easy choices, hard life.",
  "Results happen over time, not overnight.",
  "The obstacle is the way.",
  "Action cures fear.",
  "Done is better than perfect.",
  "Future you is watching.",
  "A little progress each day adds up to big results.",
  "Strength does not come from what you can do. It comes from overcoming what you thought you could not.",
  "There is no finish line for self-improvement.",
  "You are building proof that you can trust yourself.",
  "Show up especially when you do not feel like it.",
  "Today's discipline is tomorrow's freedom.",
  "Comfort and growth do not coexist.",
  "The day you plant the seed is not the day you eat the fruit.",
  "Your only competition is who you were yesterday.",
  "Strong people are built by strong routines.",
  "Effort counts twice when no one is watching.",
  "Excuses are decisions in disguise.",
  "If it costs you your discipline, it is too expensive.",
  "Confidence is earned through kept promises to yourself.",
  "Make the next choice the right one.",
  "You are not behind, you are building.",
  "Consistency beats intensity when intensity is rare.",
  "Repeat the basics until they become identity.",
  "Every rep, every page, every ounce matters.",
  "Discipline is self-respect in action.",
  "Start where you are. Use what you have. Do what you can.",
  "Action creates clarity.",
  "Be stubborn about your goals and flexible about your methods.",
  "Hard work compounds.",
  "No one is coming to save you. Be your own hero.",
  "Your calendar reveals your priorities.",
  "Keep promises to yourself.",
  "Done today beats planned tomorrow.",
  "Train your mind to stay when it gets hard.",
  "The standard is the standard.",
  "The secret is doing it when you do not want to.",
  "Ordinary days create extraordinary results.",
  "Momentum is earned daily.",
  "Do it tired. Do it busy. Do it anyway.",
  "Each day is a vote for the person you want to become.",
  "Consistency is a superpower.",
  "There is power in finishing what you start.",
  "Patience and persistence make you unstoppable.",
  "Discipline feels heavy until regret feels heavier.",
  "Build habits that are stronger than your moods.",
  "Keep going. Your future is under construction.",
  "You are closer than you think.",
  "Focus on winning today.",
  "No zero days.",
  "Make yourself proud today.",
  "Tough times do not last. Tough people do.",
  "Your results are hidden in your routine.",
  "Finish strong.",
  "Day by day, you become who you promised to be.",
];

function getDailyMotivationQuote() {
  const dayNumber = Math.floor(Date.now() / 86400000);
  const index =
    ((dayNumber % DAILY_MOTIVATION_QUOTES.length) + DAILY_MOTIVATION_QUOTES.length) %
    DAILY_MOTIVATION_QUOTES.length;
  return DAILY_MOTIVATION_QUOTES[index];
}

function isCacheableAsset(url, request) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;

  if (CACHEABLE_EXACT_PATHS.has(url.pathname)) return true;
  return CACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function shouldBypassCache(url, request) {
  if (request.method !== "GET") return true;

  if (url.hostname.endsWith("supabase.co")) return true;

  if (url.origin !== self.location.origin) return true;

  if (request.mode === "navigate") return true;

  if (url.pathname === "/") return true;
  if (url.pathname.startsWith("/dashboard")) return true;
  if (url.pathname.startsWith("/auth")) return true;
  if (url.pathname.startsWith("/join")) return true;
  if (url.pathname.startsWith("/api")) return true;

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (shouldBypassCache(url, event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (!isCacheableAsset(url, event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.status === 200 && response.type === "basic") {
        const clone = response.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, clone);
      }

      return response;
    })
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "75 Squad",
    body: getDailyMotivationQuote(),
    icon: "/icons/icon-192.png",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || "/dashboard"));
});
