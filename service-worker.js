/* ================================================================
   Service Worker — caches the app shell for offline use
   ================================================================ */

const CACHE_NAME = "beneficiary-app-v1";
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json"
];

// Install — pre-cache the app shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — network-first for API, cache-first for shell
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Never cache Google Apps Script API calls — always go to network
    if (url.hostname === "script.google.com" ||
        url.hostname === "script.googleusercontent.com") {
        return; // let it pass through
    }

    // For app shell: try cache first, fall back to network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // Refresh cache in background
                fetch(event.request)
                    .then(res => {
                        if (res && res.status === 200) {
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, res.clone()));
                        }
                    })
                    .catch(() => { /* offline — ignore */ });
                return cached;
            }
            return fetch(event.request);
        })
    );
});
