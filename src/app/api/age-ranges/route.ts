import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ageRangeSchema } from "@/lib/validations";
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

    const ageRanges = await prisma.ageRange.findMany({
      where: { projectId },
      orderBy: { minAge: "asc" },
    });

    return success(ageRanges);
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
    const parsed = ageRangeSchema.safeParse(data);

    if (!parsed.success || !projectId) {
      return badRequest("Datos inválidos");
    }

    const canModify = await hasPermission(user.id, projectId, Role.EDITOR);
    if (!canModify) return forbidden();

    const ageRange = await prisma.ageRange.create({
      data: {
        label: parsed.data.label,
        minAge: parsed.data.minAge,
        maxAge: parsed.data.maxAge,
        projectId,
      },
    });

    return success(ageRange);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return badRequest("ID es requerido");

    const existing = await prisma.ageRange.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!existing) return badRequest("Rango de edad no encontrado");

    const canModify = await hasPermission(
      user.id,
      existing.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    const parsed = ageRangeSchema.safeParse(data);
    if (!parsed.success) return badRequest("Datos inválidos");

    const updated = await prisma.ageRange.update({
      where: { id },
      data: {
        label: parsed.data.label,
        minAge: parsed.data.minAge,
        maxAge: parsed.data.maxAge,
      },
    });

    return success(updated);
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

    const ageRange = await prisma.ageRange.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!ageRange) return badRequest("Rango de edad no encontrado");

    const canModify = await hasPermission(
      user.id,
      ageRange.projectId,
      Role.EDITOR,
    );
    if (!canModify) return forbidden();

    await prisma.ageRange.delete({ where: { id } });
    return success({ message: "Rango de edad eliminado" });
  } catch (error) {
    return serverError(error);
  }
}
