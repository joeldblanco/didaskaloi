"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const ROUTES_TO_CACHE = [
  "/clases",
  "/estudiantes",
  "/asistencia",
  "/reportes",
  "/configuracion",
  "/proyectos",
];

const WARMUP_KEY = "didaskaloi-cache-warmup";
const WARMUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Precarga las rutas principales de la app directamente en el caché del SW
 * usando la Cache API. Se ejecuta tras login exitoso y cada 24 horas.
 */
export function CacheWarmup() {
  const { status } = useSession();
  const warming = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || warming.current) return;
    if (!("caches" in window) || !("serviceWorker" in navigator)) return;

    const lastWarmup = localStorage.getItem(WARMUP_KEY);
    const now = Date.now();

    if (lastWarmup && now - parseInt(lastWarmup, 10) < WARMUP_INTERVAL_MS) {
      return;
    }

    warming.current = true;

    const warmup = async () => {
      try {
        await navigator.serviceWorker.ready;

        // Abrir el caché directamente — garantiza que las respuestas se guardan
        const cache = await caches.open("pages-cache");

        for (const route of ROUTES_TO_CACHE) {
          try {
            const response = await fetch(route, {
              credentials: "same-origin",
            });

            // Solo cachear respuestas exitosas que NO sean redirects a login
            if (response.ok && !response.redirected) {
              // Guardar con un Request limpio (sin headers extra) para que
              // cualquier navegación futura al mismo URL haga match en caché
              const cleanRequest = new Request(
                new URL(route, window.location.origin).href,
              );
              await cache.put(cleanRequest, response.clone());
            }
          } catch {
            // Ignorar fallos individuales
          }
        }

        localStorage.setItem(WARMUP_KEY, now.toString());
      } catch {
        // Ignorar errores del warmup
      } finally {
        warming.current = false;
      }
    };

    const timer = setTimeout(warmup, 3000);
    return () => clearTimeout(timer);
  }, [status]);

  return null;
}
