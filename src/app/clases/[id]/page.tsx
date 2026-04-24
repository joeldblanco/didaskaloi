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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  offlineCreateStudent,
  offlineUpdateStudent,
  offlineDeleteStudent,
  offlineGetStudents,
  offlineCalculateStudentAttendance,
  offlineGetClasses,
  offlineMergeStudents,
} from "@/lib/offline-actions";
import { studentSchema, type StudentFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Class, Student } from "@prisma/client";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUp,
  Loader2,
  Plus,
  Search,
  Trash,
  X,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ExtendedStudent extends Student {
  attendancePercentage: number;
}

interface MergeStudentsState {
  firstStudentId: string;
  secondStudentId: string;
  keepStudentId: string;
}

const createEmptyMergeStudentsState = (): MergeStudentsState => ({
  firstStudentId: "",
  secondStudentId: "",
  keepStudentId: "",
});

const formatMergeStudentLabel = (student: ExtendedStudent) => {
  const ageLabel = student.age != null ? `${student.age} años` : "Sin edad";
  const genderLabel = student.gender === "M" ? "Masculino" : "Femenino";
  return `${student.firstName} ${student.lastName} · ${ageLabel} · ${genderLabel}`;
};

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const ClassDetailPage = ({ params }: Props) => {
  const pageParams = use(params);
  const router = useRouter();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<ExtendedStudent[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortCriteria, setSortCriteria] = useState<string>("firstName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<ExtendedStudent | null>(
    null,
  );
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeStudentsState, setMergeStudentsState] =
    useState<MergeStudentsState>(createEmptyMergeStudentsState);
  const [isMergingStudents, setIsMergingStudents] = useState(false);

  const classId = pageParams.id;
  const studentsForMerge = [...students].sort((a, b) => {
    const fullNameA = `${a.firstName} ${a.lastName}`;
    const fullNameB = `${b.firstName} ${b.lastName}`;
    return fullNameA.localeCompare(fullNameB);
  });
  const firstMergeStudent =
    students.find(
      (student) => student.id === mergeStudentsState.firstStudentId,
    ) ?? null;
  const secondMergeStudent =
    students.find(
      (student) => student.id === mergeStudentsState.secondStudentId,
    ) ?? null;

  // Form for creating or editing a student
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "M",
      age: undefined,
      classId: classId,
    },
  });

  // Helper function to refresh students (works both online and offline)
  const refreshStudents = useCallback(async () => {
    try {
      // Get students with offline fallback
      const studentsData = await offlineGetStudents({ classId });

      // Calculate attendance percentages with offline fallback
      const studentsWithAttendance = await Promise.all(
        studentsData.map(async (student) => {
          const attendancePercentage = await offlineCalculateStudentAttendance(
            student.id,
          );
          return {
            ...student,
            attendancePercentage,
          };
        }),
      );

      setStudents(studentsWithAttendance as ExtendedStudent[]);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Error al cargar los estudiantes");
    }
  }, [classId]);

  const resetMergeStudentsState = useCallback(() => {
    setMergeStudentsState(createEmptyMergeStudentsState());
  }, []);

  const handleMergeStudentSelection = useCallback(
    (field: "firstStudentId" | "secondStudentId", value: string) => {
      setMergeStudentsState((prev) => {
        const nextState = {
          ...prev,
          [field]: value,
        };

        if (field === "firstStudentId" && nextState.secondStudentId === value) {
          nextState.secondStudentId = "";
        }

        if (field === "secondStudentId" && nextState.firstStudentId === value) {
          nextState.firstStudentId = "";
        }

        if (
          nextState.keepStudentId !== nextState.firstStudentId &&
          nextState.keepStudentId !== nextState.secondStudentId
        ) {
          nextState.keepStudentId = "";
        }

        return nextState;
      });
    },
    [],
  );

  const handleMergeStudents = useCallback(async () => {
    if (
      !mergeStudentsState.firstStudentId ||
      !mergeStudentsState.secondStudentId
    ) {
      toast.error("Debes seleccionar dos estudiantes para fusionar");
      return;
    }

    if (
      mergeStudentsState.firstStudentId === mergeStudentsState.secondStudentId
    ) {
      toast.error("Debes seleccionar dos estudiantes distintos");
      return;
    }

    if (!mergeStudentsState.keepStudentId) {
      toast.error("Debes elegir cuál estudiante conservar");
      return;
    }

    setIsMergingStudents(true);

    try {
      const result = await offlineMergeStudents(mergeStudentsState);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Estudiantes fusionados correctamente");
      setShowMergeDialog(false);
      resetMergeStudentsState();
      await refreshStudents();
    } catch (error) {
      console.error("Error merging students:", error);
      toast.error("Error al fusionar los estudiantes");
    } finally {
      setIsMergingStudents(false);
    }
  }, [mergeStudentsState, refreshStudents, resetMergeStudentsState]);

  // Load class and student data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load class data with offline fallback
        const classesData = await offlineGetClasses();
        const currentClass = classesData.find((c) => c.id === classId);

        if (!currentClass) {
          toast.error("Clase no encontrada");
          router.push("/clases");
          return;
        }

        setClassData(currentClass as Class);

        // Load students for this class with offline fallback
        await refreshStudents();
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };

    if (classId) {
      loadData();
    } else {
      router.push("/clases");
    }
  }, [classId, router, refreshStudents]);

  // Handle adding a new student
  const onSubmitAddStudent = async (data: StudentFormValues) => {
    try {
      const result = await offlineCreateStudent(data);

      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Estudiante creado (se sincronizará cuando haya conexión)"
          : "Estudiante creado correctamente";
        toast.success(message);
        setShowAddStudentDialog(false);

        // Refresh students using helper function
        await refreshStudents();

        // Reset form
        form.reset({
          firstName: "",
          lastName: "",
          gender: "M",
          age: undefined,
          classId: classId,
        });
      } else {
        const errorMessage =
          !result.success && "error" in result
            ? result.error
            : "Error al crear el estudiante";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error("Error al crear el estudiante");
    }
  };

  // Handle editing a student
  const onSubmitEditStudent = async (data: StudentFormValues) => {
    try {
      const result = await offlineUpdateStudent(data);

      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Estudiante actualizado (se sincronizará cuando haya conexión)"
          : "Estudiante actualizado correctamente";
        toast.success(message);
        setIsEditMode(false);
        setStudentToEdit(null);

        // Refresh students using helper function
        await refreshStudents();
      } else {
        const errorMessage =
          !result.success && "error" in result
            ? result.error
            : "Error al actualizar el estudiante";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Error al actualizar el estudiante");
    }
  };

  // Handle sorting changes
  const handleSort = (criteria: string) => {
    if (sortCriteria === criteria) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortCriteria(criteria);
      setSortDirection("asc");
    }
  };

  // Handle student click
  const handleStudentClick = (student: ExtendedStudent) => {
    setStudentToEdit(student);
    form.reset({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      age: student.age ?? undefined,
      classId: classId,
    });
    setIsEditMode(true);
  };

  // Handle deleting a student
  const handleDeleteStudent = async () => {
    if (!selectedStudentId) return;

    try {
      const result = await offlineDeleteStudent(selectedStudentId);

      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Estudiante eliminado (se sincronizará cuando haya conexión)"
          : "Estudiante eliminado correctamente";
        toast.success(message);

        // Refresh students using helper function
        await refreshStudents();
        setIsEditMode(false);
        setStudentToEdit(null);
      } else {
        const errorMessage =
          !result.success && "error" in result
            ? result.error
            : "Error al eliminar el estudiante";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Error al eliminar el estudiante");
    } finally {
      setShowDeleteAlert(false);
      setSelectedStudentId(null);
    }
  };

  // Filter and sort students
  const filteredAndSortedStudents = [...students]
    .filter((student) => {
      const matchesSearch = `${student.firstName} ${student.lastName}`
        .toLowerCase()
        .includes(searchText.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortCriteria === "firstName") {
        return sortDirection === "asc"
          ? a.firstName.localeCompare(b.firstName)
          : b.firstName.localeCompare(a.firstName);
      } else if (sortCriteria === "lastName") {
        return sortDirection === "asc"
          ? a.lastName.localeCompare(b.lastName)
          : b.lastName.localeCompare(a.lastName);
      } else if (sortCriteria === "age") {
        return sortDirection === "asc"
          ? (a.age ?? 0) - (b.age ?? 0)
          : (b.age ?? 0) - (a.age ?? 0);
      } else if (sortCriteria === "gender") {
        return sortDirection === "asc"
          ? a.gender.localeCompare(b.gender)
          : b.gender.localeCompare(a.gender);
      } else if (sortCriteria === "attendance") {
        return sortDirection === "asc"
          ? (a.attendancePercentage || 0) - (b.attendancePercentage || 0)
          : (b.attendancePercentage || 0) - (a.attendancePercentage || 0);
      }
      return 0;
    });

  // Student editing view
  if (isEditMode && studentToEdit) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setIsEditMode(false);
                setStudentToEdit(null);
              }}
              variant="ghost"
              size="icon"
              className="p-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">Editar Estudiante</h1>
          </div>
          <Button
            onClick={() => {
              setIsEditMode(false);
              setStudentToEdit(null);
            }}
            variant="ghost"
            size="icon"
          >
            <X size={20} />
          </Button>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmitEditStudent)}
            className="space-y-4"
          >
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
                      className="flex gap-4"
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
                      placeholder="Edad del estudiante"
                      {...fieldRest}
                      value={value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        fieldRest.onChange(
                          val === "" ? "" : parseInt(val) || "",
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <input
              type="hidden"
              {...form.register("classId", { value: classId })}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Actualizar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => {
                  setSelectedStudentId(studentToEdit.id);
                  setShowDeleteAlert(true);
                }}
              >
                Eliminar
              </Button>
            </div>
          </form>
        </Form>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente a{" "}
                {studentToEdit.firstName} {studentToEdit.lastName} y todos sus
                registros de asistencia.
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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/clases")}
            variant="ghost"
            size="icon"
            className="p-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">{classData?.name}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMergeDialog(true)}
          disabled={students.length < 2}
        >
          <ArrowRightLeft size={16} />
          Fusionar
        </Button>
        <Button
          onClick={() => setShowAddStudentDialog(true)}
          className="fixed right-4 bottom-20 bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <Input
          type="text"
          placeholder="Buscar estudiantes..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 py-2">
          <Button
            onClick={() => handleSort("firstName")}
            variant={sortCriteria === "firstName" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            Nombre
            {sortCriteria === "firstName" &&
              (sortDirection === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              ))}
          </Button>

          <Button
            onClick={() => handleSort("lastName")}
            variant={sortCriteria === "lastName" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            Apellidos
            {sortCriteria === "lastName" &&
              (sortDirection === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              ))}
          </Button>

          <Button
            onClick={() => handleSort("attendance")}
            variant={sortCriteria === "attendance" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            Asistencia
            {sortCriteria === "attendance" &&
              (sortDirection === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              ))}
          </Button>

          <Button
            onClick={() => handleSort("age")}
            variant={sortCriteria === "age" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            Edad
            {sortCriteria === "age" &&
              (sortDirection === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              ))}
          </Button>

          <Button
            onClick={() => handleSort("gender")}
            variant={sortCriteria === "gender" ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            Género
            {sortCriteria === "gender" &&
              (sortDirection === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              ))}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredAndSortedStudents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No hay estudiantes en esta clase que cumplan los criterios de
            búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-20">
          {filteredAndSortedStudents.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleStudentClick(student)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {student.firstName} {student.lastName}
                      </h3>
                      {(student.attendancePercentage || 0) < 70 && (
                        <AlertTriangle
                          size={16}
                          className="text-orange-500"
                          aria-label="Asistencia baja"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {student.age != null ? `${student.age} años` : "Sin edad"}{" "}
                      · {student.gender === "M" ? "Masculino" : "Femenino"}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Badge
                      className={
                        (student.attendancePercentage || 0) >= 70
                          ? "bg-green-500"
                          : "bg-orange-500"
                      }
                    >
                      {student.attendancePercentage || 0}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentId(student.id);
                        setShowDeleteAlert(true);
                      }}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      (student.attendancePercentage || 0) >= 70
                        ? "bg-green-500"
                        : "bg-orange-500"
                    }`}
                    style={{ width: `${student.attendancePercentage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al estudiante y todos sus
              registros de asistencia.
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

      <Dialog
        open={showMergeDialog}
        onOpenChange={(open) => {
          if (isMergingStudents) {
            return;
          }

          setShowMergeDialog(open);
          if (!open) {
            resetMergeStudentsState();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionar estudiantes</DialogTitle>
            <DialogDescription>
              Selecciona dos estudiantes de esta clase y elige cuál registro
              conservar. Si hay asistencias cruzadas, se tomará como asistente
              cuando al menos uno esté marcado presente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="merge-student-a">Primer estudiante</Label>
              <Select
                value={mergeStudentsState.firstStudentId}
                onValueChange={(value) =>
                  handleMergeStudentSelection("firstStudentId", value)
                }
              >
                <SelectTrigger id="merge-student-a">
                  <SelectValue placeholder="Selecciona el primer estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {studentsForMerge
                    .filter(
                      (student) =>
                        student.id !== mergeStudentsState.secondStudentId,
                    )
                    .map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {formatMergeStudentLabel(student)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="merge-student-b">Segundo estudiante</Label>
              <Select
                value={mergeStudentsState.secondStudentId}
                onValueChange={(value) =>
                  handleMergeStudentSelection("secondStudentId", value)
                }
              >
                <SelectTrigger id="merge-student-b">
                  <SelectValue placeholder="Selecciona el segundo estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {studentsForMerge
                    .filter(
                      (student) =>
                        student.id !== mergeStudentsState.firstStudentId,
                    )
                    .map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {formatMergeStudentLabel(student)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {firstMergeStudent && secondMergeStudent && (
              <div className="flex flex-col gap-2 rounded-md border p-4">
                <Label>Registro a conservar</Label>
                <RadioGroup
                  value={mergeStudentsState.keepStudentId}
                  onValueChange={(value) =>
                    setMergeStudentsState((prev) => ({
                      ...prev,
                      keepStudentId: value,
                    }))
                  }
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-start gap-2 rounded-md border p-3">
                    <RadioGroupItem
                      value={firstMergeStudent.id}
                      id={`keep-${firstMergeStudent.id}`}
                    />
                    <Label
                      htmlFor={`keep-${firstMergeStudent.id}`}
                      className="cursor-pointer"
                    >
                      {formatMergeStudentLabel(firstMergeStudent)}
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border p-3">
                    <RadioGroupItem
                      value={secondMergeStudent.id}
                      id={`keep-${secondMergeStudent.id}`}
                    />
                    <Label
                      htmlFor={`keep-${secondMergeStudent.id}`}
                      className="cursor-pointer"
                    >
                      {formatMergeStudentLabel(secondMergeStudent)}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMergeDialog(false);
                  resetMergeStudentsState();
                }}
                disabled={isMergingStudents}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleMergeStudents}
                disabled={
                  isMergingStudents ||
                  !mergeStudentsState.firstStudentId ||
                  !mergeStudentsState.secondStudentId ||
                  !mergeStudentsState.keepStudentId
                }
              >
                {isMergingStudents && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Fusionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog
        open={showAddStudentDialog}
        onOpenChange={setShowAddStudentDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Estudiante</DialogTitle>
            <DialogDescription>
              Ingresa la información del nuevo estudiante para la clase{" "}
              {classData?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitAddStudent)}
              className="space-y-4"
            >
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
                      <Input
                        placeholder="Apellidos del estudiante"
                        {...field}
                      />
                    </FormControl>
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
                        className="flex gap-4"
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
                        placeholder="Edad del estudiante"
                        {...fieldRest}
                        value={value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          fieldRest.onChange(
                            val === "" ? "" : parseInt(val) || "",
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <input
                type="hidden"
                {...form.register("classId", { value: classId })}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddStudentDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassDetailPage;
