"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import {
  classSchema,
  studentSchema,
  ageRangeSchema,
  attendanceSchema,
  attendanceRecordSchema,
  type ClassFormValues,
  type StudentFormValues,
  type AgeRangeFormValues,
  type AttendanceFormValues,
  type AttendanceRecordFormValues,
} from "@/lib/validations";
import {
  getCurrentUser,
  canEdit,
  verifyClassAccess,
  getActiveProjectId,
} from "@/lib/permissions";

// Class actions
export async function createClass(data: ClassFormValues, projectId?: number) {
  const validatedData = classSchema.parse(data);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get active project if not provided
    const activeProjectId = projectId || (await getActiveProjectId());
    if (!activeProjectId) {
      return { success: false, error: "No hay proyecto activo" };
    }

    // Check if user can edit
    const hasEditPermission = await canEdit(user.id, activeProjectId);
    if (!hasEditPermission) {
      return { success: false, error: "No tienes permisos para crear clases" };
    }

    // Check for duplicate class name in the same project
    const existingClass = await prisma.class.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive",
        },
        projectId: activeProjectId,
      },
    });

    if (existingClass) {
      return { success: false, error: "Ya existe una clase con este nombre en este proyecto" };
    }

    await prisma.class.create({
      data: {
        name: validatedData.name,
        projectId: activeProjectId,
      },
    });

    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error creating class:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, error: "Ya existe una clase con este nombre" };
      }
    }
    return { success: false, error: "Error al crear la clase" };
  }
}

export async function updateClass(data: ClassFormValues) {
  const validatedData = classSchema.parse(data);

  if (!validatedData.id) {
    return { success: false, error: "ID de clase no proporcionado" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Verify access to this class
    const { hasAccess, projectId } = await verifyClassAccess(user.id, validatedData.id, Role.EDITOR);
    if (!hasAccess || !projectId) {
      return { success: false, error: "No tienes permisos para actualizar esta clase" };
    }

    // Check for duplicate class name (excluding current class)
    const existingClass = await prisma.class.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive",
        },
        projectId,
        id: {
          not: validatedData.id,
        },
      },
    });

    if (existingClass) {
      return { success: false, error: "Ya existe otra clase con este nombre" };
    }

    await prisma.class.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
      },
    });

    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error updating class:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Clase no encontrada" };
      }
      if (error.code === "P2002") {
        return { success: false, error: "Ya existe otra clase con este nombre" };
      }
    }
    return { success: false, error: "Error al actualizar la clase" };
  }
}

export async function deleteClass(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Verify access to this class
    const { hasAccess } = await verifyClassAccess(user.id, id, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para eliminar esta clase" };
    }

    await prisma.class.delete({
      where: { id },
    });

    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error deleting class:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Clase no encontrada" };
      }
    }
    return { success: false, error: "Error al eliminar la clase" };
  }
}

// Student actions
export async function createStudent(data: StudentFormValues) {
  const validatedData = studentSchema.parse(data);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Verify access to the class
    const { hasAccess } = await verifyClassAccess(user.id, validatedData.classId, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para crear estudiantes en esta clase" };
    }

    // Check for duplicate student in the same class
    const existingStudent = await prisma.student.findFirst({
      where: {
        firstName: {
          equals: validatedData.firstName,
          mode: "insensitive",
        },
        lastName: {
          equals: validatedData.lastName,
          mode: "insensitive",
        },
        classId: validatedData.classId,
      },
    });

    if (existingStudent) {
      return {
        success: false,
        error: "Ya existe un estudiante con este nombre en la clase",
      };
    }

    await prisma.student.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        gender: validatedData.gender,
        age: validatedData.age,
        classId: validatedData.classId,
      },
    });

    revalidatePath("/estudiantes");
    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error creating student:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return { success: false, error: "La clase especificada no existe" };
      }
    }
    return { success: false, error: "Error al crear el estudiante" };
  }
}

export async function updateStudent(data: StudentFormValues) {
  const validatedData = studentSchema.parse(data);

  if (!validatedData.id) {
    return { success: false, error: "ID de estudiante no proporcionado" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Verify access to the class
    const { hasAccess } = await verifyClassAccess(user.id, validatedData.classId, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para actualizar estudiantes en esta clase" };
    }

    // Check for duplicate student in the same class (excluding current student)
    const existingStudent = await prisma.student.findFirst({
      where: {
        firstName: {
          equals: validatedData.firstName,
          mode: "insensitive",
        },
        lastName: {
          equals: validatedData.lastName,
          mode: "insensitive",
        },
        classId: validatedData.classId,
        id: {
          not: validatedData.id,
        },
      },
    });

    if (existingStudent) {
      return {
        success: false,
        error: "Ya existe otro estudiante con este nombre en la clase",
      };
    }

    await prisma.student.update({
      where: { id: validatedData.id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        gender: validatedData.gender,
        age: validatedData.age,
        classId: validatedData.classId,
      },
    });

    revalidatePath("/estudiantes");
    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error updating student:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Estudiante no encontrado" };
      }
      if (error.code === "P2003") {
        return { success: false, error: "La clase especificada no existe" };
      }
    }
    return { success: false, error: "Error al actualizar el estudiante" };
  }
}

export async function deleteStudent(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get student to verify class access
    const student = await prisma.student.findUnique({
      where: { id },
      select: { classId: true },
    });

    if (!student) {
      return { success: false, error: "Estudiante no encontrado" };
    }

    // Verify access to the class
    const { hasAccess } = await verifyClassAccess(user.id, student.classId, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para eliminar estudiantes en esta clase" };
    }

    await prisma.student.delete({
      where: { id },
    });

    revalidatePath("/estudiantes");
    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error deleting student:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Estudiante no encontrado" };
      }
    }
    return { success: false, error: "Error al eliminar el estudiante" };
  }
}

// Age Range actions
export async function createAgeRange(data: AgeRangeFormValues, projectId?: number) {
  const validatedData = ageRangeSchema.parse(data);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get active project if not provided
    const activeProjectId = projectId || (await getActiveProjectId());
    if (!activeProjectId) {
      return { success: false, error: "No hay proyecto activo" };
    }

    // Check if user can edit
    const hasEditPermission = await canEdit(user.id, activeProjectId);
    if (!hasEditPermission) {
      return { success: false, error: "No tienes permisos para crear rangos de edad" };
    }

    await prisma.ageRange.create({
      data: {
        label: validatedData.label,
        minAge: validatedData.minAge,
        maxAge: validatedData.maxAge,
        projectId: activeProjectId,
      },
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error creating age range:", error);
    return { success: false, error: "Error al crear el rango de edad" };
  }
}

export async function updateAgeRange(data: AgeRangeFormValues) {
  const validatedData = ageRangeSchema.parse(data);

  if (!validatedData.id) {
    return { success: false, error: "ID de rango de edad no proporcionado" };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get age range to verify project access
    const ageRange = await prisma.ageRange.findUnique({
      where: { id: validatedData.id },
      select: { projectId: true },
    });

    if (!ageRange) {
      return { success: false, error: "Rango de edad no encontrado" };
    }

    // Check if user can edit
    const hasEditPermission = await canEdit(user.id, ageRange.projectId);
    if (!hasEditPermission) {
      return { success: false, error: "No tienes permisos para actualizar este rango de edad" };
    }

    await prisma.ageRange.update({
      where: { id: validatedData.id },
      data: {
        label: validatedData.label,
        minAge: validatedData.minAge,
        maxAge: validatedData.maxAge,
      },
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error updating age range:", error);
    return { success: false, error: "Error al actualizar el rango de edad" };
  }
}

export async function deleteAgeRange(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get age range to verify project access
    const ageRange = await prisma.ageRange.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!ageRange) {
      return { success: false, error: "Rango de edad no encontrado" };
    }

    // Check if user can edit
    const hasEditPermission = await canEdit(user.id, ageRange.projectId);
    if (!hasEditPermission) {
      return { success: false, error: "No tienes permisos para eliminar este rango de edad" };
    }

    await prisma.ageRange.delete({
      where: { id },
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error deleting age range:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Rango de edad no encontrado" };
      }
    }
    return { success: false, error: "Error al eliminar el rango de edad" };
  }
}

// Attendance actions
export async function createAttendance(data: AttendanceFormValues) {
  const validatedData = attendanceSchema.parse(data);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Verify access to the class
    const { hasAccess } = await verifyClassAccess(user.id, validatedData.classId, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para crear asistencia en esta clase" };
    }

    // Check for duplicate attendance (same date and class)
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        date: validatedData.date,
        classId: validatedData.classId,
      },
    });

    if (existingAttendance) {
      return {
        success: false,
        error: "Ya existe un registro de asistencia para esta fecha y clase",
      };
    }

    const attendance = await prisma.attendance.create({
      data: {
        date: validatedData.date,
        classId: validatedData.classId,
      },
      include: {
        class: {
          include: {
            students: true,
          },
        },
      },
    });

    // Create attendance records for all students in the class
    const attendanceRecords = attendance.class.students.map((student) => ({
      studentId: student.id,
      attendanceId: attendance.id,
      present: false,
    }));

    if (attendanceRecords.length > 0) {
      await prisma.attendanceRecord.createMany({
        data: attendanceRecords,
      });
    }

    revalidatePath("/asistencia");
    return { success: true, attendanceId: attendance.id };
  } catch (error) {
    console.error("Error creating attendance:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "Ya existe un registro de asistencia para esta fecha y clase",
        };
      }
      if (error.code === "P2003") {
        return { success: false, error: "La clase especificada no existe" };
      }
    }
    return { success: false, error: "Error al crear la asistencia" };
  }
}

export async function updateAttendanceRecord(data: AttendanceRecordFormValues) {
  const validatedData = attendanceRecordSchema.parse(data);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get attendance to verify class access
    const attendance = await prisma.attendance.findUnique({
      where: { id: validatedData.attendanceId },
      select: { classId: true },
    });

    if (!attendance) {
      return { success: false, error: "Registro de asistencia no encontrado" };
    }

    // Verify access to the class
    const { hasAccess } = await verifyClassAccess(user.id, attendance.classId, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para actualizar la asistencia en esta clase" };
    }

    await prisma.attendanceRecord.upsert({
      where: {
        studentId_attendanceId: {
          studentId: validatedData.studentId,
          attendanceId: validatedData.attendanceId,
        },
      },
      update: {
        present: validatedData.present,
      },
      create: {
        studentId: validatedData.studentId,
        attendanceId: validatedData.attendanceId,
        present: validatedData.present,
      },
    });

    revalidatePath("/asistencia");
    return { success: true };
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return {
      success: false,
      error: "Error al actualizar el registro de asistencia",
    };
  }
}

export async function deleteAttendance(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Get attendance to verify class access
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      select: { classId: true },
    });

    if (!attendance) {
      return { success: false, error: "Registro de asistencia no encontrado" };
    }

    // Verify access to the class
    const { hasAccess } = await verifyClassAccess(user.id, attendance.classId, Role.EDITOR);
    if (!hasAccess) {
      return { success: false, error: "No tienes permisos para eliminar la asistencia en esta clase" };
    }

    await prisma.attendance.delete({
      where: { id },
    });

    revalidatePath("/asistencia");
    return { success: true };
  } catch (error) {
    console.error("Error deleting attendance:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "Registro de asistencia no encontrado" };
      }
    }
    return { success: false, error: "Error al eliminar la asistencia" };
  }
}

// Data Fetching Functions
export async function getClasses(projectId?: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // Get active project if not provided
    const activeProjectId = projectId || (await getActiveProjectId());
    if (!activeProjectId) {
      return [];
    }

    return await prisma.class.findMany({
      where: {
        projectId: activeProjectId,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
}

export async function getStudents(filters?: {
  classId?: number;
  gender?: "M" | "F";
  searchTerm?: string;
  projectId?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // Get active project if not provided
    const activeProjectId = filters?.projectId || (await getActiveProjectId());
    if (!activeProjectId) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      class: {
        projectId: activeProjectId,
      },
    };

    if (filters?.classId) {
      where.classId = filters.classId;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: "insensitive" } },
        { lastName: { contains: filters.searchTerm, mode: "insensitive" } },
      ];
    }

    return await prisma.student.findMany({
      where,
      include: {
        class: true,
        attendanceRecords: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export async function getAgeRanges(projectId?: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // Get active project if not provided
    const activeProjectId = projectId || (await getActiveProjectId());
    if (!activeProjectId) {
      return [];
    }

    return await prisma.ageRange.findMany({
      where: {
        projectId: activeProjectId,
      },
      orderBy: {
        minAge: "asc",
      },
    });
  } catch (error) {
    console.error("Error fetching age ranges:", error);
    return [];
  }
}

export async function getAttendances(classId?: number, projectId?: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // Get active project if not provided
    const activeProjectId = projectId || (await getActiveProjectId());
    if (!activeProjectId) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      class: {
        projectId: activeProjectId,
      },
    };

    if (classId) {
      where.classId = classId;
    }

    return await prisma.attendance.findMany({
      where,
      include: {
        class: true,
        records: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching attendances:", error);
    return [];
  }
}

export async function getAttendance(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            students: true,
            project: true,
          },
        },
        records: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!attendance) {
      return null;
    }

    // Verify user has access to this project
    const hasEditPermission = await canEdit(user.id, attendance.class.projectId);
    if (!hasEditPermission) {
      return null;
    }

    return attendance;
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return null;
  }
}

// Calculate attendance percentage for a student
export async function calculateStudentAttendance(studentId: number) {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId,
      },
    });

    if (records.length === 0) return 0;

    const presentCount = records.filter((record) => record.present).length;
    return Math.round((presentCount / records.length) * 100);
  } catch (error) {
    console.error("Error calculating student attendance:", error);
    return 0;
  }
}
