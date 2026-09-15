/* Offline support for Ari & Dot — The Solar System.
 *
 * WHY THIS FILE EXISTS AT ALL, AND WHY IT DID NOT UNTIL NOW.
 *
 * `release/registry.json` has named `service-worker.js` for this app since it was
 * registered, and the file never existed. That is not cosmetic. `onboard-app.py`
 * refuses an app with no worker in as many words -- "the cache version is the
 * release gate; without one this pipeline cannot version the app" -- so Ari & Dot
 * was locked out of its own release pipeline while the registry said otherwise.
 * Every publish of this book has been a person copying files by hand, and on
 * 2026-09-09 that is exactly how the front door came to serve the OS robot voice
 * for twelve days: the copy of Page 1 living in the public repo missed two fixes
 * that reached every other page.
 *
 * So this worker is not primarily an offline feature. It is the thing that lets
 * the book be published the way the other apps are: bump CACHE_NAME, dispatch the
 * release, and the workflow does the rest.
 *
 * NETWORK-FIRST FOR PAGES, DELIBERATELY, AND NOT LIKE math-app.
 *
 * `math-app/service-worker.js` is cache-first for everything, which means a freshly
 * published change is invisible until the launch *after* the one that downloads it.
 * The owner hit precisely that on 2026-08-16 and reasonably concluded the publish
 * had failed. `site/children-apps/service-worker.js` learned from it and this one
 * copies that lesson: a page is always fetched from the network when there is one,
 * and the cache is the fallback rather than the default. A republished book shows
 * up on the very next load.
 *
 * WHAT IS PRECACHED, AND WHY IT IS THREE FILES.
 *
 * The book ships 64 MB -- 53 MB of art and 10 MB of narration across 1,246 files.
 * Precaching that would make the first visit download the whole book before the
 * first page appeared, on a child's iPad, to serve pages most children will not
 * open in that sitting. So the shell is the front door and Page 1; everything else
 * is cached on the way past, the first time it is actually needed.
 *
 * `addAll` is atomic: one 404 fails the install and the app ships with no worker at
 * all. Every entry below must therefore be in `.publish-manifest [ship]`, and the
 * shell is kept to three files partly so that stays easy to verify by eye.
 *
 * BUMP CACHE_NAME ON EVERY PUBLISH. It is the release gate -- `publish-app.sh`
 * stage 5 refuses a release whose cache version is not strictly greater than the
 * one live is serving -- and it is also what evicts a stale copy from a device.
 *
 *   v1  2026-09-09  first version. Written so the book can join the release
 *                   pipeline; the twenty pages carry the narration retry, and a
 *                   page that is not downloaded yet says so instead of silently
 *                   showing Page 1.
 *   v2  2026-09-14  Page 10's asteroid deep dive becomes a ten-body roster.
 *                   This only arms a candidate; publishing remains separately
 *                   approval-gated.
 */
const CACHE_NAME = "solar-storybook-v3";

/* The front door and the first page: enough to open the book with no network.
   `./` and `./index.html` are the same document; both are listed because a child
   arrives at the bare directory from the hub, and a cache is keyed by URL. */
const SHELL = [
  "./",
  "./index.html",
  "./page-01.html",
  "./offline.html",
  /* Dot's picture on the offline card. Precached rather than left to fill on the
     way past, because the one moment that card is shown is the one moment the
     network is gone -- an offline page whose art 404s is its own small joke. */
  "./assets-runtime/standard/page-02/dot-neutral.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      /* Evict only this book's own versions. Every app on this account is a sibling
         path on veeranuchlee.github.io and ships its own worker and cache, so
         "delete every cache that is not mine" would evict the hub's and every
         game's. Foreign cache names are not ours to touch -- the hub's worker
         header records this going wrong in the other direction. */
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => /^solar-storybook-v/.test(k) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL("./", self.location).pathname)) return;

  if (request.mode === "navigate") {
    /* Network-first, so a publish is visible on the next load. */
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        /* The cached copy of the page actually asked for, or an honest card
           saying it is not downloaded yet. NOT a fallback to Page 1: that showed
           a child the wrong page with the counter reading 1 / 20 and no way to
           tell anything had gone wrong. */
        .catch(() => caches.match(request).then((c) => c || caches.match("./offline.html")))
    );
    return;
  }

  /* Art and narration: cache-first, filling the cache on the way past. These are
     content-addressed by name and only change when CACHE_NAME changes, so serving
     them from disk is what makes a page turn instant -- and what lets the book
     work with no network once a child has read it.

     A narration retry arrives as `<clip>.m4a?retry=1`; that is a deliberate
     cache bypass, so it must not be answered from here and must not be stored
     under a second key. */
  if (url.searchParams.has("retry")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
