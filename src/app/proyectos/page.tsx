"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, Loader2 } from "lucide-react";
import { offlineGetProjects } from "@/lib/offline-actions";
import { useProject } from "@/contexts/project-context";

interface ProjectData {
  id: string;
  name: string;
  accessCode?: string;
  owner?: { id?: string; name?: string; email?: string };
  role?: string;
  memberCount?: number;
  classCount?: number;
}

export default function ProyectosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setActiveProjectId, setActiveProjectName } = useProject();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated" || status === "loading") {
      const loadProjects = async () => {
        setIsLoading(true);
        try {
          const data = await offlineGetProjects();
          setProjects(data as ProjectData[]);
        } catch (error) {
          console.error("Error loading projects:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadProjects();
    }
  }, [status, router]);

  const handleProjectClick = (project: ProjectData) => {
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
    router.push(`/clases?projectId=${project.id}`);
  };

  if (status === "loading" && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Mis Proyectos
            </h1>
            {session?.user?.name && (
              <p className="text-muted-foreground mt-1">
                Bienvenido, {session.user.name}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/proyectos/nuevo">
            <Button className="w-full h-24 text-lg">
              <Plus className="mr-2 h-6 w-6" />
              Crear Nuevo Proyecto
            </Button>
          </Link>
          <Link href="/proyectos/unirse">
            <Button variant="outline" className="w-full h-24 text-lg">
              <Users className="mr-2 h-6 w-6" />
              Unirse a Proyecto
            </Button>
          </Link>
          <Link href="/proyectos/unirse-invitacion">
            <Button variant="outline" className="w-full h-24 text-lg">
              <BookOpen className="mr-2 h-6 w-6" />
              Usar Código de Invitación
            </Button>
          </Link>
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg shadow">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">
              No tienes proyectos
            </h3>
            <p className="mt-2 text-muted-foreground">
              Crea un nuevo proyecto o únete a uno existente para comenzar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className="block cursor-pointer"
              >
                <div className="bg-card rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">
                        {project.name}
                      </h3>
                      {project.accessCode && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Código: {project.accessCode}
                        </p>
                      )}
                    </div>
                    {project.role && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.role === "ADMIN"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : project.role === "EDITOR"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {project.role === "ADMIN"
                          ? "Administrador"
                          : project.role === "EDITOR"
                          ? "Editor"
                          : "Visualizador"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    {project.memberCount !== undefined && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{project.memberCount} miembros</span>
                      </div>
                    )}
                    {project.classCount !== undefined && (
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        <span>{project.classCount} clases</span>
                      </div>
                    )}
                  </div>

                  {project.owner?.name && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Propietario: {project.owner.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
