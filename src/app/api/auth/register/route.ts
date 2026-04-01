import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { registerSchema } from "@/lib/auth-validations";
import { signToken, badRequest, success, serverError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(", ");
      return badRequest(errors);
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return badRequest("Este correo electrónico ya está registrado");
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, email: true, name: true },
    });

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return success({ token, user });
  } catch (error) {
    return serverError(error);
  }
}
