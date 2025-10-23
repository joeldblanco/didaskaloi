"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/auth-validations";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

/**
 * Register a new user
 */
export async function registerUser(data: RegisterFormValues) {
  try {
    const validatedData = registerSchema.parse(data);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Este email ya está registrado" };
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, error: "Error al registrar el usuario" };
  }
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Email o contraseña incorrectos" };
        default:
          return { success: false, error: "Error al iniciar sesión" };
      }
    }
    return { success: false, error: "Error al iniciar sesión" };
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const isValidPassword = await verifyPassword(
      currentPassword,
      user.password
    );

    if (!isValidPassword) {
      return { success: false, error: "Contraseña actual incorrecta" };
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Error al cambiar la contraseña" };
  }
}
