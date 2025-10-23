import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectDetails } from "@/lib/project-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BookOpen } from "lucide-react";
import { ProjectMembersSection } from "@/components/project-members-section";
import { ProjectInviteCodesSection } from "@/components/project-invite-codes-section";

export default async function ProyectoDetallesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const projectId = parseInt(id);
  const project = await getProjectDetails(projectId);

  if (!project) {
    redirect("/proyectos");
  }

  const isAdmin = project.userRole === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/proyectos">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proyectos
          </Button>
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {project.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Código de acceso: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{project.accessCode}</code>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Propietario: {project.owner.name}
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                project.userRole === "ADMIN"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : project.userRole === "EDITOR"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              {project.userRole === "ADMIN"
                ? "Administrador"
                : project.userRole === "EDITOR"
                ? "Editor"
                : "Visualizador"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Users className="h-5 w-5 mr-2" />
              <span>{project.members.length} miembros</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <BookOpen className="h-5 w-5 mr-2" />
              <span>{project.classCount} clases</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link href={`/clases?projectId=${project.id}`}>
              <Button className="w-full">
                <BookOpen className="mr-2 h-4 w-4" />
                Ir a las Clases del Proyecto
              </Button>
            </Link>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Miembros del Proyecto
            </h2>
          </div>
          <ProjectMembersSection
            projectId={project.id}
            members={project.members}
            isAdmin={isAdmin}
            ownerId={project.owner.id}
          />
        </div>

        {/* Invite Codes Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Códigos de Invitación
              </h2>
            </div>
            <ProjectInviteCodesSection
              projectId={project.id}
              inviteCodes={project.inviteCodes.filter(code => code.role === "EDITOR" || code.role === "VIEWER")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
