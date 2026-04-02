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
import { DataTable } from "@/components/ui/data-table";
import {
  offlineGetClasses,
  offlineCreateClass,
  offlineUpdateClass,
  offlineDeleteClass,
} from "@/lib/offline-actions";
import { classSchema, type ClassFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Class } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Loader2, Plus, Trash, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useProject } from "@/contexts/project-context";

interface ClassWithStudentCount extends Class {
  _count: {
    students: number;
  };
}

const ClasesView = () => {
  const router = useRouter();
  const { activeProjectId } = useProject();
  const [classes, setClasses] = useState<ClassWithStudentCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddClassDialog, setShowAddClassDialog] = useState(false);
  const [showEditClassDialog, setShowEditClassDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  // Form for creating or editing a class
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
    },
  });

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
  const handleDeleteClick = (id: string) => {
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
      const result = await offlineCreateClass(data);
      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Clase creada (se sincronizará cuando haya conexión)"
          : "Clase creada correctamente";
        toast.success(message);
        setShowAddClassDialog(false);
        // Refresh classes
        const updatedClasses = await offlineGetClasses();
        setClasses(updatedClasses as ClassWithStudentCount[]);
      } else {
        toast.error((result as { error?: string }).error || "Error al crear la clase");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Error al crear la clase");
    }
  };

  // Submit handler for updating a class
  const onSubmitUpdate = async (data: ClassFormValues) => {
    try {
      const result = await offlineUpdateClass(data);
      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Clase actualizada (se sincronizará cuando haya conexión)"
          : "Clase actualizada correctamente";
        toast.success(message);
        setShowEditClassDialog(false);
        // Refresh classes
        const updatedClasses = await offlineGetClasses();
        setClasses(updatedClasses as ClassWithStudentCount[]);
      } else {
        toast.error((result as { error?: string }).error || "Error al actualizar la clase");
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
      const result = await offlineDeleteClass(classToDelete);
      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Clase eliminada (se sincronizará cuando haya conexión)"
          : "Clase eliminada correctamente";
        toast.success(message);
      }

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

  const columns: ColumnDef<ClassWithStudentCount>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      id: "students",
      accessorFn: (row) => row._count.students,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Estudiantes
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original._count.students}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClassClick(row.original);
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
              handleDeleteClick(row.original.id);
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis Clases</h1>
        <Button onClick={handleAddClassClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Clase
        </Button>
      </div>

      {!activeProjectId ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Selecciona un proyecto para ver las clases
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={classes.sort((a, b) => (b.createdAt < a.createdAt ? 1 : -1))}
          searchPlaceholder="Buscar clases..."
          searchColumn="name"
          onRowClick={(cls) => handleClaseClick(cls)}
        />
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
