const CACHE_NAME = "75squad-v1";
const STATIC_ASSETS = ["/", "/dashboard", "/manifest.json"];
const DAILY_MOTIVATION_QUOTES = [
  "Small steps every day lead to massive results over time.",
  "You do not have to be extreme, just consistent.",
  "When you feel like quitting, remember why you started.",
  "Do something today your future self will thank you for.",
  "Progress, not perfection.",
  "The body achieves what the mind believes.",
  "You can do hard things.",
  "No shortcuts. Just work.",
  "Your habits shape your future.",
  "One task at a time. One day at a time.",
  "Results happen over time, not overnight.",
  "Action cures fear.",
  "Done is better than perfect.",
  "Future you is watching.",
  "Stay committed. Stay relentless.",
];

function getDailyMotivationQuote() {
  const dayNumber = Math.floor(Date.now() / 86400000);
  const index =
    ((dayNumber % DAILY_MOTIVATION_QUOTES.length) + DAILY_MOTIVATION_QUOTES.length) %
    DAILY_MOTIVATION_QUOTES.length;
  return DAILY_MOTIVATION_QUOTES[index];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy for API calls
  if (event.request.url.includes("supabase")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
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
