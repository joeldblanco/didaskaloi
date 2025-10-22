"use client";

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
import {
  type ClassFormValues,
  type StudentFormValues,
  type AgeRangeFormValues,
  type AttendanceFormValues,
  type AttendanceRecordFormValues,
} from "./validations";
import {
  addPendingAction,
  cacheData,
  getCachedData,
  initDB,
} from "./offline-storage";

// Tipo de retorno para acciones offline
export type OfflineActionResult = 
  | { success: true; offline?: boolean; attendanceId?: number }
  | { success: false; error: string };

// Verificar si estamos online
function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// Generar ID temporal para nuevos registros offline
function generateTempId(): number {
  return -Date.now(); // IDs negativos para registros temporales
}

// ============ CLASS ACTIONS ============

export async function offlineCreateClass(data: ClassFormValues): Promise<OfflineActionResult> {
  // Siempre guardar offline primero
  const tempId = generateTempId();
  const classData = {
    id: tempId,
    name: data.name,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { students: 0 },
  };

  const cachedClasses = await getCachedData("classes");
  await cacheData("classes", [...cachedClasses, classData]);
  await addPendingAction("create", "class", data);

  if (isOnline()) {
    try {
      const result = await createClass(data);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error creating class online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

export async function offlineUpdateClass(data: ClassFormValues): Promise<OfflineActionResult> {
  if (!data.id) {
    return { success: false, error: "ID de clase no proporcionado" };
  }

  // Siempre actualizar caché local primero
  const cachedClasses = await getCachedData("classes");
  const updatedClasses = cachedClasses.map((c) =>
    c.id === data.id
      ? { ...c, name: data.name, updatedAt: new Date() }
      : c
  );
  await cacheData("classes", updatedClasses);
  await addPendingAction("update", "class", data);

  if (isOnline()) {
    try {
      const result = await updateClass(data);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error updating class online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

export async function offlineDeleteClass(id: number): Promise<OfflineActionResult> {
  // Siempre eliminar del caché local primero
  const cachedClasses = await getCachedData("classes");
  const filteredClasses = cachedClasses.filter((c) => c.id !== id);
  await cacheData("classes", filteredClasses);
  await addPendingAction("delete", "class", { id });

  if (isOnline()) {
    try {
      const result = await deleteClass(id);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error deleting class online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

// ============ STUDENT ACTIONS ============

export async function offlineCreateStudent(data: StudentFormValues): Promise<OfflineActionResult> {
  // Siempre guardar offline primero para evitar problemas de conexión
  const tempId = generateTempId();
  const studentData = {
    id: tempId,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    age: data.age,
    classId: data.classId,
    createdAt: new Date(),
    updatedAt: new Date(),
    class: null,
    attendanceRecords: [],
  };

  // Guardar en caché local
  const cachedStudents = await getCachedData("students");
  await cacheData("students", [...cachedStudents, studentData]);

  // Guardar acción pendiente
  await addPendingAction("create", "student", data);

  // Si estamos online, intentar sincronizar inmediatamente
  if (isOnline()) {
    try {
      const result = await createStudent(data);
      if (result.success) {
        // Si tuvo éxito, actualizar el caché con el ID real del servidor
        // La sincronización se encargará de limpiar después
        return result as OfflineActionResult;
      }
    } catch (error) {
      console.error("Error creating student online, will sync later:", error);
      // Continuar en modo offline
    }
  }

  return { success: true, offline: true };
}

export async function offlineUpdateStudent(data: StudentFormValues): Promise<OfflineActionResult> {
  // Validar que tenemos ID
  if (!data.id) {
    return { success: false, error: "ID de estudiante no proporcionado" };
  }

  // Siempre actualizar caché local primero
  const cachedStudents = await getCachedData("students");
  const updatedStudents = cachedStudents.map((s) =>
    s.id === data.id
      ? {
          ...s,
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender,
          age: data.age,
          classId: data.classId,
          updatedAt: new Date(),
        }
      : s
  );
  await cacheData("students", updatedStudents);

  // Guardar acción pendiente
  await addPendingAction("update", "student", data);

  // Si estamos online, intentar sincronizar inmediatamente
  if (isOnline()) {
    try {
      const result = await updateStudent(data);
      if (result.success) {
        return result as OfflineActionResult;
      }
    } catch (error) {
      console.error("Error updating student online, will sync later:", error);
      // Continuar en modo offline
    }
  }

  return { success: true, offline: true };
}

export async function offlineDeleteStudent(id: number): Promise<OfflineActionResult> {
  // Siempre eliminar del caché local primero
  const cachedStudents = await getCachedData("students");
  const filteredStudents = cachedStudents.filter((s) => s.id !== id);
  await cacheData("students", filteredStudents);

  // Guardar acción pendiente
  await addPendingAction("delete", "student", { id });

  // Si estamos online, intentar sincronizar inmediatamente
  if (isOnline()) {
    try {
      const result = await deleteStudent(id);
      if (result.success) {
        return result as OfflineActionResult;
      }
    } catch (error) {
      console.error("Error deleting student online, will sync later:", error);
      // Continuar en modo offline
    }
  }

  return { success: true, offline: true };
}

// ============ AGE RANGE ACTIONS ============

export async function offlineCreateAgeRange(data: AgeRangeFormValues): Promise<OfflineActionResult> {
  const tempId = generateTempId();
  const ageRangeData = {
    id: tempId,
    label: data.label,
    minAge: data.minAge,
    maxAge: data.maxAge,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const cachedAgeRanges = await getCachedData("ageRanges");
  await cacheData("ageRanges", [...cachedAgeRanges, ageRangeData]);
  await addPendingAction("create", "ageRange", data);

  if (isOnline()) {
    try {
      const result = await createAgeRange(data);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error creating age range online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

export async function offlineUpdateAgeRange(data: AgeRangeFormValues): Promise<OfflineActionResult> {
  if (!data.id) {
    return { success: false, error: "ID de rango de edad no proporcionado" };
  }

  const cachedAgeRanges = await getCachedData("ageRanges");
  const updatedAgeRanges = cachedAgeRanges.map((ar) =>
    ar.id === data.id
      ? {
          ...ar,
          label: data.label,
          minAge: data.minAge,
          maxAge: data.maxAge,
          updatedAt: new Date(),
        }
      : ar
  );
  await cacheData("ageRanges", updatedAgeRanges);
  await addPendingAction("update", "ageRange", data);

  if (isOnline()) {
    try {
      const result = await updateAgeRange(data);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error updating age range online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

export async function offlineDeleteAgeRange(id: number): Promise<OfflineActionResult> {
  const cachedAgeRanges = await getCachedData("ageRanges");
  const filteredAgeRanges = cachedAgeRanges.filter((ar) => ar.id !== id);
  await cacheData("ageRanges", filteredAgeRanges);
  await addPendingAction("delete", "ageRange", { id });

  if (isOnline()) {
    try {
      const result = await deleteAgeRange(id);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error deleting age range online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

// ============ ATTENDANCE ACTIONS ============

export async function offlineCreateAttendance(data: AttendanceFormValues): Promise<OfflineActionResult> {
  const tempId = generateTempId();
  const attendanceData = {
    id: tempId,
    date: data.date,
    classId: data.classId,
    createdAt: new Date(),
    updatedAt: new Date(),
    class: null,
    records: [],
  };

  const cachedAttendances = await getCachedData("attendances");
  await cacheData("attendances", [...cachedAttendances, attendanceData]);
  await addPendingAction("create", "attendance", data);

  if (isOnline()) {
    try {
      const result = await createAttendance(data);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error creating attendance online, will sync later:", error);
    }
  }

  return { success: true, offline: true, attendanceId: tempId };
}

export async function offlineUpdateAttendanceRecord(
  data: AttendanceRecordFormValues
): Promise<OfflineActionResult> {
  await addPendingAction("update", "attendanceRecord", data);

  if (isOnline()) {
    try {
      const result = await updateAttendanceRecord(data);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error updating attendance record online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

export async function offlineDeleteAttendance(id: number): Promise<OfflineActionResult> {
  const cachedAttendances = await getCachedData("attendances");
  const filteredAttendances = cachedAttendances.filter((a) => a.id !== id);
  await cacheData("attendances", filteredAttendances);
  await addPendingAction("delete", "attendance", { id });

  if (isOnline()) {
    try {
      const result = await deleteAttendance(id);
      if (result.success) return result as OfflineActionResult;
    } catch (error) {
      console.error("Error deleting attendance online, will sync later:", error);
    }
  }

  return { success: true, offline: true };
}

// ============ CACHE INITIALIZATION ============

export async function initializeCache() {
  try {
    await initDB();

    // Si estamos online, intentar cargar datos frescos
    if (isOnline()) {
      // Importar dinámicamente para evitar problemas con server actions
      const { getClasses, getStudents, getAgeRanges, getAttendances } = await import("./actions");

      try {
        const [classes, students, ageRanges, attendances] = await Promise.all([
          getClasses(),
          getStudents(),
          getAgeRanges(),
          getAttendances(),
        ]);

        await Promise.all([
          cacheData("classes", classes as unknown as { id: number; [key: string]: unknown }[]),
          cacheData("students", students as unknown as { id: number; [key: string]: unknown }[]),
          cacheData("ageRanges", ageRanges as unknown as { id: number; [key: string]: unknown }[]),
          cacheData("attendances", attendances as unknown as { id: number; [key: string]: unknown }[]),
        ]);
      } catch (error) {
        console.error("Error loading fresh data:", error);
        // Si falla, usaremos el caché existente
      }
    }
  } catch (error) {
    console.error("Error initializing cache:", error);
  }
}

// ============ OFFLINE-AWARE READ OPERATIONS ============

/**
 * Get classes with offline fallback
 * Tries to fetch from server first, falls back to cache if offline
 */
export async function offlineGetClasses() {
  try {
    // Try to get fresh data from server
    const { getClasses } = await import("./actions");
    const classes = await getClasses();

    // Update cache with fresh data
    await cacheData("classes", classes as unknown as { id: number; [key: string]: unknown }[]);

    return classes;
  } catch (error) {
    // If offline or error, use cached data
    console.log("Using cached classes (offline mode)");
    const cachedClasses = await getCachedData("classes");
    return cachedClasses;
  }
}

/**
 * Get students with offline fallback
 * Supports optional filters for classId, gender, and searchTerm
 */
export async function offlineGetStudents(filters?: {
  classId?: number;
  gender?: "M" | "F";
  searchTerm?: string;
}) {
  try {
    // Try to get fresh data from server
    const { getStudents } = await import("./actions");
    const students = await getStudents(filters);

    // Update cache with fresh data
    await cacheData("students", students as unknown as { id: number; [key: string]: unknown }[]);

    return students;
  } catch (error) {
    // If offline or error, use cached data and apply filters manually
    console.log("Using cached students (offline mode)");
    let cachedStudents = await getCachedData("students");

    // Apply filters to cached data
    if (filters?.classId) {
      cachedStudents = cachedStudents.filter((s) => s.classId === filters.classId);
    }
    if (filters?.gender) {
      cachedStudents = cachedStudents.filter((s) => s.gender === filters.gender);
    }
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      cachedStudents = cachedStudents.filter((s) =>
        s.firstName?.toLowerCase().includes(searchLower) ||
        s.lastName?.toLowerCase().includes(searchLower)
      );
    }

    return cachedStudents;
  }
}

/**
 * Get age ranges with offline fallback
 */
export async function offlineGetAgeRanges() {
  try {
    // Try to get fresh data from server
    const { getAgeRanges } = await import("./actions");
    const ageRanges = await getAgeRanges();

    // Update cache with fresh data
    await cacheData("ageRanges", ageRanges as unknown as { id: number; [key: string]: unknown }[]);

    return ageRanges;
  } catch (error) {
    // If offline or error, use cached data
    console.log("Using cached age ranges (offline mode)");
    const cachedAgeRanges = await getCachedData("ageRanges");
    return cachedAgeRanges;
  }
}

/**
 * Get attendances with offline fallback
 */
export async function offlineGetAttendances(classId?: number) {
  try {
    // Try to get fresh data from server
    const { getAttendances } = await import("./actions");
    const attendances = await getAttendances(classId);

    // Update cache with fresh data
    await cacheData("attendances", attendances as unknown as { id: number; [key: string]: unknown }[]);

    return attendances;
  } catch (error) {
    // If offline or error, use cached data and filter by classId if provided
    console.log("Using cached attendances (offline mode)");
    let cachedAttendances = await getCachedData("attendances");

    if (classId) {
      cachedAttendances = cachedAttendances.filter((a) => a.classId === classId);
    }

    return cachedAttendances;
  }
}

/**
 * Calculate student attendance percentage with offline fallback
 * When offline, calculates from cached attendance records
 */
export async function offlineCalculateStudentAttendance(studentId: number): Promise<number> {
  try {
    // Try to calculate from server
    const { calculateStudentAttendance } = await import("./actions");
    return await calculateStudentAttendance(studentId);
  } catch (error) {
    // If offline, calculate from cached data
    console.log("Calculating attendance from cache (offline mode)");

    // Get student from cache to access attendance records
    const cachedStudents = await getCachedData("students");
    const student = cachedStudents.find((s) => s.id === studentId);

    if (!student || !student.attendanceRecords) {
      return 0;
    }

    const records = student.attendanceRecords as Array<{ present: boolean }>;
    if (records.length === 0) return 0;

    const presentCount = records.filter((record) => record.present).length;
    return Math.round((presentCount / records.length) * 100);
  }
}
