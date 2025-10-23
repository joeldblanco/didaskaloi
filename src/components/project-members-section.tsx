"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole, removeMember } from "@/lib/project-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserMinus, Shield, Edit, Eye } from "lucide-react";

type Member = {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: Date;
};

type Props = {
  projectId: number;
  members: Member[];
  isAdmin: boolean;
  ownerId: number;
};

export function ProjectMembersSection({ projectId, members, isAdmin, ownerId }: Props) {
  const router = useRouter();
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRoleChange = async (userId: number, newRole: "ADMIN" | "EDITOR" | "VIEWER") => {
    try {
      const result = await updateMemberRole({
        projectId,
        userId,
        role: newRole,
      });

      if (result.success) {
        toast.success("Rol actualizado correctamente");
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar el rol");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Error al actualizar el rol");
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMemberId) return;

    setIsRemoving(true);
    try {
      const result = await removeMember({
        projectId,
        userId: removingMemberId,
      });

      if (result.success) {
        toast.success("Miembro eliminado correctamente");
        setRemovingMemberId(null);
        router.refresh();
      } else {
        toast.error(result.error || "Error al eliminar el miembro");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Error al eliminar el miembro");
    } finally {
      setIsRemoving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-4 w-4" />;
      case "EDITOR":
        return <Edit className="h-4 w-4" />;
      case "VIEWER":
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {members.map((member) => {
          const isOwner = member.user.id === ownerId;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.user.name}
                  </p>
                  {isOwner && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                      Propietario
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {member.user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Se unió el {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {isAdmin && !isOwner ? (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        handleRoleChange(member.user.id, value as "ADMIN" | "EDITOR" | "VIEWER")
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Administrador
                          </div>
                        </SelectItem>
                        <SelectItem value="EDITOR">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Visualizador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRemovingMemberId(member.user.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-md">
                    {getRoleIcon(member.role)}
                    <span className="text-sm font-medium">
                      {member.role === "ADMIN"
                        ? "Administrador"
                        : member.role === "EDITOR"
                        ? "Editor"
                        : "Visualizador"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={removingMemberId !== null} onOpenChange={(open) => !open && setRemovingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al miembro del proyecto. Podrá volver a unirse usando el código de acceso o una invitación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
