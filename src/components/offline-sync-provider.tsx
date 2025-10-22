"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncManager } from "@/lib/sync-manager";
import { initializeCache } from "@/lib/offline-actions";
import { toast } from "sonner";

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
        toast.info("Sincronizando cambios pendientes...");

        try {
          const result = await syncManager.syncAll();

          if (result.success) {
            if (result.synced > 0) {
              toast.success(
                `Sincronización completada: ${result.synced} cambios aplicados`
              );
              
              // Recargar la página para obtener datos frescos
              window.location.reload();
            } else {
              toast.success("No hay cambios pendientes");
            }
          } else {
            toast.error(result.message || "Error en la sincronización");
          }
        } catch (error) {
          console.error("Error syncing:", error);
          toast.error("Error al sincronizar cambios");
        } finally {
          setIsSyncing(false);
        }
      };

      sync();
    }
  }, [wasOffline, isOnline, isSyncing, isInitialized]);

  // Mostrar estado de conexión
  useEffect(() => {
    if (!isOnline) {
      toast.warning("Sin conexión - Los cambios se guardarán localmente", {
        duration: 5000,
      });
    }
  }, [isOnline]);

  return <>{children}</>;
}
