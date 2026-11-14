const CACHE_PREFIX = "paper-galaxy-app-";
const MANIFEST_URL = "/offline-precache.json";

function isAppCache(name) {
  return name.startsWith(CACHE_PREFIX);
}

async function getAppCaches() {
  const names = (await caches.keys())
    .filter(isAppCache)
    .reverse();

  const result = [];

  for (const name of names) {
    result.push({
      name,
      cache: await caches.open(name),
    });
  }

  return result;
}

async function findCached(request) {
  const requestedUrl = new URL(request.url);

  for (const entry of await getAppCaches()) {
    // Ưu tiên khớp URL chính xác.
    let response = await entry.cache.match(request, {
      ignoreSearch: true,
    });

    if (response) {
      return response;
    }

    // Phương án dự phòng: khớp pathname cùng origin.
    const keys = await entry.cache.keys();

    for (const key of keys) {
      const cachedUrl = new URL(key.url);

      if (
        cachedUrl.origin === requestedUrl.origin &&
        cachedUrl.pathname === requestedUrl.pathname
      ) {
        response = await entry.cache.match(key);

        if (response) {
          return response;
        }
      }
    }
  }

  return undefined;
}

async function findOfflinePage() {
  const pageUrl = new URL(
    "/index.html",
    self.location.origin,
  );

  return findCached(new Request(pageUrl));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch(MANIFEST_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Không tải được manifest PWA.");
    }

    const manifest = await response.json();

    if (
      typeof manifest.version !== "string" ||
      !Array.isArray(manifest.assets) ||
      !manifest.assets.includes("/index.html")
    ) {
      throw new Error("Manifest PWA không hợp lệ.");
    }

    const cacheName = CACHE_PREFIX + manifest.version;
    const cache = await caches.open(cacheName);

    await cache.addAll(manifest.assets);

    // Lưu manifest để kiểm tra được cả khi mất mạng.
    await cache.put(
      MANIFEST_URL,
      new Response(JSON.stringify(manifest), {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    // Xác minh HTML và từng tài nguyên trước khi kích hoạt.
    for (const asset of manifest.assets) {
      if (!(await cache.match(asset))) {
        throw new Error(`Thiếu tài nguyên: ${asset}`);
      }
    }

    console.info(
      "[Paper Galaxy SW] Installed",
      cacheName,
      manifest.assets.length,
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Giữ cache cũ làm dự phòng.
    // Chưa tự động xóa cache trong giai đoạn kiểm thử.
    await self.clients.claim();

    console.info(
      "[Paper Galaxy SW] Active caches:",
      (await caches.keys()).filter(isAppCache),
    );
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response.ok) {
          return response;
        }
      } catch {
        // Mất mạng: dùng bản HTML đã cache.
      }

      const cached = await findOfflinePage();

      if (cached) {
        return cached;
      }

      console.error(
        "[Paper Galaxy SW] Missing offline HTML",
      );

      return Response.error();
    })());

    return;
  }

  event.respondWith((async () => {
    const cached = await findCached(request);

    if (cached) {
      return cached;
    }

    try {
      return await fetch(request);
    } catch (error) {
      console.error(
        "[Paper Galaxy SW] Missing asset:",
        url.pathname,
        error,
      );

      return Response.error();
    }
  })());
});

