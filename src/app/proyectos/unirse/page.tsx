"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { joinProjectSchema, type JoinProjectFormValues } from "@/lib/auth-validations";
import { joinProject } from "@/lib/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

export default function UnirseProyectoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinProjectFormValues>({
    resolver: zodResolver(joinProjectSchema),
  });

  const onSubmit = async (data: JoinProjectFormValues) => {
    setIsLoading(true);
    try {
      const result = await joinProject(data);

      if (result.success && result.project) {
        toast.success(`Te has unido al proyecto "${result.project.name}"`);
        router.push("/proyectos");
        router.refresh();
      } else {
        toast.error(result.error || "Error al unirse al proyecto");
      }
    } catch (error) {
      console.error("Join project error:", error);
      toast.error("Error al unirse al proyecto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-8">
        <div className="bg-card rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold">
              Unirse a un Proyecto
            </h1>
            <p className="text-muted-foreground mt-2">
              Ingresa el código de acceso y la contraseña del proyecto
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="accessCode">Código de Acceso</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="PROJ-XXXXXX"
                {...register("accessCode")}
                disabled={isLoading}
                className="mt-1 font-mono text-lg"
              />
              {errors.accessCode && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.accessCode.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                El código de acceso del proyecto (ej: PROJ-A1B2C3)
              </p>
            </div>

            <div>
              <Label htmlFor="password">Contraseña del Proyecto</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
                className="mt-1"
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                La contraseña configurada por el administrador del proyecto
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Nota:</strong> Al unirte con el código de acceso, se te asignará el rol de <strong>Visualizador</strong> por defecto. 
                El administrador del proyecto podrá cambiar tu rol posteriormente.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uniéndose al proyecto...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Unirse al Proyecto
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Tienes un código de invitación?{" "}
              <Link
                href="/proyectos/unirse-invitacion"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Úsalo aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
