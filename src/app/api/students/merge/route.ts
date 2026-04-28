import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

import {
  authenticateRequest,
  badRequest,
  forbidden,
  serverError,
  success,
  unauthorized,
} from "@/lib/api-utils";
import { getProjectIdFromClass, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function mergeAttendancePresence(
  firstPresence: boolean | null,
  secondPresence: boolean | null,
) {
  if (firstPresence === true || secondPresence === true) {
    return true;
  }

  if (firstPresence === false || secondPresence === false) {
    return false;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as {
      studentIds?: string[];
      firstStudentId?: string;
      secondStudentId?: string;
      keepStudentId?: string;
    };

    const keepStudentId = body.keepStudentId?.trim();
    const studentIds = Array.from(
      new Set(
        (
          body.studentIds ??
          [body.firstStudentId, body.secondStudentId]
            .filter((value): value is string => Boolean(value))
            .map((value) => value.trim())
        ).filter((value) => value.length > 0),
      ),
    );

    if (!keepStudentId || studentIds.length < 2) {
      return badRequest(
        "Debes seleccionar al menos dos estudiantes y cuál conservar",
      );
    }

    if (!studentIds.includes(keepStudentId)) {
      return badRequest(
        "Debes elegir cuál de los estudiantes seleccionados conservar",
      );
    }

    const students = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        classId: true,
      },
    });

    if (students.length != studentIds.length) {
      return badRequest(
        "No se encontraron todos los estudiantes seleccionados para fusionar",
      );
    }

    const classId = students[0].classId;
    if (students.some((student) => student.classId != classId)) {
      return badRequest("Solo puedes fusionar estudiantes de la misma clase");
    }

    const projectId = await getProjectIdFromClass(classId);
    if (!projectId) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const removedStudentIds = studentIds
      .where((id) => id != keepStudentId)
      .toList();

    await prisma.$transaction(async (tx) => {
      const attendanceRecords = await tx.attendanceRecord.findMany({
        where: {
          studentId: {
            in: studentIds,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const recordsByAttendance = new Map<string, typeof attendanceRecords>();

      for (const record of attendanceRecords) {
        const current = recordsByAttendance.get(record.attendanceId) ?? [];
        current.push(record);
        recordsByAttendance.set(record.attendanceId, current);
      }

      for (const records of recordsByAttendance.values()) {
        const mergedPresence = records.reduce<boolean | null>(
          (currentPresence, record) =>
            mergeAttendancePresence(currentPresence, record.present),
          null,
        );
        const recordToKeep =
          records.find((record) => record.studentId == keepStudentId) ??
          records[0];
        const recordsToDelete = records.filter(
          (record) => record.id != recordToKeep.id,
        );

        if (
          recordToKeep.studentId != keepStudentId ||
          recordToKeep.present !== mergedPresence
        ) {
          await tx.attendanceRecord.update({
            where: { id: recordToKeep.id },
            data: {
              studentId: keepStudentId,
              present: mergedPresence,
            },
          });
        }

        for (const recordToDelete of recordsToDelete) {
          await tx.attendanceRecord.delete({
            where: { id: recordToDelete.id },
          });
        }
      }

      await tx.student.deleteMany({
        where: {
          id: {
            in: removedStudentIds,
          },
        },
      });
    });

    return success({ keptStudentId, mergedStudentIds: removedStudentIds });
  } catch (error) {
    return serverError(error);
  }
}
