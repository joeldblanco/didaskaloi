import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { classSchema } from "@/lib/validations";
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

    if (!projectId) return badRequest("projectId es requerido");

    const canAccess = await hasPermission(user.id, projectId, Role.VIEWER);
    if (!canAccess) return forbidden();

    const classes = await prisma.class.findMany({
      where: { projectId },
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = classes.map((c) => ({
      id: c.id,
      name: c.name,
      iconKey: c.iconKey,
      projectId: c.projectId,
      studentCount: c._count.students,
      createdAt: c.createdAt,
    }));

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
    const { projectId, ...data } = body;
    const parsed = classSchema.safeParse(data);

    if (!parsed.success || !projectId) {
      return badRequest("Datos inválidos");
    }

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const existing = await prisma.class.findFirst({
      where: { name: parsed.data.name, projectId },
    });

    if (existing) {
      return badRequest("Ya existe una clase con ese nombre");
    }

    const newClass = await prisma.class.create({
      data: {
        name: parsed.data.name,
        iconKey: parsed.data.iconKey ?? "class",
        projectId,
      },
      include: { _count: { select: { students: true } } },
    });

    return success({
      id: newClass.id,
      name: newClass.name,
      iconKey: newClass.iconKey,
      projectId: newClass.projectId,
      studentCount: newClass._count.students,
      createdAt: newClass.createdAt,
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
    const { id, name, iconKey } = body;

    if (!id || !name) return badRequest("ID y nombre son requeridos");

    const classData = await prisma.class.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!classData) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(
      user.id,
      classData.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    const updated = await prisma.class.update({
      where: { id },
      data: { name, iconKey: iconKey ?? undefined },
      include: { _count: { select: { students: true } } },
    });

    return success({
      id: updated.id,
      name: updated.name,
      iconKey: updated.iconKey,
      projectId: updated.projectId,
      studentCount: updated._count.students,
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

    const classData = await prisma.class.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!classData) return badRequest("Clase no encontrada");

    const canModify = await hasPermission(
      user.id,
      classData.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    await prisma.class.delete({ where: { id } });
    return success({ message: "Clase eliminada" });
  } catch (error) {
    return serverError(error);
  }
}
