"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  hashPassword,
  verifyPassword,
  generateProjectCode,
  generateInviteCode,
} from "@/lib/auth-utils";
import {
  createProjectSchema,
  joinProjectSchema,
  joinWithInviteSchema,
  updateProjectSchema,
  createInviteCodeSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  type CreateProjectFormValues,
  type JoinProjectFormValues,
  type JoinWithInviteFormValues,
  type UpdateProjectFormValues,
  type CreateInviteCodeFormValues,
  type UpdateMemberRoleFormValues,
  type RemoveMemberFormValues,
} from "@/lib/auth-validations";
import { Role } from "@prisma/client";

/**
 * Get current authenticated user
 */
async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }
  return session.user;
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = createProjectSchema.parse(data);

    const accessCode = generateProjectCode();
    const hashedPassword = await hashPassword(validatedData.password);

    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        accessCode,
        password: hashedPassword,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: Role.ADMIN,
          },
        },
      },
      include: {
        members: true,
      },
    });

    revalidatePath("/proyectos");
    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        accessCode: project.accessCode,
      },
    };
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, error: "Error al crear el proyecto" };
  }
}

/**
 * Join a project using access code and password
 */
export async function joinProject(data: JoinProjectFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = joinProjectSchema.parse(data);

    const project = await prisma.project.findUnique({
      where: { accessCode: validatedData.accessCode },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!project) {
      return { success: false, error: "Código de proyecto inválido" };
    }

    // Check if user is already a member
    if (project.members.length > 0) {
      return { success: false, error: "Ya eres miembro de este proyecto" };
    }

    // Verify project password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      project.password
    );

    if (!isValidPassword) {
      return { success: false, error: "Contraseña incorrecta" };
    }

    // Add user as viewer by default when joining via access code
    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: Role.VIEWER,
      },
    });

    revalidatePath("/proyectos");
    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
      },
    };
  } catch (error) {
    console.error("Error joining project:", error);
    return { success: false, error: "Error al unirse al proyecto" };
  }
}

/**
 * Join a project using invite code
 */
export async function joinWithInviteCode(data: JoinWithInviteFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = joinWithInviteSchema.parse(data);

    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: validatedData.inviteCode },
      include: {
        project: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!inviteCode || !inviteCode.isActive) {
      return { success: false, error: "Código de invitación inválido" };
    }

    // Check if expired
    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return { success: false, error: "El código de invitación ha expirado" };
    }

    // Check if max uses reached
    if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
      return {
        success: false,
        error: "El código de invitación ha alcanzado su límite de usos",
      };
    }

    // Check if user is already a member
    if (inviteCode.project.members.length > 0) {
      return { success: false, error: "Ya eres miembro de este proyecto" };
    }

    // Verify project password
    const isValidPassword = await verifyPassword(
      validatedData.projectPassword,
      inviteCode.project.password
    );

    if (!isValidPassword) {
      return { success: false, error: "Contraseña del proyecto incorrecta" };
    }

    // Add user with the role specified in the invite code
    await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: inviteCode.project.id,
        role: inviteCode.role,
      },
    });

    // Increment used count
    await prisma.inviteCode.update({
      where: { id: inviteCode.id },
      data: { usedCount: { increment: 1 } },
    });

    revalidatePath("/proyectos");
    return {
      success: true,
      project: {
        id: inviteCode.project.id,
        name: inviteCode.project.name,
      },
    };
  } catch (error) {
    console.error("Error joining with invite code:", error);
    return { success: false, error: "Error al unirse al proyecto" };
  }
}

/**
 * Get user's projects
 */
export async function getUserProjects() {
  try {
    const user = await getCurrentUser();

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            members: true,
            classes: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      accessCode: project.accessCode,
      owner: project.owner,
      role: project.members[0]?.role,
      memberCount: project._count.members,
      classCount: project._count.classes,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
  }
}

/**
 * Get project details with members
 */
export async function getProjectDetails(projectId: number) {
  try {
    const user = await getCurrentUser();

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        inviteCodes: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    const userMember = project.members.find((m) => m.userId === user.id);

    return {
      id: project.id,
      name: project.name,
      accessCode: project.accessCode,
      owner: project.owner,
      userRole: userMember?.role,
      members: project.members.map((m) => ({
        id: m.id,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      inviteCodes: project.inviteCodes,
      classCount: project._count.classes,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching project details:", error);
    return null;
  }
}

/**
 * Update project
 */
export async function updateProject(data: UpdateProjectFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = updateProjectSchema.parse(data);

    // Check if user is admin
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: validatedData.id,
        },
      },
    });

    if (!member || member.role !== Role.ADMIN) {
      return {
        success: false,
        error: "No tienes permisos para actualizar este proyecto",
      };
    }

    const updateData: { name?: string; password?: string } = {};

    if (validatedData.name) {
      updateData.name = validatedData.name;
    }

    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password);
    }

    await prisma.project.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    revalidatePath("/proyectos");
    revalidatePath(`/proyectos/${validatedData.id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, error: "Error al actualizar el proyecto" };
  }
}

/**
 * Create invite code
 */
export async function createInviteCodeAction(data: CreateInviteCodeFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = createInviteCodeSchema.parse(data);

    // Check if user is admin
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: validatedData.projectId,
        },
      },
    });

    if (!member || member.role !== Role.ADMIN) {
      return {
        success: false,
        error: "No tienes permisos para crear códigos de invitación",
      };
    }

    const code = generateInviteCode();

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        projectId: validatedData.projectId,
        role: validatedData.role,
        expiresAt: validatedData.expiresAt,
        maxUses: validatedData.maxUses,
      },
    });

    revalidatePath(`/proyectos/${validatedData.projectId}`);
    return {
      success: true,
      inviteCode: {
        id: inviteCode.id,
        code: inviteCode.code,
        role: inviteCode.role,
        expiresAt: inviteCode.expiresAt,
        maxUses: inviteCode.maxUses,
      },
    };
  } catch (error) {
    console.error("Error creating invite code:", error);
    return { success: false, error: "Error al crear el código de invitación" };
  }
}

/**
 * Deactivate invite code
 */
export async function deactivateInviteCode(inviteCodeId: number) {
  try {
    const user = await getCurrentUser();

    const inviteCode = await prisma.inviteCode.findUnique({
      where: { id: inviteCodeId },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: user.id,
                role: Role.ADMIN,
              },
            },
          },
        },
      },
    });

    if (!inviteCode || inviteCode.project.members.length === 0) {
      return {
        success: false,
        error: "No tienes permisos para desactivar este código",
      };
    }

    await prisma.inviteCode.update({
      where: { id: inviteCodeId },
      data: { isActive: false },
    });

    revalidatePath(`/proyectos/${inviteCode.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deactivating invite code:", error);
    return { success: false, error: "Error al desactivar el código" };
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(data: UpdateMemberRoleFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = updateMemberRoleSchema.parse(data);

    // Check if current user is admin
    const currentUserMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: validatedData.projectId,
        },
      },
    });

    if (!currentUserMember || currentUserMember.role !== Role.ADMIN) {
      return {
        success: false,
        error: "No tienes permisos para cambiar roles",
      };
    }

    // Check if trying to change project owner's role
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
    });

    if (project?.ownerId === validatedData.userId) {
      return {
        success: false,
        error: "No puedes cambiar el rol del propietario del proyecto",
      };
    }

    await prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId: validatedData.userId,
          projectId: validatedData.projectId,
        },
      },
      data: {
        role: validatedData.role,
      },
    });

    revalidatePath(`/proyectos/${validatedData.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating member role:", error);
    return { success: false, error: "Error al actualizar el rol" };
  }
}

/**
 * Remove member from project
 */
export async function removeMember(data: RemoveMemberFormValues) {
  try {
    const user = await getCurrentUser();
    const validatedData = removeMemberSchema.parse(data);

    // Check if current user is admin
    const currentUserMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: validatedData.projectId,
        },
      },
    });

    if (!currentUserMember || currentUserMember.role !== Role.ADMIN) {
      return {
        success: false,
        error: "No tienes permisos para eliminar miembros",
      };
    }

    // Check if trying to remove project owner
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
    });

    if (project?.ownerId === validatedData.userId) {
      return {
        success: false,
        error: "No puedes eliminar al propietario del proyecto",
      };
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: validatedData.userId,
          projectId: validatedData.projectId,
        },
      },
    });

    revalidatePath(`/proyectos/${validatedData.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing member:", error);
    return { success: false, error: "Error al eliminar el miembro" };
  }
}

/**
 * Leave project
 */
export async function leaveProject(projectId: number) {
  try {
    const user = await getCurrentUser();

    // Check if user is project owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (project?.ownerId === user.id) {
      return {
        success: false,
        error:
          "No puedes abandonar un proyecto del que eres propietario. Transfiere la propiedad primero.",
      };
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    });

    revalidatePath("/proyectos");
    return { success: true };
  } catch (error) {
    console.error("Error leaving project:", error);
    return { success: false, error: "Error al abandonar el proyecto" };
  }
}

/**
 * Delete project (owner only)
 */
export async function deleteProject(projectId: number) {
  try {
    const user = await getCurrentUser();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return { success: false, error: "Proyecto no encontrado" };
    }

    if (project.ownerId !== user.id) {
      return {
        success: false,
        error: "Solo el propietario puede eliminar el proyecto",
      };
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/proyectos");
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: "Error al eliminar el proyecto" };
  }
}
