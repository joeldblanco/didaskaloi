"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncManager } from "@/lib/sync-manager";
import { initializeCache } from "@/lib/offline-actions";

export function OfflineSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar caché al montar
  useEffect(() => {
    const init = async () => {
      await initializeCache();
      setIsInitialized(true);
    };
    init();
  }, []);

  // Sincronizar cuando se recupera la conexión
  useEffect(() => {
    if (wasOffline && isOnline && !isSyncing && isInitialized) {
      const sync = async () => {
        setIsSyncing(true);

        try {
          const result = await syncManager.syncAll();

          if (result.success) {
            if (result.synced > 0) {
              // Recargar la página para obtener datos frescos
              window.location.reload();
            }
          } else {
            console.error(result.message || "Error en la sincronización");
          }
        } catch (error) {
          console.error("Error syncing:", error);
          console.error("Error al sincronizar cambios:", error);
        } finally {
          setIsSyncing(false);
        }
      };

      sync();
    }
  }, [wasOffline, isOnline, isSyncing, isInitialized]);

  return <>{children}</>;
}
