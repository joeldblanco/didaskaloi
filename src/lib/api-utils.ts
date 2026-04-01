import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "");

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(
  req: NextRequest,
): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "No autorizado" },
    { status: 401 },
  );
}

export function forbidden() {
  return NextResponse.json(
    { success: false, error: "Sin permisos" },
    { status: 403 },
  );
}

export function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function success(data: unknown = null) {
  return NextResponse.json({ success: true, data });
}

export function serverError(error: unknown) {
  console.error("API Error:", error);
  return NextResponse.json(
    { success: false, error: "Error interno del servidor" },
    { status: 500 },
  );
}
