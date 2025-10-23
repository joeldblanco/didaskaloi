"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

/**
 * Get user's role in a project
 */
export async function getUserProjectRole(
  userId: number,
  projectId: number
): Promise<Role | null> {
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: {
      role: true,
    },
  });

  return member?.role || null;
}

/**
 * Check if user has permission to perform an action
 */
export async function hasPermission(
  userId: number,
  projectId: number,
  requiredRole: Role
): Promise<boolean> {
  const userRole = await getUserProjectRole(userId, projectId);

  if (!userRole) return false;

  // Role hierarchy: ADMIN > EDITOR > VIEWER
  const roleHierarchy = {
    [Role.ADMIN]: 3,
    [Role.EDITOR]: 2,
    [Role.VIEWER]: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can view (any role)
 */
export async function canView(
  userId: number,
  projectId: number
): Promise<boolean> {
  return hasPermission(userId, projectId, Role.VIEWER);
}

/**
 * Check if user can edit (EDITOR or ADMIN)
 */
export async function canEdit(
  userId: number,
  projectId: number
): Promise<boolean> {
  return hasPermission(userId, projectId, Role.EDITOR);
}

/**
 * Check if user is admin
 */
export async function isAdmin(
  userId: number,
  projectId: number
): Promise<boolean> {
  return hasPermission(userId, projectId, Role.ADMIN);
}

/**
 * Get project ID from class ID
 */
export async function getProjectIdFromClass(
  classId: number
): Promise<number | null> {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { projectId: true },
  });

  return classData?.projectId || null;
}

/**
 * Verify user has access to a class
 */
export async function verifyClassAccess(
  userId: number,
  classId: number,
  requiredRole: Role = Role.VIEWER
): Promise<{ hasAccess: boolean; projectId?: number }> {
  const projectId = await getProjectIdFromClass(classId);

  if (!projectId) {
    return { hasAccess: false };
  }

  const hasAccess = await hasPermission(userId, projectId, requiredRole);

  return { hasAccess, projectId };
}

/**
 * Get active project ID from cookies/session
 * This will be used to track which project the user is currently working on
 */
export async function getActiveProjectId(): Promise<number | null> {
  // For now, we'll get the first project the user has access to
  // In a real implementation, this would come from cookies or session storage
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await prisma.projectMember.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      joinedAt: "desc",
    },
    select: {
      projectId: true,
    },
  });

  return membership?.projectId || null;
}
