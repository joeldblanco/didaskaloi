import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateRequest,
  unauthorized,
  success,
  serverError,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!dbUser) return unauthorized();
    return success(dbUser);
  } catch (error) {
    return serverError(error);
  }
}
