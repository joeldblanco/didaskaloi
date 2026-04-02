import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Role, Gender } from "@prisma/client";
import {
  authenticateRequest,
  unauthorized,
  forbidden,
  badRequest,
  success,
  serverError,
} from "@/lib/api-utils";

interface ParsedStudent {
  firstName: string;
  lastName: string;
  age?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { attendanceId, students } = body as {
      attendanceId: string;
      students: ParsedStudent[];
    };

    if (!attendanceId || !Array.isArray(students) || students.length === 0) {
      return badRequest(
        "attendanceId y una lista de estudiantes son requeridos",
      );
    }

    // Get attendance with class info
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        class: { select: { id: true, projectId: true } },
        records: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) return badRequest("Asistencia no encontrada");

    const canModify = await hasPermission(
      user.id,
      attendance.class.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    const classId = attendance.class.id;
    const results: {
      created: string[];
      markedPresent: string[];
      alreadyPresent: string[];
    } = {
      created: [],
      markedPresent: [],
      alreadyPresent: [],
    };

    for (const entry of students) {
      const firstName = entry.firstName.trim();
      const lastName = entry.lastName.trim();

      if (!firstName || !lastName) continue;

      // Find existing record for this student in this attendance
      const existingRecord = attendance.records.find(
        (r) =>
          r.student.firstName.toLowerCase() === firstName.toLowerCase() &&
          r.student.lastName.toLowerCase() === lastName.toLowerCase(),
      );

      if (existingRecord) {
        if (existingRecord.present) {
          // Already present, skip
          results.alreadyPresent.push(`${firstName} ${lastName}`);
        } else {
          // Mark as present
          await prisma.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: { present: true },
          });
          results.markedPresent.push(`${firstName} ${lastName}`);
        }
      } else {
        // Check if student exists in the class but has no record in this attendance
        let student = await prisma.student.findFirst({
          where: {
            classId,
            firstName: { equals: firstName, mode: "insensitive" },
            lastName: { equals: lastName, mode: "insensitive" },
          },
        });

        if (!student) {
          // Create the student
          student = await prisma.student.create({
            data: {
              firstName,
              lastName,
              gender: Gender.M, // Default gender
              age: entry.age ?? null,
              classId,
            },
          });
          results.created.push(`${firstName} ${lastName}`);
        }

        // Create attendance record as present
        await prisma.attendanceRecord.create({
          data: {
            studentId: student.id,
            attendanceId,
            present: true,
          },
        });
        results.markedPresent.push(`${firstName} ${lastName}`);
      }
    }

    // Return updated attendance
    const updated = await prisma.attendance.findUnique({
      where: { id: attendanceId },
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

    const response = {
      id: updated!.id,
      date: updated!.date,
      classId: updated!.classId,
      records: updated!.records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        attendanceId: r.attendanceId,
        present: r.present,
        studentFirstName: r.student.firstName,
        studentLastName: r.student.lastName,
        studentGender: r.student.gender,
      })),
      importResults: results,
    };

    return success(response);
  } catch (error) {
    return serverError(error);
  }
}
