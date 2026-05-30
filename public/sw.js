// HELLHOUND service worker — ТОЛЬКО push-уведомления.
// Никакого кэша, никакого navigateFallback — чтобы не ломать preview и не
// держать пользователей на устаревшем шеле.
//
// События, которые мы хотим показывать: новый розыгрыш, новый пост в ленте,
// новые поступившие товары. Бэкенд кладёт это в payload.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      await Promise.all(
        clients.map(async (client) => {
          try {
            const url = new URL(client.url);
            if (url.origin !== self.location.origin) return;
            url.searchParams.set("sw-refresh", Date.now().toString());
            await client.navigate(url.toString());
          } catch {
            /* ignore */
          }
        }),
      );
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "HELLHOUND", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "HELLHOUND";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: {
      url: data.url || "/club",
      ...(data.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/club";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) await client.navigate(url);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
