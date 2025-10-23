"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { joinWithInviteSchema, type JoinWithInviteFormValues } from "@/lib/auth-validations";
import { joinWithInviteCode } from "@/lib/project-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

export default function UnirseInvitacionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinWithInviteFormValues>({
    resolver: zodResolver(joinWithInviteSchema),
  });

  const onSubmit = async (data: JoinWithInviteFormValues) => {
    setIsLoading(true);
    try {
      const result = await joinWithInviteCode(data);

      if (result.success && result.project) {
        toast.success(`Te has unido al proyecto "${result.project.name}"`);
        router.push("/proyectos");
        router.refresh();
      } else {
        toast.error(result.error || "Error al unirse al proyecto");
      }
    } catch (error) {
      console.error("Join with invite error:", error);
      toast.error("Error al unirse al proyecto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/proyectos">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proyectos
          </Button>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Unirse con Código de Invitación
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Usa el código de invitación que recibiste
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="inviteCode">Código de Invitación</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="XXXX-XXXX-EDIT o XXXX-XXXX-VIEW"
                {...register("inviteCode")}
                disabled={isLoading}
                className="mt-1 font-mono text-lg"
              />
              {errors.inviteCode && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.inviteCode.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                El código de invitación termina en EDIT (Editor) o VIEW (Visualizador)
              </p>
            </div>

            <div>
              <Label htmlFor="projectPassword">Contraseña del Proyecto</Label>
              <Input
                id="projectPassword"
                type="password"
                placeholder="••••••••"
                {...register("projectPassword")}
                disabled={isLoading}
                className="mt-1"
              />
              {errors.projectPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.projectPassword.message}
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Ventaja:</strong> Al usar un código de invitación, obtendrás el rol específico 
                (Editor o Visualizador) asignado por el administrador, sin necesidad de esperar a que te lo otorgue.
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
                  <Mail className="mr-2 h-4 w-4" />
                  Unirse con Invitación
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Solo tienes el código de acceso?{" "}
              <Link
                href="/proyectos/unirse"
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
