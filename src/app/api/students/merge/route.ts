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
      firstStudentId?: string;
      secondStudentId?: string;
      keepStudentId?: string;
    };

    const firstStudentId = body.firstStudentId?.trim();
    const secondStudentId = body.secondStudentId?.trim();
    const keepStudentId = body.keepStudentId?.trim();

    if (!firstStudentId || !secondStudentId || !keepStudentId) {
      return badRequest("Debes seleccionar dos estudiantes y cuál conservar");
    }

    if (firstStudentId === secondStudentId) {
      return badRequest("Debes seleccionar dos estudiantes distintos");
    }

    if (keepStudentId != firstStudentId && keepStudentId != secondStudentId) {
      return badRequest("Debes elegir cuál de los dos estudiantes conservar");
    }

    const students = await prisma.student.findMany({
      where: {
        id: {
          in: [firstStudentId, secondStudentId],
        },
      },
      select: {
        id: true,
        classId: true,
      },
    });

    if (students.length != 2) {
      return badRequest("No se encontraron ambos estudiantes para fusionar");
    }

    const [firstStudent, secondStudent] = students;
    if (firstStudent.classId != secondStudent.classId) {
      return badRequest("Solo puedes fusionar estudiantes de la misma clase");
    }

    const projectId = await getProjectIdFromClass(firstStudent.classId);
    if (!projectId) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const removedStudentId =
      keepStudentId == firstStudentId ? secondStudentId : firstStudentId;

    await prisma.$transaction(async (tx) => {
      const attendanceRecords = await tx.attendanceRecord.findMany({
        where: {
          studentId: {
            in: [keepStudentId, removedStudentId],
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const recordsByAttendance = new Map<
        string,
        {
          kept?: (typeof attendanceRecords)[number];
          removed?: (typeof attendanceRecords)[number];
        }
      >();

      for (const record of attendanceRecords) {
        const current = recordsByAttendance.get(record.attendanceId) ?? {};

        if (record.studentId == keepStudentId) {
          current.kept = record;
        } else {
          current.removed = record;
        }

        recordsByAttendance.set(record.attendanceId, current);
      }

      for (const { kept, removed } of recordsByAttendance.values()) {
        if (kept && removed) {
          const mergedPresence = mergeAttendancePresence(
            kept.present,
            removed.present,
          );

          if (kept.present !== mergedPresence) {
            await tx.attendanceRecord.update({
              where: { id: kept.id },
              data: { present: mergedPresence },
            });
          }

          await tx.attendanceRecord.delete({
            where: { id: removed.id },
          });
          continue;
        }

        if (removed) {
          await tx.attendanceRecord.update({
            where: { id: removed.id },
            data: { studentId: keepStudentId },
          });
        }
      }

      await tx.student.delete({
        where: { id: removedStudentId },
      });
    });

    return success({ keptStudentId });
  } catch (error) {
    return serverError(error);
  }
}