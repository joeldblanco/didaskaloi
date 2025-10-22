"use client";

import {
  getPendingActions,
  deleteSyncedAction,
  cleanOldSyncedActions,
} from "./offline-storage";
import {
  createClass,
  updateClass,
  deleteClass,
  createStudent,
  updateStudent,
  deleteStudent,
  createAgeRange,
  updateAgeRange,
  deleteAgeRange,
  createAttendance,
  updateAttendanceRecord,
  deleteAttendance,
} from "./actions";

export class SyncManager {
  private isSyncing = false;
  private syncCallbacks: Array<(status: SyncStatus) => void> = [];

  // Registrar callback para actualizaciones de sincronización
  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyStatusChange(status: SyncStatus) {
    this.syncCallbacks.forEach((callback) => callback(status));
  }

  // Sincronizar todas las acciones pendientes
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        message: "Sincronización ya en progreso",
        synced: 0,
        failed: 0,
      };
    }

    this.isSyncing = true;
    this.notifyStatusChange({ syncing: true, progress: 0 });

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      const pendingActions = await getPendingActions();

      if (pendingActions.length === 0) {
        this.notifyStatusChange({ syncing: false, progress: 100 });
        this.isSyncing = false;
        return {
          success: true,
          message: "No hay cambios pendientes",
          synced: 0,
          failed: 0,
        };
      }

      for (let i = 0; i < pendingActions.length; i++) {
        const action = pendingActions[i];
        const progress = ((i + 1) / pendingActions.length) * 100;

        this.notifyStatusChange({
          syncing: true,
          progress,
          current: i + 1,
          total: pendingActions.length,
        });

        try {
          await this.executeAction(action);
          if (action.id) {
            await deleteSyncedAction(action.id);
          }
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            action: action.action,
            entity: action.entity,
            error: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }

      // Limpiar acciones antiguas
      await cleanOldSyncedActions();

      this.notifyStatusChange({ syncing: false, progress: 100 });
      result.message = `Sincronizados: ${result.synced}, Fallidos: ${result.failed}`;
    } catch (error) {
      result.success = false;
      result.message =
        error instanceof Error ? error.message : "Error en sincronización";
      this.notifyStatusChange({ syncing: false, progress: 0 });
    }

    this.isSyncing = false;
    return result;
  }

  private async executeAction(action: {
    action: string;
    entity: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { action: actionType, entity, data } = action;

    switch (entity) {
      case "class":
        if (actionType === "create") await createClass(data as Parameters<typeof createClass>[0]);
        else if (actionType === "update") await updateClass(data as Parameters<typeof updateClass>[0]);
        else if (actionType === "delete") await deleteClass(data.id as number);
        break;

      case "student":
        if (actionType === "create") await createStudent(data as Parameters<typeof createStudent>[0]);
        else if (actionType === "update") await updateStudent(data as Parameters<typeof updateStudent>[0]);
        else if (actionType === "delete") await deleteStudent(data.id as number);
        break;

      case "ageRange":
        if (actionType === "create") await createAgeRange(data as Parameters<typeof createAgeRange>[0]);
        else if (actionType === "update") await updateAgeRange(data as Parameters<typeof updateAgeRange>[0]);
        else if (actionType === "delete") await deleteAgeRange(data.id as number);
        break;

      case "attendance":
        if (actionType === "create") await createAttendance(data as Parameters<typeof createAttendance>[0]);
        else if (actionType === "delete") await deleteAttendance(data.id as number);
        break;

      case "attendanceRecord":
        if (actionType === "update") await updateAttendanceRecord(data as Parameters<typeof updateAttendanceRecord>[0]);
        break;

      default:
        throw new Error(`Entidad desconocida: ${entity}`);
    }
  }
}

export interface SyncStatus {
  syncing: boolean;
  progress: number;
  current?: number;
  total?: number;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  synced: number;
  failed: number;
  errors?: Array<{
    action: string;
    entity: string;
    error: string;
  }>;
}

// Instancia singleton
export const syncManager = new SyncManager();
