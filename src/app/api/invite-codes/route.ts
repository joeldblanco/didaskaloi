import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createInviteCodeSchema } from "@/lib/auth-validations";
import { generateInviteCode } from "@/lib/auth-utils";
import { Role } from "@prisma/client";
import {
  authenticateRequest,
  unauthorized,
  forbidden,
  badRequest,
  success,
  serverError,
} from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = createInviteCodeSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return badRequest(errors);
    }

    const { projectId, role, maxUses, expiresAt } = parsed.data;

    const isAdminUser = await hasPermission(user.id, projectId, Role.ADMIN);
    if (!isAdminUser) return forbidden();

    const code = generateInviteCode();

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        projectId,
        role: role as Role,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return success({
      id: inviteCode.id,
      code: inviteCode.code,
      projectId: inviteCode.projectId,
      role: inviteCode.role,
      maxUses: inviteCode.maxUses,
      usedCount: inviteCode.usedCount,
      isActive: inviteCode.isActive,
      expiresAt: inviteCode.expiresAt,
      createdAt: inviteCode.createdAt,
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

    const inviteCode = await prisma.inviteCode.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!inviteCode) return badRequest("Código no encontrado");

    const isAdminUser = await hasPermission(
      user.id,
      inviteCode.projectId,
      Role.ADMIN,
    );
    if (!isAdminUser) return forbidden();

    await prisma.inviteCode.update({
      where: { id },
      data: { isActive: false },
    });

    return success({ message: "Código desactivado" });
  } catch (error) {
    return serverError(error);
  }
}
