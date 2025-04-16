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
  calculateStudentAttendance,
  createStudent,
  deleteStudent,
  getClasses,
  getStudents,
  updateStudent,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import { studentSchema, type StudentFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Class, Student } from "@prisma/client";
import {
  AlertCircle,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
  const [students, setStudents] = useState<ExtendedStudent[]>([]);
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<"M" | "F" | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<ExtendedStudent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Form for creating or editing students
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "M",
      age: 18,
      classId: undefined,
    },
  });

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const classesData = await getClasses();
        setClasses(classesData as ClassWithCount[]);

        const studentsData = await getStudents();

        // Calculate attendance percentages
        const studentsWithAttendance = await Promise.all(
          studentsData.map(async (student) => {
            const attendancePercentage = await calculateStudentAttendance(
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
  }, []);

  // Filter students based on search and filters
  const filteredStudents = students.filter((student) => {
    const matchesSearch = `${student.firstName} ${student.lastName}`
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchesClass = classFilter
      ? student.classId === parseInt(classFilter)
      : true;

    const matchesGender = genderFilter ? student.gender === genderFilter : true;

    return matchesSearch && matchesClass && matchesGender;
  });

  // Start creating a new student
  const startCreating = () => {
    form.reset({
      firstName: "",
      lastName: "",
      gender: "M",
      age: 18,
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
      age: student.age,
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
        result = await updateStudent(data);

        if (result.success) {
          toast.success("Estudiante actualizado correctamente");
        }
      } else {
        // Create new student
        result = await createStudent(data);

        if (result.success) {
          toast.success("Estudiante creado correctamente");
        }
      }

      if (result?.success) {
        // Refresh students
        const studentsData = await getStudents();

        // Calculate attendance percentages
        const studentsWithAttendance = await Promise.all(
          studentsData.map(async (student) => {
            const attendancePercentage = await calculateStudentAttendance(
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
        toast.error(result?.error || "Error al guardar el estudiante");
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
      const result = await deleteStudent(selectedStudent.id);

      if (result.success) {
        toast.success("Estudiante eliminado correctamente");

        // Refresh students
        const studentsData = await getStudents();

        // Calculate attendance percentages
        const studentsWithAttendance = await Promise.all(
          studentsData.map(async (student) => {
            const attendancePercentage = await calculateStudentAttendance(
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
  const getClassName = (classId: number) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : "Sin clase";
  };

  // Student editing view
  if (isEditMode) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clase</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full mt-4">
              {selectedStudent ? "Actualizar" : "Guardar"}
            </Button>

            {selectedStudent && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => setShowDeleteAlert(true)}
              >
                Eliminar
              </Button>
            )}
          </form>
        </Form>

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

  // Students list view
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Estudiantes</h1>

      {/* Search and Filters */}
      <div className="mb-4 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <Input
          type="text"
          placeholder="Buscar estudiantes..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10"
        />
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          <Filter className={cn(showFilters && "text-blue-500")} size={18} />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Filtros</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="class-filter" className="block mb-3">
                  Clase
                </Label>
                <Select
                  value={classFilter || ""}
                  onValueChange={(value) =>
                    setClassFilter(value === "" ? null : value)
                  }
                >
                  <SelectTrigger id="class-filter" className="w-full">
                    <SelectValue placeholder="Todas las clases" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block mb-3">Género</Label>
                <RadioGroup
                  value={genderFilter || "all"}
                  onValueChange={(value) =>
                    setGenderFilter(
                      value === "all" ? null : (value as "M" | "F")
                    )
                  }
                  className="flex flex-col"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all-gender" />
                    <Label htmlFor="all-gender">Todos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="M" id="filter-male" />
                    <Label htmlFor="filter-male">Masculino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="F" id="filter-female" />
                    <Label htmlFor="filter-female">Femenino</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={clearFilters}
                variant="link"
                className="text-blue-500 p-0 h-auto"
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-500">
            {searchText || classFilter || genderFilter
              ? "No se encontraron estudiantes con los filtros seleccionados"
              : "No hay estudiantes registrados"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-20">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => startEditing(student)}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {student.age} años ·{" "}
                    {student.gender === "M" ? "Masculino" : "Femenino"}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                    {getClassName(student.classId)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      (student.attendancePercentage || 0) >= 70
                        ? "bg-green-500"
                        : "bg-orange-500"
                    }
                  >
                    {student.attendancePercentage || 0}%
                  </Badge>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={startCreating}
        className="fixed right-4 bottom-20 bg-blue-500 hover:bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
};

export default EstudiantesView;
