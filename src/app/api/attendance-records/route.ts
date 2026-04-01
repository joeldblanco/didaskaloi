import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";
import {
  authenticateRequest,
  unauthorized,
  forbidden,
  badRequest,
  success,
  serverError,
} from "@/lib/api-utils";

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { studentId, attendanceId, present } = body;

    if (!studentId || !attendanceId || typeof present !== "boolean") {
      return badRequest("studentId, attendanceId y present son requeridos");
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { class: { select: { projectId: true } } },
    });

    if (!attendance) return badRequest("Asistencia no encontrada");

    const canModify = await hasPermission(
      user.id,
      attendance.class.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    const record = await prisma.attendanceRecord.upsert({
      where: {
        studentId_attendanceId: { studentId, attendanceId },
      },
      update: { present },
      create: { studentId, attendanceId, present },
    });

    return success({
      id: record.id,
      studentId: record.studentId,
      attendanceId: record.attendanceId,
      present: record.present,
    });
  } catch (error) {
    return serverError(error);
  }
}
