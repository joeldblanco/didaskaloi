"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type CreateInviteCodeFormValues } from "@/lib/auth-validations";
import { createInviteCodeAction, deactivateInviteCode } from "@/lib/project-actions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, Check, XCircle, Edit, Eye, Lock } from "lucide-react";

type InviteCode = {
  id: number;
  code: string;
  role: Role;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  projectId: number;
  inviteCodes: InviteCode[];
};

export function ProjectInviteCodesSection({ projectId, inviteCodes }: Props) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const [password, setPassword] = useState("");

  const handleCreateInviteCode = async () => {
    // Validate password for EDITOR role
    if (selectedRole === "EDITOR" && !password) {
      toast.error("La contraseña es obligatoria para códigos de Editor");
      return;
    }

    setIsCreating(true);
    try {
      const data: CreateInviteCodeFormValues = {
        projectId,
        role: selectedRole,
        password: password || undefined,
      };

      const result = await createInviteCodeAction(data);

      if (result.success && result.inviteCode) {
        toast.success("Código de invitación creado");
        setPassword(""); // Reset password field
        router.refresh();
      } else {
        toast.error(result.error || "Error al crear el código");
      }
    } catch (error) {
      console.error("Error creating invite code:", error);
      toast.error("Error al crear el código");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (inviteCodeId: number) => {
    try {
      const result = await deactivateInviteCode(inviteCodeId);

      if (result.success) {
        toast.success("Código desactivado");
        router.refresh();
      } else {
        toast.error(result.error || "Error al desactivar el código");
      }
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      toast.error("Error al desactivar el código");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código copiado al portapapeles");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Create New Invite Code */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Generar Nuevo Código de Invitación
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Rol para el código</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as "EDITOR" | "VIEWER")}>
                <SelectTrigger id="role" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Editor (puede crear y modificar)
                    </div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Visualizador (solo lectura)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">
                Contraseña del código
                {selectedRole === "EDITOR" && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                {selectedRole === "VIEWER" && (
                  <span className="text-gray-500 text-xs ml-1">(opcional)</span>
                )}
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder={selectedRole === "EDITOR" ? "Obligatoria" : "Opcional"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedRole === "EDITOR" && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Los usuarios necesitarán esta contraseña para unirse con este código
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleCreateInviteCode} disabled={isCreating} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? "Generando..." : "Generar Código"}
          </Button>
        </div>
      </div>

      {/* Active Invite Codes */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Códigos Activos
        </h3>
        {inviteCodes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No hay códigos de invitación activos
          </p>
        ) : (
          <div className="space-y-3">
            {inviteCodes.map((inviteCode) => (
              <div
                key={inviteCode.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded">
                      {inviteCode.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCode(inviteCode.code)}
                    >
                      {copiedCode === inviteCode.code ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        inviteCode.role === "EDITOR"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                      }`}
                    >
                      {inviteCode.role === "EDITOR" ? "Editor" : "Visualizador"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Usos: {inviteCode.usedCount}{inviteCode.maxUses ? ` / ${inviteCode.maxUses}` : ""}</span>
                    {inviteCode.expiresAt && (
                      <span>
                        Expira: {new Date(inviteCode.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs">
                      Creado: {new Date(inviteCode.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeactivate(inviteCode.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desactivar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
