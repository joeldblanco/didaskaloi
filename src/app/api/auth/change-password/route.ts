import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth-utils";
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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return badRequest("Contraseña actual y nueva son requeridas");
    }

    if (newPassword.length < 8) {
      return badRequest("La nueva contraseña debe tener al menos 8 caracteres");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) return unauthorized();

    const isValid = await verifyPassword(currentPassword, dbUser.password);
    if (!isValid) {
      return badRequest("Contraseña actual incorrecta");
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return success({ message: "Contraseña actualizada" });
  } catch (error) {
    return serverError(error);
  }
}
