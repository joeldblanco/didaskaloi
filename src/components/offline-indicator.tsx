"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncManager, SyncStatus } from "@/lib/sync-manager";
import { WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    progress: 0,
  });

  useEffect(() => {
    // Suscribirse a cambios de estado de sincronización
    const unsubscribe = syncManager.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Cuando se recupera la conexión, sincronizar automáticamente
    if (isOnline && wasOffline) {
      toast.info("Conexión restaurada. Sincronizando cambios...");
      syncManager.syncAll().then((result) => {
        if (result.success) {
          if (result.synced > 0) {
            toast.success(
              `✅ ${result.synced} cambio(s) sincronizado(s) correctamente`
            );
          } else {
            toast.success("✅ Todo está sincronizado");
          }
        } else {
          toast.error(`❌ Error en sincronización: ${result.message}`);
        }
      });
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium z-50 flex items-center justify-center gap-2">
        <WifiOff size={16} />
        <span>Modo sin conexión - Los cambios se sincronizarán automáticamente</span>
      </div>
    );
  }

  if (syncStatus.syncing) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          <span>
            Sincronizando... {syncStatus.current}/{syncStatus.total} (
            {Math.round(syncStatus.progress)}%)
          </span>
        </div>
        <div className="w-full bg-blue-600 h-1 mt-1 rounded-full overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-300"
            style={{ width: `${syncStatus.progress}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}
