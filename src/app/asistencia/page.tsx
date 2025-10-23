// app/asistencia/page.tsx
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createAttendance,
  deleteAttendance,
  getAttendance,
  getAttendances,
  getClasses,
  updateAttendanceRecord,
} from "@/lib/actions";
import { attendanceSchema, type AttendanceFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Attendance, AttendanceRecord, Class, Student } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useProject } from "@/contexts/project-context";
import { getUserProjects } from "@/lib/project-actions";
import { ProjectSelector } from "@/components/project-selector";

// Extended types for our data with relations
interface ClassWithCount extends Class {
  _count: {
    students: number;
  };
}

interface AttendanceWithRelations extends Attendance {
  class: Class;
  records: (AttendanceRecord & { student: Student })[];
}

interface StudentAttendanceData extends Student {
  present?: boolean;
}

const AsistenciaView = () => {
  const { activeProjectId } = useProject();
  const [projects, setProjects] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [attendances, setAttendances] = useState<AttendanceWithRelations[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedAttendance, setSelectedAttendance] =
    useState<AttendanceWithRelations | null>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [studentsOrdered, setStudentsOrdered] = useState<
    StudentAttendanceData[]
  >([]);
  const [currentAttendanceRecords, setCurrentAttendanceRecords] = useState<
    Record<number, boolean>
  >({});
  const [isCompletionShown, setIsCompletionShown] = useState(false);
  const [showAddAttendanceDialog, setShowAddAttendanceDialog] = useState(false);
  const [showDeleteAttendanceAlert, setShowDeleteAttendanceAlert] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<
    "classes" | "attendances" | "taking-attendance"
  >("classes");

  // Form for creating a new attendance
  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: new Date(),
      classId: undefined,
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
        const data = await getClasses();
        setClasses(data as ClassWithCount[]);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Error al cargar las clases");
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, [activeProjectId]);

  // Load attendances when a class is selected
  useEffect(() => {
    if (selectedClass) {
      const loadAttendances = async () => {
        setIsLoading(true);
        try {
          const data = await getAttendances(selectedClass.id);
          setAttendances(data as AttendanceWithRelations[]);
        } catch (error) {
          console.error("Error loading attendances:", error);
          toast.error("Error al cargar las asistencias");
        } finally {
          setIsLoading(false);
        }
      };

      loadAttendances();
      setView("attendances");
    }
  }, [selectedClass]);

  // Prepare students when an attendance is selected
  useEffect(() => {
    // Prepare student data for taking attendance
    const prepareAttendanceData = async () => {
      if (!selectedAttendance) return;

      try {
        // Fetch the full attendance data with all relations
        const attendanceData = await getAttendance(selectedAttendance.id);

        if (!attendanceData) {
          toast.error("Error al cargar los datos de asistencia");
          return;
        }

        // Map students with their attendance status
        const students = attendanceData.class.students.map((student) => {
          const record = attendanceData.records.find(
            (r) => r.studentId === student.id
          );
          return {
            ...student,
            present: record ? record.present : undefined,
          };
        });

        // Sort students with undefined attendance first, then by lowest attendance percentage
        const studentsOrdered = [...students].sort((a, b) => {
          // Undefined attendance comes first
          if (a.present === undefined && b.present !== undefined) return -1;
          if (a.present !== undefined && b.present === undefined) return 1;

          // Then sort by name
          return a.firstName.localeCompare(b.firstName);
        });

        setStudentsOrdered(studentsOrdered);

        // Initialize currentAttendanceRecords with existing data
        const records: Record<number, boolean> = {};
        studentsOrdered.forEach((student) => {
          if (student.present !== undefined) {
            records[student.id] = student.present;
          }
        });

        setCurrentAttendanceRecords(records);
        setCurrentStudentIndex(0);
      } catch (error) {
        console.error("Error preparing attendance data:", error);
        toast.error("Error al preparar los datos de asistencia");
      }
    };

    if (selectedAttendance) {
      prepareAttendanceData();
      setView("taking-attendance");
    }
  }, [selectedAttendance]);

  // Handle attendance records
  const recordAttendance = async (studentId: number, present: boolean) => {
    if (!selectedAttendance) return;

    try {
      // Update in UI first for responsiveness
      setCurrentAttendanceRecords((prev) => ({
        ...prev,
        [studentId]: present,
      }));

      // Save to database
      const result = await updateAttendanceRecord({
        studentId,
        attendanceId: selectedAttendance.id,
        present,
      });

      if (!result.success) {
        toast.error("Error al guardar el registro de asistencia");
      }

      // Navigate to next student
      if (currentStudentIndex < studentsOrdered.length - 1) {
        setCurrentStudentIndex(currentStudentIndex + 1);
      } else {
        // Show completion screen
        setIsCompletionShown(true);

        // Refresh attendance data before going back
        await refreshAttendanceData();

        // After 2 seconds, go back to attendances list
        setTimeout(() => {
          setIsCompletionShown(false);
          goBackToAttendances();
        }, 2000);
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      toast.error("Error al registrar la asistencia");
    }
  };

  const refreshAttendanceData = async () => {
    if (!selectedClass) return;

    try {
      const updatedAttendances = await getAttendances(selectedClass.id);
      setAttendances(updatedAttendances as AttendanceWithRelations[]);
    } catch (error) {
      console.error("Error refreshing attendance data:", error);
      // No mostrar error para no interrumpir el flujo
    }
  };

  // Navigate between students
  const navigateStudent = (direction: "previous" | "next") => {
    if (direction === "previous" && currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    } else if (
      direction === "next" &&
      currentStudentIndex < studentsOrdered.length - 1
    ) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  // Handle adding a new attendance
  const onSubmitAddAttendance = async (data: AttendanceFormValues) => {
    try {
      const result = await createAttendance(data);

      if (result.success) {
        toast.success("Asistencia creada correctamente");
        setShowAddAttendanceDialog(false);

        // Refresh attendances
        const updatedAttendances = await getAttendances(selectedClass?.id);
        setAttendances(updatedAttendances as AttendanceWithRelations[]);

        // If the new attendance has an ID, select it to start taking attendance
        if (result.attendanceId) {
          const newAttendance = updatedAttendances.find(
            (a) => a.id === result.attendanceId
          );
          if (newAttendance) {
            setSelectedAttendance(newAttendance as AttendanceWithRelations);
          }
        }
      } else {
        toast.error(result.error || "Error al crear la asistencia");
      }
    } catch (error) {
      console.error("Error creating attendance:", error);
      toast.error("Error al crear la asistencia");
    }
  };

  // Handle deleting an attendance
  const handleDeleteAttendance = async () => {
    if (!selectedAttendance) return;

    try {
      const result = await deleteAttendance(selectedAttendance.id);

      if (result.success) {
        toast.success("Asistencia eliminada correctamente");
        setShowDeleteAttendanceAlert(false);

        // Refresh attendances
        const updatedAttendances = await getAttendances(selectedClass?.id);
        setAttendances(updatedAttendances as AttendanceWithRelations[]);

        // Go back to attendances list
        goBackToAttendances();
      } else {
        toast.error(result.error || "Error al eliminar la asistencia");
      }
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("Error al eliminar la asistencia");
    }
  };

  // Go back to attendances list
  const goBackToAttendances = () => {
    setSelectedAttendance(null);
    setView("attendances");
  };

  // Go back to classes list
  const goBackToClasses = () => {
    setSelectedClass(null);
    setAttendances([]);
    setView("classes");
  };

  // Calculate attendance percentage completion
  const calculateAttendanceCompletion = () => {
    if (!studentsOrdered.length) return 0;

    const recordedCount = Object.keys(currentAttendanceRecords).length;
    return Math.round((recordedCount / studentsOrdered.length) * 100);
  };

  // Format date for display
  const formatAttendanceDate = (date: Date) => {
    return format(new Date(date), "d/MM/yyyy", {
      locale: es,
    });
  };

  // Completion screen
  if (isCompletionShown) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-500">
        <div className="text-center">
          <div className="mb-4 inline-flex h-24 w-24 items-center justify-center rounded-full bg-white">
            <Check className="text-blue-500" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-white">¡Completado!</h2>
        </div>
      </div>
    );
  }

  // Taking attendance view
  if (
    view === "taking-attendance" &&
    selectedAttendance &&
    studentsOrdered.length > 0
  ) {
    const student = studentsOrdered[currentStudentIndex];
    const attendanceStatus = currentAttendanceRecords[student.id];

    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h1 className="text-xl font-medium">{selectedClass?.name}</h1>
            <p className="text-sm text-gray-500">
              {formatAttendanceDate(selectedAttendance.date)}
            </p>
          </div>
          <Button onClick={goBackToAttendances} variant="ghost" size="icon">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md mb-4 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${calculateAttendanceCompletion()}%` }}
            ></div>
          </div>

          <div
            className={`
              w-full max-w-md rounded-xl shadow-lg p-6 mb-4 transition-colors
              ${
                attendanceStatus === true
                  ? "bg-green-100"
                  : attendanceStatus === false
                  ? "bg-red-100"
                  : "bg-white"
              }
            `}
          >
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                {currentStudentIndex + 1} de {studentsOrdered.length}
              </p>
              <h2 className="text-2xl font-bold mb-1">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-gray-500">
                {student.age} años ·{" "}
                {student.gender === "M" ? "Masculino" : "Femenino"}
              </p>
            </div>
          </div>

          <div className="flex justify-between w-full max-w-md">
            <Button
              onClick={() => navigateStudent("previous")}
              variant="ghost"
              size="icon"
              disabled={currentStudentIndex === 0}
            >
              <ChevronLeft
                size={24}
                className={
                  currentStudentIndex === 0 ? "text-gray-300" : "text-gray-700"
                }
              />
            </Button>

            <div className="flex space-x-4">
              <Button
                onClick={() => recordAttendance(student.id, false)}
                className="bg-red-500 text-white w-32 h-32 flex items-center justify-center shadow-md hover:bg-red-600"
              >
                <X className="w-40" />
              </Button>

              <Button
                onClick={() => recordAttendance(student.id, true)}
                className="bg-green-500 text-white w-32 h-32 flex items-center justify-center shadow-md hover:bg-green-600"
              >
                <Check className="w-40" />
              </Button>
            </div>

            <Button
              onClick={() => navigateStudent("next")}
              variant="ghost"
              size="icon"
              disabled={currentStudentIndex === studentsOrdered.length - 1}
            >
              <ChevronRight
                size={24}
                className={
                  currentStudentIndex === studentsOrdered.length - 1
                    ? "text-gray-300"
                    : "text-gray-700"
                }
              />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Attendances list view
  if (view === "attendances" && selectedClass) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={goBackToClasses}
              variant="ghost"
              size="icon"
              className="p-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">{selectedClass.name}</h1>
          </div>
          <Button
            onClick={() => {
              form.reset({ date: new Date(), classId: selectedClass.id });
              setShowAddAttendanceDialog(true);
            }}
            className="fixed right-4 bottom-20 bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        <h2 className="text-lg font-medium mb-3">Registros de Asistencia</h2>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : attendances.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-500">No hay registros de asistencia</p>
            <p className="text-sm text-gray-400 mt-1">
              Crea un nuevo registro para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendances.map((attendance) => {
              // Calculate attendance stats
              const totalStudents = attendance.records.length;
              const presentStudents = attendance.records.filter(
                (r) => r.present
              ).length;
              const presentPercentage =
                totalStudents > 0
                  ? Math.round((presentStudents / totalStudents) * 100)
                  : 0;

              return (
                <Card
                  key={attendance.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedAttendance(attendance)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">
                          {formatAttendanceDate(attendance.date)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {totalStudents} estudiantes
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge
                          className={
                            presentPercentage >= 70
                              ? "bg-green-500"
                              : "bg-orange-500"
                          }
                        >
                          {presentPercentage}% asistencia
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {presentStudents} presentes
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          presentPercentage >= 70
                            ? "bg-green-500"
                            : "bg-orange-500"
                        }`}
                        style={{ width: `${presentPercentage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add New Attendance Dialog */}
        <Dialog
          open={showAddAttendanceDialog}
          onOpenChange={setShowAddAttendanceDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Asistencia</DialogTitle>
              <DialogDescription>
                Selecciona la fecha para el nuevo registro de asistencia.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitAddAttendance)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        className="rounded-md border"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <input
                  type="hidden"
                  {...form.register("classId", { value: selectedClass.id })}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddAttendanceDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Crear</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Classes list view (default)
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Registro de Asistencia</h1>

      {projects.length > 0 && (
        <div className="mb-4">
          <ProjectSelector projects={projects} />
        </div>
      )}

      {!activeProjectId ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Selecciona un proyecto para ver la asistencia
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay clases disponibles</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea una clase primero en la sección de Clases
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes
            .sort((a, b) => (b.createdAt < a.createdAt ? 1 : -1))
            .map((cls) => (
              <Card
                key={cls.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedClass(cls)}
              >
                <CardContent className="p-4">
                  <h2 className="text-lg font-medium">{cls.name}</h2>
                  <p className="text-sm text-gray-500">
                    {cls._count.students} estudiantes
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Delete Attendance Alert */}
      <AlertDialog
        open={showDeleteAttendanceAlert}
        onOpenChange={setShowDeleteAttendanceAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este registro de asistencia
              y todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttendance}
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

export default AsistenciaView;
