"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, WifiOff } from "lucide-react";

export default function OfflineFallbackPage() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    // Intentar redirigir a la última ruta visitada o a /clases como fallback
    const lastPath = typeof window !== "undefined" ? localStorage.getItem("didaskaloi-last-path") : null;
    const targetPath = lastPath && lastPath !== "/" && lastPath !== "/_offline"
      ? lastPath
      : "/clases";

    // Verificar si la ruta objetivo está cacheada por el service worker
    // Si estamos offline y la ruta está en caché, el SW la servirá
    // Si no, volveremos a caer aquí — en ese caso mostramos la UI offline
    const timeout = setTimeout(() => {
      setRedirecting(false);
    }, 2000);

    router.replace(targetPath);

    return () => clearTimeout(timeout);
  }, [router]);

  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Cargando modo sin conexión...</p>
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
          Estás trabajando sin conexión a internet. Puedes seguir usando la aplicación normalmente.
          Los cambios se sincronizarán automáticamente cuando recuperes la conexión.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push("/clases")}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Ir a Clases
          </button>
          <button
            onClick={() => router.push("/estudiantes")}
            className="w-full px-4 py-3 bg-card border border-border text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
          >
            Ir a Estudiantes
          </button>
          <button
            onClick={() => router.push("/asistencia")}
            className="w-full px-4 py-3 bg-card border border-border text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
          >
            Ir a Asistencia
          </button>
          <button
            onClick={() => router.push("/reportes")}
            className="w-full px-4 py-3 bg-card border border-border text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
          >
            Ir a Reportes
          </button>
        </div>
      </div>
    </div>
  );
}
