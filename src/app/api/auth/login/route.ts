import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";
import { loginSchema } from "@/lib/auth-validations";
import { signToken, badRequest, success, serverError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Credenciales inválidas");
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return badRequest("Credenciales inválidas");
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return badRequest("Credenciales inválidas");
    }

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return success({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return serverError(error);
  }
}
