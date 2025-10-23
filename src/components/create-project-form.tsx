"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema, type CreateProjectFormValues } from "@/lib/auth-validations";
import { createProject } from "@/lib/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Check } from "lucide-react";

export function CreateProjectForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
  });

  const onSubmit = async (data: CreateProjectFormValues) => {
    setIsLoading(true);
    try {
      const result = await createProject(data);

      if (result.success && result.project) {
        toast.success("Proyecto creado correctamente");
        setCreatedProject(result.project);
      } else {
        toast.error(result.error || "Error al crear el proyecto");
      }
    } catch (error) {
      console.error("Create project error:", error);
      toast.error("Error al crear el proyecto");
    } finally {
      setIsLoading(false);
    }
  };

  if (createdProject) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ¡Proyecto Creado!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Tu proyecto <strong>{createdProject.name}</strong> ha sido creado exitosamente
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Siguiente paso: Compartir el proyecto
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Para invitar a otros usuarios, ve a la página del proyecto y genera códigos de invitación con los roles apropiados (Editor o Visualizador).
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => router.push(`/proyectos/${createdProject.id}`)}
            className="flex-1"
          >
            Ir al Proyecto
          </Button>
          <Button
            onClick={() => router.push("/proyectos")}
            variant="outline"
            className="flex-1"
          >
            Ver Todos los Proyectos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Nombre del Proyecto</Label>
        <Input
          id="name"
          type="text"
          placeholder="Mi Proyecto de Clases"
          {...register("name")}
          disabled={isLoading}
          className="mt-1"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Podrás compartir este proyecto generando códigos de invitación después de crearlo
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creando proyecto...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Crear Proyecto
          </>
        )}
      </Button>
    </form>
  );
}
