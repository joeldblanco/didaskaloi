import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";
import { joinWithInviteSchema } from "@/lib/auth-validations";
import {
  authenticateRequest,
  unauthorized,
  badRequest,
  success,
  serverError,
} from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = joinWithInviteSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return badRequest(errors);
    }

    const { inviteCode, projectPassword: password } = parsed.data;

    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode },
      include: { project: true },
    });

    if (!invite || !invite.isActive) {
      return badRequest("Código de invitación no válido o inactivo");
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return badRequest("El código de invitación ha expirado");
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return badRequest(
        "El código de invitación ha alcanzado el límite de usos",
      );
    }

    const isValid = await verifyPassword(password, invite.project.password);
    if (!isValid) {
      return badRequest("Contraseña incorrecta");
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: invite.projectId,
        },
      },
    });

    if (existingMember) {
      return badRequest("Ya eres miembro de este proyecto");
    }

    await prisma.$transaction([
      prisma.projectMember.create({
        data: {
          userId: user.id,
          projectId: invite.projectId,
          role: invite.role,
        },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return success({
      id: invite.project.id,
      name: invite.project.name,
      accessCode: invite.project.accessCode,
      ownerId: invite.project.ownerId,
      role: invite.role,
    });
  } catch (error) {
    return serverError(error);
  }
}
