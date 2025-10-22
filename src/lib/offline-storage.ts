// Sistema de almacenamiento offline con IndexedDB
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface PendingAction {
  id?: number;
  action: string;
  entity: string;
  data: Record<string, unknown>;
  timestamp: number;
  synced: number;
}

interface CachedData {
  id: number;
  [key: string]: unknown;
}

interface DidaskaloidDB extends DBSchema {
  pendingActions: {
    key: number;
    value: PendingAction;
    indexes: { 
      synced: number;
      timestamp: number;
    };
  };
  classes: {
    key: number;
    value: CachedData;
  };
  students: {
    key: number;
    value: CachedData;
  };
  attendances: {
    key: number;
    value: CachedData;
  };
  ageRanges: {
    key: number;
    value: CachedData;
  };
}

let db: IDBPDatabase<DidaskaloidDB> | null = null;

export async function initDB() {
  if (db) return db;

  db = await openDB<DidaskaloidDB>("didaskaloi-db", 2, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      // Store para acciones pendientes de sincronización
      if (!db.objectStoreNames.contains("pendingActions")) {
        const pendingStore = db.createObjectStore("pendingActions", {
          keyPath: "id",
          autoIncrement: true,
        });
        pendingStore.createIndex("synced", "synced");
        pendingStore.createIndex("timestamp", "timestamp");
      }

      // Migración de versión 1 a 2: convertir synced de boolean a number
      if (oldVersion === 1 && newVersion === 2) {
        const pendingStore = transaction.objectStore("pendingActions");
        let cursor = await pendingStore.openCursor();
        
        while (cursor) {
          const action = cursor.value;
          // Convertir boolean a number: false -> 0, true -> 1
          if (typeof action.synced === "boolean") {
            action.synced = action.synced ? 1 : 0;
            await cursor.update(action);
          }
          cursor = await cursor.continue();
        }
      }

      // Stores para caché de datos
      if (!db.objectStoreNames.contains("classes")) {
        db.createObjectStore("classes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("students")) {
        db.createObjectStore("students", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("attendances")) {
        db.createObjectStore("attendances", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("ageRanges")) {
        db.createObjectStore("ageRanges", { keyPath: "id" });
      }
    },
  });

  return db;
}

// Agregar acción pendiente a la cola
export async function addPendingAction(
  action: string,
  entity: string,
  data: Record<string, unknown>
) {
  const database = await initDB();
  await database.add("pendingActions", {
    action,
    entity,
    data,
    timestamp: Date.now(),
    synced: 0,
  });
}

// Obtener acciones pendientes
export async function getPendingActions() {
  const database = await initDB();
  const actions = await database.getAllFromIndex(
    "pendingActions",
    "synced",
    IDBKeyRange.only(0)
  );
  return actions;
}

// Marcar acción como sincronizada
export async function markActionAsSynced(id: number) {
  const database = await initDB();
  const action = await database.get("pendingActions", id);
  if (action) {
    action.synced = 1;
    await database.put("pendingActions", action);
  }
}

// Eliminar acción sincronizada
export async function deleteSyncedAction(id: number) {
  const database = await initDB();
  await database.delete("pendingActions", id);
}

// Limpiar acciones antiguas sincronizadas
export async function cleanOldSyncedActions(daysOld = 7) {
  const database = await initDB();
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const allActions = await database.getAll("pendingActions");

  for (const action of allActions) {
    if (action.synced === 1 && action.timestamp < cutoffTime && action.id) {
      await database.delete("pendingActions", action.id);
    }
  }
}

// Caché de datos
export async function cacheData(
  store: "classes" | "students" | "attendances" | "ageRanges",
  data: CachedData[]
) {
  const database = await initDB();
  const tx = database.transaction(store, "readwrite");

  for (const item of data) {
    await tx.store.put(item);
  }

  await tx.done;
}

export async function getCachedData(
  store: "classes" | "students" | "attendances" | "ageRanges"
): Promise<CachedData[]> {
  const database = await initDB();
  return await database.getAll(store);
}

export async function clearCache(
  store: "classes" | "students" | "attendances" | "ageRanges"
) {
  const database = await initDB();
  await database.clear(store);
}

export async function clearAllCache() {
  const database = await initDB();
  await database.clear("classes");
  await database.clear("students");
  await database.clear("attendances");
  await database.clear("ageRanges");
}
