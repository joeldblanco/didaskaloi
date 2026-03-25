"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, WifiOff } from "lucide-react";

/**
 * Comprueba si una ruta está disponible en el caché del Service Worker.
 */
async function isRouteCached(url: string): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cacheNames = await window.caches.keys();
    for (const name of cacheNames) {
      const cache = await window.caches.open(name);
      const response = await cache.match(url);
      if (response) return true;
    }
  } catch {
    // Ignorar errores de acceso a caché
  }
  return false;
}

export default function OfflineFallbackPage() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const tryRedirect = async () => {
      // Intentar redirigir a la última ruta visitada o a /clases como fallback
      let lastPath: string | null = null;
      try {
        if (typeof window !== "undefined") {
          lastPath = localStorage.getItem("didaskaloi-last-path");
        }
      } catch {
        lastPath = null;
      }

      const targetPath =
        lastPath && lastPath !== "/" && lastPath !== "/_offline"
          ? lastPath
          : "/clases";

      // Verificar si la ruta está en caché antes de intentar redirigir.
      // Así evitamos el loop: /_offline → ruta no cacheada → /_offline
      const cachedTarget = await isRouteCached(targetPath);
      const cachedFallback =
        targetPath !== "/clases" ? await isRouteCached("/clases") : false;

      if (cancelled) return;

      if (cachedTarget) {
        router.replace(targetPath);
        // Dar tiempo para que la navegación ocurra
        setTimeout(() => {
          if (!cancelled) setRedirecting(false);
        }, 3000);
        return;
      }

      if (cachedFallback) {
        router.replace("/clases");
        setTimeout(() => {
          if (!cancelled) setRedirecting(false);
        }, 3000);
        return;
      }

      // Ninguna ruta está en caché, mostrar UI offline directamente
      setRedirecting(false);
    };

    tryRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">
          Cargando modo sin conexión...
        </p>
      </div>
    );
  }

  // Si no pudimos redirigir, mostrar UI funcional offline
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
          <WifiOff className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Modo sin conexión</h1>
        <p className="text-muted-foreground mb-6">
          No se encontraron páginas en caché. Conéctate a internet brevemente
          para que la app descargue los datos necesarios. Después podrás usarla
          sin conexión.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Reintentar conexión
        </button>
      </div>
    </div>
  );
}
