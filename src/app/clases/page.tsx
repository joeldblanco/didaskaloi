// app/clases/page.tsx
"use client";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createClass,
  deleteClass,
  updateClass,
} from "@/lib/actions";
import { offlineGetClasses } from "@/lib/offline-actions";
import { classSchema, type ClassFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Class } from "@prisma/client";
import { Edit, Loader2, Plus, Search, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useProject } from "@/contexts/project-context";
import { getUserProjects } from "@/lib/project-actions";
import { ProjectSelector } from "@/components/project-selector";

interface ClassWithStudentCount extends Class {
  _count: {
    students: number;
  };
}

const ClasesView = () => {
  const router = useRouter();
  const { activeProjectId } = useProject();
  const [classes, setClasses] = useState<ClassWithStudentCount[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddClassDialog, setShowAddClassDialog] = useState(false);
  const [showEditClassDialog, setShowEditClassDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [classToDelete, setClassToDelete] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");

  // Form for creating or editing a class
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
    },
  });

  // Load projects when component mounts
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const userProjects = await getUserProjects();
        setProjects(userProjects.map(p => ({ id: p.id, name: p.name, role: p.role || "VIEWER" })));
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };

    loadProjects();
  }, []);

  // Load classes when component mounts or project changes
  useEffect(() => {
    const loadClasses = async () => {
      if (!activeProjectId) {
        setClasses([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await offlineGetClasses();
        setClasses(data as ClassWithStudentCount[]);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Error al cargar las clases");
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, [activeProjectId]);

  // Filter classes based on search text
  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Handle class click
  const handleClaseClick = (cls: Class) => {
    router.push(`/clases/${cls.id}`);
  };

  // Open add class dialog
  const handleAddClassClick = () => {
    form.reset({ name: "" });
    setShowAddClassDialog(true);
  };

  // Open edit class dialog
  const handleEditClassClick = (cls: Class) => {
    form.reset({ id: cls.id, name: cls.name });
    setShowEditClassDialog(true);
  };

  // Open delete confirmation
  const handleDeleteClick = (id: number) => {
    setClassToDelete(id);
    setShowDeleteAlert(true);
  };

  // Submit handler for creating a class
  const onSubmitCreate = async (data: ClassFormValues) => {
    if (!activeProjectId) {
      toast.error("Selecciona un proyecto primero");
      return;
    }

    try {
      const result = await createClass(data, activeProjectId);
      if (result.success) {
        toast.success("Clase creada correctamente");
        setShowAddClassDialog(false);
        // Refresh classes
        const updatedClasses = await offlineGetClasses();
        setClasses(updatedClasses as ClassWithStudentCount[]);
      } else {
        toast.error(result.error || "Error al crear la clase");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Error al crear la clase");
    }
  };

  // Submit handler for updating a class
  const onSubmitUpdate = async (data: ClassFormValues) => {
    try {
      const result = await updateClass(data);
      if (result.success) {
        toast.success("Clase actualizada correctamente");
        setShowEditClassDialog(false);
        // Refresh classes
        const updatedClasses = await offlineGetClasses();
        setClasses(updatedClasses as ClassWithStudentCount[]);
      } else {
        toast.error(result.error || "Error al actualizar la clase");
      }
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Error al actualizar la clase");
    }
  };

  // Handle deleting a class
  const handleDeleteClass = async () => {
    if (!classToDelete) return;

    setShowDeleteAlert(false);

    try {
      await deleteClass(classToDelete);
      toast.success("Clase eliminada correctamente");

      // Refresh classes
      const updatedClasses = await offlineGetClasses();
      setClasses(updatedClasses as ClassWithStudentCount[]);
      setClassToDelete(null);
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Error al eliminar la clase");
    }
  };

  // Removed students view section since we're not using it

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Mis Clases</h1>
      </div>

      {projects.length > 0 && (
        <div className="mb-4">
          <ProjectSelector projects={projects} />
        </div>
      )}

      {!activeProjectId ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Selecciona un proyecto para ver las clases
          </p>
          <Button
            onClick={() => router.push("/proyectos")}
            variant="outline"
          >
            Ir a Proyectos
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Buscar clases..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay clases disponibles</p>
        </div>
      ) : (
        <div className="space-y-3 mb-20">
          {filteredClasses
            .sort((a, b) => (b.createdAt < a.createdAt ? 1 : -1))
            .map((cls) => (
              <Card
                key={cls.id}
                className="cursor-pointer transition-colors"
                onClick={() => handleClaseClick(cls)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium">{cls.name}</h2>
                    <p className="text-sm text-gray-500">
                      {cls._count.students} estudiantes
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClassClick(cls);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(cls.id);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

          <Button
            onClick={handleAddClassClick}
            className="fixed right-4 bottom-20 bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Add Class Dialog */}
      <Dialog open={showAddClassDialog} onOpenChange={setShowAddClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Clase</DialogTitle>
            <DialogDescription>
              Ingresa el nombre para la nueva clase.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la clase</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Matemáticas 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddClassDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={showEditClassDialog} onOpenChange={setShowEditClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Clase</DialogTitle>
            <DialogDescription>
              Modifica el nombre de la clase.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitUpdate)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la clase</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditClassDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Actualizar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la clase
              seleccionada y todos sus estudiantes y registros de asistencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClasesView;
