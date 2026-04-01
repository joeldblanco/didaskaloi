import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateProjectCode } from "@/lib/auth-utils";
import { createProjectSchema } from "@/lib/auth-validations";
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

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: user.id } },
      },
      include: {
        _count: { select: { members: true, classes: true } },
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      accessCode: p.accessCode,
      ownerId: p.ownerId,
      role: p.members[0]?.role,
      memberCount: p._count.members,
      classCount: p._count.classes,
      createdAt: p.createdAt,
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
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return badRequest(errors);
    }

    const { name, password } = parsed.data;
    const hashedPassword = await hashPassword(password);
    const accessCode = generateProjectCode();

    const project = await prisma.project.create({
      data: {
        name,
        accessCode,
        password: hashedPassword,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: Role.ADMIN,
          },
        },
      },
    });

    return success({
      id: project.id,
      name: project.name,
      accessCode: project.accessCode,
      ownerId: project.ownerId,
      role: "ADMIN",
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
    const { id, name } = body;

    if (!id || !name) {
      return badRequest("ID y nombre son requeridos");
    }

    const isAdminUser = await hasPermission(user.id, id, Role.ADMIN);
    if (!isAdminUser) return forbidden();

    const project = await prisma.project.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, accessCode: true, ownerId: true },
    });

    return success(project);
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

    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!project) return badRequest("Proyecto no encontrado");
    if (project.ownerId !== user.id) return forbidden();

    await prisma.project.delete({ where: { id } });
    return success({ message: "Proyecto eliminado" });
  } catch (error) {
    return serverError(error);
  }
}
