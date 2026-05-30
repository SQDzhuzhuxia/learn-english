"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(() => {
          if (!("caches" in window)) {
            return undefined;
          }

          return caches
            .keys()
            .then((keys) =>
              Promise.all(
                keys
                  .filter((key) => key.startsWith("learn-english-"))
                  .map((key) => caches.delete(key))
              )
            );
        })
        .catch(() => {
          // Local development should keep running even if cache cleanup fails.
        });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // PWA registration should never block the learning app.
      });
  }, []);

  return null;
}
