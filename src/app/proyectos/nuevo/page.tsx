import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function NuevoProyectoPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-8">
        <div className="bg-card rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6">Crear Nuevo Proyecto</h1>
          <CreateProjectForm />
        </div>
      </div>
    </div>
  );
}
