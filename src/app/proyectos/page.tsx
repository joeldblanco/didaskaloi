import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserProjects } from "@/lib/project-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

export default async function ProyectosPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const projects = await getUserProjects();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Mis Proyectos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Bienvenido, {session.user.name}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/auth/login" });
            }}
          >
            <Button variant="outline" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
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
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No tienes proyectos
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Crea un nuevo proyecto o únete a uno existente para comenzar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/proyectos/${project.id}`}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Código: {project.accessCode}
                      </p>
                    </div>
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
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{project.memberCount} miembros</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      <span>{project.classCount} clases</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Propietario: {project.owner.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
