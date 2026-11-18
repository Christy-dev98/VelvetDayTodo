/* ==========================================================
   VELVET DAY - SERVICE WORKER
   App shell caching and offline fallback.
   ========================================================== */
const CACHE_NAME = "velvet-day-v3";
const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./favicon.ico",
    "./css/style.css",
    "./css/responsive.css",
    "./css/animations.css",
    "./js/utils.js",
    "./js/storage.js",
    "./js/toast.js",
    "./js/theme.js",
    "./js/navigation.js",
    "./js/app.js",
    "./js/tasks.js",
    "./js/brain-dump.js",
    "./js/notes.js",
    "./js/checklists.js",
    "./js/calendar.js",
    "./js/recurring.js",
    "./js/reminders.js",
    "./js/progress.js",
    "./js/settings.js",
    "./js/search.js",
    "./js/pwa.js",
    "./js/init.js",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // A missing optional icon must not prevent the app shell from
        // installing. Cache files independently and report failures.
        await Promise.all(APP_FILES.map(async path => {
            try {
                const response = await fetch(path, { cache: "reload" });
                if (response.ok) await cache.put(path, response);
                else console.warn("Velvet Day: cache skipped", path, response.status);
            } catch (error) {
                console.warn("Velvet Day: cache failed", path, error);
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith("velvet-day-") && name !== CACHE_NAME).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put("./index.html", response.clone());
                }
                return response;
            } catch (_) {
                return (await caches.match(request)) || (await caches.match("./index.html")) || new Response("Velvet Day is offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
            const response = await fetch(request);
            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }
            return response;
        } catch (_) {
            return new Response("", { status: 503, statusText: "Offline" });
        }
    })());
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const target = event.notification.data?.url || "./index.html";
    event.waitUntil((async () => {
        const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clientsList) {
            if ("focus" in client) {
                await client.navigate?.(target);
                return client.focus();
            }
        }
        return self.clients.openWindow(target);
    })());
});
