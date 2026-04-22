import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission, getProjectIdFromClass } from "@/lib/permissions";
import { getAttendanceStats } from "@/lib/utils";
import { studentSchema } from "@/lib/validations";
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
    const projectId = searchParams.get("projectId");
    const classId = searchParams.get("classId");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search");

    if (!projectId) return badRequest("projectId es requerido");

    const canAccess = await hasPermission(user.id, projectId, Role.VIEWER);
    if (!canAccess) return forbidden();

    const where: Record<string, unknown> = {
      class: { projectId },
    };

    if (classId) where.classId = classId;
    if (gender) where.gender = gender;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        attendanceRecords: {
          select: { present: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const result = students.map((s) => {
      const stats = getAttendanceStats(s.attendanceRecords);
      const attendancePercentage =
        stats.markedCount > 0 ? stats.attendancePercentage : null;

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        age: s.age,
        classId: s.classId,
        className: s.class.name,
        attendancePercentage,
        createdAt: s.createdAt,
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
    const parsed = studentSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return badRequest(errors);
    }

    const { firstName, lastName, gender, age: rawAge, classId } = parsed.data;
    const age = rawAge === "" ? null : (rawAge ?? null);

    const projectId = await getProjectIdFromClass(classId);
    if (!projectId) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const existingStudent = await prisma.student.findFirst({
      where: {
        firstName: {
          equals: firstName,
          mode: "insensitive",
        },
        lastName: {
          equals: lastName,
          mode: "insensitive",
        },
        classId,
      },
      select: { id: true },
    });

    if (existingStudent) {
      return badRequest("Ya existe un estudiante con este nombre en la clase");
    }

    const student = await prisma.student.create({
      data: { firstName, lastName, gender, age, classId },
      include: { class: { select: { name: true } } },
    });

    return success({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      age: student.age,
      classId: student.classId,
      className: student.class.name,
      createdAt: student.createdAt,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return badRequest("ID es requerido");

    const existing = await prisma.student.findUnique({
      where: { id },
      select: { classId: true },
    });

    if (!existing) return badRequest("Estudiante no encontrado");

    const projectId = await getProjectIdFromClass(existing.classId);
    if (!projectId) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const parsed = studentSchema.safeParse({
      ...data,
      classId: data.classId || existing.classId,
    });
    if (!parsed.success) {
      return badRequest("Datos inválidos");
    }

    const existingStudent = await prisma.student.findFirst({
      where: {
        firstName: {
          equals: parsed.data.firstName,
          mode: "insensitive",
        },
        lastName: {
          equals: parsed.data.lastName,
          mode: "insensitive",
        },
        classId: parsed.data.classId,
        id: {
          not: id,
        },
      },
      select: { id: true },
    });

    if (existingStudent) {
      return badRequest(
        "Ya existe otro estudiante con este nombre en la clase",
      );
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        gender: parsed.data.gender,
        age: parsed.data.age === "" ? null : (parsed.data.age ?? null),
        classId: parsed.data.classId,
      },
      include: { class: { select: { name: true } } },
    });

    return success({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      age: student.age,
      classId: student.classId,
      className: student.class.name,
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

    const student = await prisma.student.findUnique({
      where: { id },
      select: { classId: true },
    });

    if (!student) return badRequest("Estudiante no encontrado");

    const projectId = await getProjectIdFromClass(student.classId);
    if (!projectId) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    await prisma.student.delete({ where: { id } });
    return success({ message: "Estudiante eliminado" });
  } catch (error) {
    return serverError(error);
  }
}
