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

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) return badRequest("projectId es requerido");

    const canAccess = await hasPermission(user.id, projectId, Role.VIEWER);
    if (!canAccess) return forbidden();

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    const result = members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      userName: m.user.name,
      userEmail: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return success(result);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { projectId, userId, role } = body;

    if (!projectId || !userId || !role) {
      return badRequest("projectId, userId y role son requeridos");
    }

    if (!Object.values(Role).includes(role as Role)) {
      return badRequest("Rol no válido");
    }

    const isAdminUser = await hasPermission(user.id, projectId, Role.ADMIN);
    if (!isAdminUser) return forbidden();

    // Prevent changing owner's role
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userId) {
      return badRequest("No se puede cambiar el rol del propietario");
    }

    const updated = await prisma.projectMember.update({
      where: {
        userId_projectId: { userId, projectId },
      },
      data: { role: role as Role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return success({
      id: updated.id,
      userId: updated.user.id,
      userName: updated.user.name,
      userEmail: updated.user.email,
      role: updated.role,
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
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");

    if (!projectId || !userId) {
      return badRequest("projectId y userId son requeridos");
    }

    // Users can remove themselves, admins can remove others
    if (userId !== user.id) {
      const isAdminUser = await hasPermission(user.id, projectId, Role.ADMIN);
      if (!isAdminUser) return forbidden();
    }

    // Prevent removing the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userId) {
      return badRequest("El propietario no puede ser eliminado del proyecto");
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: { userId, projectId },
      },
    });

    return success({ message: "Miembro eliminado" });
  } catch (error) {
    return serverError(error);
  }
}
