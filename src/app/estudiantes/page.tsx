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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import {
  offlineCreateStudent,
  offlineUpdateStudent,
  offlineDeleteStudent,
  offlineGetClasses,
  offlineGetStudents,
  offlineCalculateStudentAttendance,
} from "@/lib/offline-actions";
import { studentSchema, type StudentFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Class, Student } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Loader2,
  Plus,
  X,
  Upload,
  Download,
  ArrowUpDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ImportStudentsDialog from "@/components/import-students-dialog";
import { exportStudentsToExcel } from "@/lib/export-utils";
import { useProject } from "@/contexts/project-context";

interface ClassWithCount extends Class {
  _count: {
    students: number;
  };
}

interface ExtendedStudent extends Student {
  class: Class;
  attendancePercentage?: number;
}

const EstudiantesView = () => {
  const { activeProjectId } = useProject();
  const [students, setStudents] = useState<ExtendedStudent[]>([]);
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<"M" | "F" | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<ExtendedStudent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Form for creating or editing students
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "M",
      age: undefined,
      classId: undefined,
    },
  });

  // Load data when component mounts or project changes
  useEffect(() => {
    const loadData = async () => {
      if (!activeProjectId) {
        setStudents([]);
        setClasses([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const classesData = await offlineGetClasses();
        setClasses(classesData as ClassWithCount[]);

        const studentsData = await offlineGetStudents();

        // Calculate attendance percentages
        const studentsWithAttendance = await Promise.all(
          studentsData.map(async (student) => {
            const attendancePercentage = await offlineCalculateStudentAttendance(
              student.id
            );
            return {
              ...student,
              attendancePercentage,
            };
          })
        );

        setStudents(studentsWithAttendance as ExtendedStudent[]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeProjectId]);

  // Filter students based on filters (search is handled by DataTable)
  const filteredStudents = students.filter((student) => {
    const matchesClass = classFilter
      ? student.classId === classFilter
      : true;

    const matchesGender = genderFilter ? student.gender === genderFilter : true;

    return matchesClass && matchesGender;
  });

  // Start creating a new student
  const startCreating = () => {
    form.reset({
      firstName: "",
      lastName: "",
      gender: "M",
      age: undefined,
      classId: undefined,
    });
    setSelectedStudent(null);
    setIsEditMode(true);
  };

  // Start editing a student
  const startEditing = (student: ExtendedStudent) => {
    form.reset({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      age: student.age ?? undefined,
      classId: student.classId,
    });
    setSelectedStudent(student);
    setIsEditMode(true);
  };

  // Submit handler for creating or editing a student
  const onSubmit = async (data: StudentFormValues) => {
    try {
      let result;

      if (data.id) {
        // Update existing student
        result = await offlineUpdateStudent(data);

        if (result.success) {
          const message = (result as { offline?: boolean }).offline
            ? "Estudiante actualizado (se sincronizará cuando haya conexión)"
            : "Estudiante actualizado correctamente";
          toast.success(message);
        }
      } else {
        // Create new student
        result = await offlineCreateStudent(data);

        if (result.success) {
          const message = (result as { offline?: boolean }).offline
            ? "Estudiante creado (se sincronizará cuando haya conexión)"
            : "Estudiante creado correctamente";
          toast.success(message);
        }
      }

      if (result?.success) {
        // Refresh students
        const studentsData = await offlineGetStudents();

        // Calculate attendance percentages
        const studentsWithAttendance = await Promise.all(
          studentsData.map(async (student) => {
            const attendancePercentage = await offlineCalculateStudentAttendance(
              student.id
            );
            return {
              ...student,
              attendancePercentage,
            };
          })
        );

        setStudents(studentsWithAttendance as ExtendedStudent[]);
        setIsEditMode(false);
      } else {
        const errorMessage = !result?.success && "error" in result ? result.error : "Error al guardar el estudiante";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("Error al guardar el estudiante");
    }
  };

  // Handle deleting a student
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      const result = await offlineDeleteStudent(selectedStudent.id);

      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Estudiante eliminado (se sincronizará cuando haya conexión)"
          : "Estudiante eliminado correctamente";
        toast.success(message);

        // Refresh students
        const studentsData = await offlineGetStudents();

        // Calculate attendance percentages
        const studentsWithAttendance = await Promise.all(
          studentsData.map(async (student) => {
            const attendancePercentage = await offlineCalculateStudentAttendance(
              student.id
            );
            return {
              ...student,
              attendancePercentage,
            };
          })
        );

        setStudents(studentsWithAttendance as ExtendedStudent[]);
        setShowDeleteAlert(false);
        setIsEditMode(false);
      } else {
        toast.error(result.error || "Error al eliminar el estudiante");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Error al eliminar el estudiante");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setClassFilter(null);
    setGenderFilter(null);
  };

  // Get class name by ID
  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : "Sin clase";
  };

  // Handle import completion
  const handleImportComplete = async () => {
    // Refresh students after import
    const studentsData = await offlineGetStudents();
    const studentsWithAttendance = await Promise.all(
      (studentsData as unknown as (Student & { class: Class })[]).map(async (student) => {
        const attendancePercentage = await offlineCalculateStudentAttendance(
          student.id
        );
        return {
          ...student,
          attendancePercentage,
        };
      })
    );
    setStudents(studentsWithAttendance as ExtendedStudent[]);
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    const className = classFilter
      ? classes.find((c) => c.id === classFilter)?.name
      : undefined;
    exportStudentsToExcel(filteredStudents, className);
    toast.success("Lista de estudiantes exportada correctamente");
  };

  // Student editing view
  if (isEditMode) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {selectedStudent ? "Editar Estudiante" : "Nuevo Estudiante"}
          </h1>
          <Button
            onClick={() => setIsEditMode(false)}
            variant="ghost"
            size="icon"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del estudiante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos del estudiante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clase</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar clase" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Género</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4 pt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="M" id="male" />
                            <Label htmlFor="male">Masculino</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="F" id="female" />
                            <Label htmlFor="female">Femenino</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="age"
                  render={({ field: { value, ...fieldRest } }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="Edad"
                          {...fieldRest}
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            fieldRest.onChange(val === "" ? "" : parseInt(val) || "");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit">
                  {selectedStudent ? "Actualizar" : "Guardar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditMode(false)}
                >
                  Cancelar
                </Button>
                {selectedStudent && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 ml-auto"
                    onClick={() => setShowDeleteAlert(true)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente a{" "}
                {selectedStudent?.firstName} {selectedStudent?.lastName} y todos
                sus registros de asistencia.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteStudent}
                className="bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Column definitions for the students table
  const columns: ColumnDef<ExtendedStudent>[] = [
    {
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      id: "fullName",
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
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </span>
          {(row.original.attendancePercentage || 0) < 70 && (
            <AlertTriangle
              size={14}
              className="text-orange-500"
              aria-label="Asistencia baja"
            />
          )}
        </div>
      ),
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Edad
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.age != null ? row.original.age : "—"}
        </span>
      ),
    },
    {
      accessorKey: "gender",
      header: "Género",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.gender === "M" ? "Masculino" : "Femenino"}
        </span>
      ),
    },
    {
      accessorKey: "classId",
      header: "Clase",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {getClassName(row.original.classId)}
        </span>
      ),
    },
    {
      accessorKey: "attendancePercentage",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Asistencia
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const pct = row.original.attendancePercentage || 0;
        return (
          <Badge className={pct >= 70 ? "bg-green-500" : "bg-orange-500"}>
            {pct}%
          </Badge>
        );
      },
    },
  ];

  // Students list view
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Estudiantes</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            size="sm"
          >
            <Upload size={16} className="mr-1" />
            Importar
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            disabled={filteredStudents.length === 0}
          >
            <Download size={16} className="mr-1" />
            Exportar
          </Button>
          <Button onClick={startCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Estudiante
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex gap-4 mb-4 items-end">
        <div>
          <Label htmlFor="class-filter" className="text-xs text-muted-foreground mb-1 block">
            Clase
          </Label>
          <Select
            value={classFilter || "all"}
            onValueChange={(value) =>
              setClassFilter(value === "all" ? null : value)
            }
          >
            <SelectTrigger id="class-filter" className="w-48">
              <SelectValue placeholder="Todas las clases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las clases</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Género
          </Label>
          <Select
            value={genderFilter || "all"}
            onValueChange={(value) =>
              setGenderFilter(value === "all" ? null : (value as "M" | "F"))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(classFilter || genderFilter) && (
          <Button
            onClick={clearFilters}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {!activeProjectId ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Selecciona un proyecto para ver los estudiantes
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredStudents}
          searchPlaceholder="Buscar estudiantes..."
          globalFilter
          onRowClick={(student) => startEditing(student)}
        />
      )}

      {/* Import Students Dialog */}
      <ImportStudentsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        classes={classes}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default EstudiantesView;
