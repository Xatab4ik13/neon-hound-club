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

      await self.registration.unregister();
    })(),
  );
});