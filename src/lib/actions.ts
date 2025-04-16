"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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

// Class actions
export async function createClass(data: ClassFormValues) {
  const validatedData = classSchema.parse(data);

  try {
    await prisma.class.create({
      data: {
        name: validatedData.name,
      },
    });

    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error creating class:", error);
    return { success: false, error: "Error al crear la clase" };
  }
}

export async function updateClass(data: ClassFormValues) {
  const validatedData = classSchema.parse(data);

  if (!validatedData.id) {
    return { success: false, error: "ID de clase no proporcionado" };
  }

  try {
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
    return { success: false, error: "Error al actualizar la clase" };
  }
}

export async function deleteClass(id: number) {
  try {
    await prisma.class.delete({
      where: { id },
    });

    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error deleting class:", error);
    return { success: false, error: "Error al eliminar la clase" };
  }
}

// Student actions
export async function createStudent(data: StudentFormValues) {
  const validatedData = studentSchema.parse(data);

  try {
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
    return { success: false, error: "Error al crear el estudiante" };
  }
}

export async function updateStudent(data: StudentFormValues) {
  const validatedData = studentSchema.parse(data);

  if (!validatedData.id) {
    return { success: false, error: "ID de estudiante no proporcionado" };
  }

  try {
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
    return { success: false, error: "Error al actualizar el estudiante" };
  }
}

export async function deleteStudent(id: number) {
  try {
    await prisma.student.delete({
      where: { id },
    });

    revalidatePath("/estudiantes");
    revalidatePath("/clases");
    return { success: true };
  } catch (error) {
    console.error("Error deleting student:", error);
    return { success: false, error: "Error al eliminar el estudiante" };
  }
}

// Age Range actions
export async function createAgeRange(data: AgeRangeFormValues) {
  const validatedData = ageRangeSchema.parse(data);

  try {
    await prisma.ageRange.create({
      data: {
        label: validatedData.label,
        minAge: validatedData.minAge,
        maxAge: validatedData.maxAge,
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
    await prisma.ageRange.delete({
      where: { id },
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error deleting age range:", error);
    return { success: false, error: "Error al eliminar el rango de edad" };
  }
}

// Attendance actions
export async function createAttendance(data: AttendanceFormValues) {
  const validatedData = attendanceSchema.parse(data);

  try {
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
    return { success: false, error: "Error al crear la asistencia" };
  }
}

export async function updateAttendanceRecord(data: AttendanceRecordFormValues) {
  const validatedData = attendanceRecordSchema.parse(data);

  try {
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
    await prisma.attendance.delete({
      where: { id },
    });

    revalidatePath("/asistencia");
    return { success: true };
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return { success: false, error: "Error al eliminar la asistencia" };
  }
}

// Data Fetching Functions
export async function getClasses() {
  try {
    return await prisma.class.findMany({
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
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

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

export async function getAgeRanges() {
  try {
    return await prisma.ageRange.findMany({
      orderBy: {
        minAge: "asc",
      },
    });
  } catch (error) {
    console.error("Error fetching age ranges:", error);
    return [];
  }
}

export async function getAttendances(classId?: number) {
  try {
    const where = classId ? { classId } : {};

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
    return await prisma.attendance.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            students: true,
          },
        },
        records: {
          include: {
            student: true,
          },
        },
      },
    });
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
