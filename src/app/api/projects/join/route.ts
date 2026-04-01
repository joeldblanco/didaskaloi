import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";
import { joinProjectSchema } from "@/lib/auth-validations";
import { Role } from "@prisma/client";
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
    const parsed = joinProjectSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return badRequest(errors);
    }

    const { accessCode, password } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { accessCode },
    });

    if (!project) {
      return badRequest("Código de acceso no válido");
    }

    const isValid = await verifyPassword(password, project.password);
    if (!isValid) {
      return badRequest("Contraseña incorrecta");
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: user.id, projectId: project.id },
      },
    });

    if (existingMember) {
      return badRequest("Ya eres miembro de este proyecto");
    }

    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: Role.VIEWER,
      },
    });

    return success({
      id: project.id,
      name: project.name,
      accessCode: project.accessCode,
      ownerId: project.ownerId,
      role: "VIEWER",
    });
  } catch (error) {
    return serverError(error);
  }
}
