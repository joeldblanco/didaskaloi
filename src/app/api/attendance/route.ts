import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission, getProjectIdFromClass } from "@/lib/permissions";
import { Role } from "@prisma/client";
import {
  authenticateRequest,
  unauthorized,
  forbidden,
  badRequest,
  success,
  serverError,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const projectId = searchParams.get("projectId");
    const id = searchParams.get("id");

    // Get single attendance with records
    if (id) {
      const attendance = await prisma.attendance.findUnique({
        where: { id },
        include: {
          records: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
            },
          },
          class: { select: { projectId: true } },
        },
      });

      if (!attendance) return badRequest("Asistencia no encontrada");

      const canAccess = await hasPermission(
        user.id,
        attendance.class.projectId,
        Role.VIEWER,
      );
      if (!canAccess) return forbidden();

      return success({
        id: attendance.id,
        date: attendance.date,
        classId: attendance.classId,
        records: attendance.records.map((r) => ({
          id: r.id,
          studentId: r.studentId,
          attendanceId: r.attendanceId,
          present: r.present,
          studentFirstName: r.student.firstName,
          studentLastName: r.student.lastName,
          studentGender: r.student.gender,
        })),
      });
    }

    // Get attendances for a class
    if (!classId && !projectId) {
      return badRequest("classId o projectId es requerido");
    }

    const pid =
      projectId || (classId ? await getProjectIdFromClass(classId) : null);
    if (!pid) return badRequest("Proyecto no encontrado");

    const canAccess = await hasPermission(user.id, pid, Role.VIEWER);
    if (!canAccess) return forbidden();

    const where: Record<string, unknown> = {};
    if (classId) {
      where.classId = classId;
    } else {
      where.class = { projectId: pid };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        _count: { select: { records: true } },
        records: { select: { present: true } },
      },
      orderBy: { date: "desc" },
    });

    const result = attendances.map((a) => {
      const totalRecords = a.records.length;
      const presentCount = a.records.filter((r) => r.present).length;

      return {
        id: a.id,
        date: a.date,
        classId: a.classId,
        totalRecords,
        presentCount,
        absentCount: totalRecords - presentCount,
        attendanceRate:
          totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
      };
    });

    return success(result);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { date, classId } = body;

    if (!date || !classId) {
      return badRequest("Fecha y clase son requeridos");
    }

    const projectId = await getProjectIdFromClass(classId);
    if (!projectId) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const attendanceDate = new Date(date);

    const existing = await prisma.attendance.findUnique({
      where: {
        date_classId: { date: attendanceDate, classId },
      },
    });

    if (existing) {
      return badRequest("Ya existe un registro de asistencia para esta fecha");
    }

    // Create attendance with records for all students in the class (default absent)
    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });

    const attendance = await prisma.attendance.create({
      data: {
        date: attendanceDate,
        classId,
        records: {
          create: students.map((s) => ({
            studentId: s.id,
            present: false,
          })),
        },
      },
      include: {
        records: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
              },
            },
          },
        },
      },
    });

    return success({
      id: attendance.id,
      date: attendance.date,
      classId: attendance.classId,
      records: attendance.records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        attendanceId: r.attendanceId,
        present: r.present,
        studentFirstName: r.student.firstName,
        studentLastName: r.student.lastName,
        studentGender: r.student.gender,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return badRequest("ID es requerido");

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: { class: { select: { projectId: true } } },
    });

    if (!attendance) return badRequest("Asistencia no encontrada");

    const canModify = await hasPermission(
      user.id,
      attendance.class.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    await prisma.attendance.delete({ where: { id } });
    return success({ message: "Asistencia eliminada" });
  } catch (error) {
    return serverError(error);
  }
}
