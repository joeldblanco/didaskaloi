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
 * Precarga las rutas principales de la app en el caché del Service Worker.
 * Se ejecuta una vez tras login exitoso y luego cada 24 horas.
 * Las peticiones son invisibles para el usuario.
 */
export function CacheWarmup() {
  const { status } = useSession();
  const warming = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || warming.current) return;
    if (!("serviceWorker" in navigator)) return;

    const lastWarmup = localStorage.getItem(WARMUP_KEY);
    const now = Date.now();

    if (lastWarmup && now - parseInt(lastWarmup, 10) < WARMUP_INTERVAL_MS) {
      return;
    }

    warming.current = true;

    const warmup = async () => {
      try {
        // Esperar a que el SW esté listo
        await navigator.serviceWorker.ready;

        // Fetch cada ruta secuencialmente para no saturar la red
        for (const route of ROUTES_TO_CACHE) {
          try {
            await fetch(route, {
              credentials: "same-origin",
              cache: "no-cache",
              headers: { "X-Cache-Warmup": "1" },
            });
          } catch {
            // Ignorar fallos individuales (ya podríamos estar offline)
          }
        }

        localStorage.setItem(WARMUP_KEY, now.toString());
      } catch {
        // Ignorar errores del warmup
      } finally {
        warming.current = false;
      }
    };

    // Ejecutar después de un breve delay para no competir con el render inicial
    const timer = setTimeout(warmup, 3000);
    return () => clearTimeout(timer);
  }, [status]);

  return null;
}
