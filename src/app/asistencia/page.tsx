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
  offlineGetClasses,
  offlineGetAttendances,
  offlineGetAttendance,
  offlineCreateAttendance,
  offlineDeleteAttendance,
  offlineUpdateAttendanceRecord,
} from "@/lib/offline-actions";
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
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useProject } from "@/contexts/project-context";
import confetti from "canvas-confetti";

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
    Record<string, boolean>
  >({});
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
          const data = await offlineGetAttendances(selectedClass.id);
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
        const rawAttendanceData = await offlineGetAttendance(selectedAttendance.id);

        if (!rawAttendanceData) {
          toast.error("Error al cargar los datos de asistencia");
          return;
        }

        // Cast to expected shape
        const attendanceData = rawAttendanceData as unknown as {
          class: { students: Student[] };
          records: (AttendanceRecord & { student: Student })[];
        };

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
        const records: Record<string, boolean> = {};
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

  // Handle attendance records — immediate UI update, async save
  const recordAttendance = useCallback(
    (studentId: string, present: boolean) => {
      if (!selectedAttendance) return;

      // Update UI immediately
      setCurrentAttendanceRecords((prev) => ({
        ...prev,
        [studentId]: present,
      }));

      // Save to DB asynchronously — fire and forget
      offlineUpdateAttendanceRecord({
        studentId,
        attendanceId: selectedAttendance.id,
        present,
      }).catch(() => {
        toast.error("Error al guardar el registro de asistencia");
      });

      // Navigate to next student (or past the end for the last one)
      setCurrentStudentIndex(currentStudentIndex + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedAttendance, currentStudentIndex, studentsOrdered.length]
  );

  const refreshAttendanceData = async () => {
    if (!selectedClass) return;

    try {
      const updatedAttendances = await offlineGetAttendances(selectedClass.id);
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
      currentStudentIndex < studentsOrdered.length
    ) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  // Handle adding a new attendance
  const onSubmitAddAttendance = async (data: AttendanceFormValues) => {
    try {
      const result = await offlineCreateAttendance(data);

      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Asistencia creada (se sincronizará cuando haya conexión)"
          : "Asistencia creada correctamente";
        toast.success(message);
        setShowAddAttendanceDialog(false);

        // Refresh attendances
        const updatedAttendances = await offlineGetAttendances(selectedClass?.id);
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
        toast.error((result as { error?: string }).error || "Error al crear la asistencia");
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
      const result = await offlineDeleteAttendance(selectedAttendance.id);

      if (result.success) {
        const message = (result as { offline?: boolean }).offline
          ? "Asistencia eliminada (se sincronizará cuando haya conexión)"
          : "Asistencia eliminada correctamente";
        toast.success(message);
        setShowDeleteAttendanceAlert(false);

        // Refresh attendances
        const updatedAttendances = await offlineGetAttendances(selectedClass?.id);
        setAttendances(updatedAttendances as AttendanceWithRelations[]);

        // Go back to attendances list
        goBackToAttendances();
      } else {
        toast.error((result as { error?: string }).error || "Error al eliminar la asistencia");
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

  // Swipe state for attendance-taking
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [edgeFlash, setEdgeFlash] = useState<"green" | "red" | null>(null);
  const dragStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const skipTransition = useRef(false);
  const [enterFromBottom, setEnterFromBottom] = useState(false);

  const SWIPE_THRESHOLD = 80;

  // Deterministic rotation/offset per student — consistent regardless of stack position
  const getCardTilt = (studentId: string) => {
    const seed = studentId.charCodeAt(0) + studentId.charCodeAt(studentId.length - 1);
    const rotation = ((seed % 7) - 3) * 1.2;
    const tx = ((seed % 5) - 2) * 2.5;
    return { rotation, tx };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(true);
    setSwipeOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      // Clamp upward movement so the card doesn't move up visually
      setSwipeOffset({ x: dx, y: Math.max(0, dy) });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStart.current) return;
      setIsDragging(false);

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const student = studentsOrdered[currentStudentIndex];
      if (!student) {
        dragStart.current = null;
        setSwipeOffset({ x: 0, y: 0 });
        return;
      }

      // Determine dominant direction
      if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) {
        // Not enough movement — snap back
        setSwipeOffset({ x: 0, y: 0 });
        dragStart.current = null;
        return;
      }

      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0) {
          // Right = present
          setExitDirection("right");
          setEdgeFlash("green");
          setTimeout(() => {
            recordAttendance(student.id, true);
            resetCard();
          }, 300);
        } else {
          // Left = absent
          setExitDirection("left");
          setEdgeFlash("red");
          setTimeout(() => {
            recordAttendance(student.id, false);
            resetCard();
          }, 300);
        }
      } else {
        // Vertical swipe
        if (dy > 0) {
          // Down = skip
          setExitDirection("down");
          setTimeout(() => {
            navigateStudent("next");
            resetCard();
          }, 300);
        } else {
          // Up = previous: animate new card IN from bottom
          if (currentStudentIndex > 0) {
            // Snap current card back, change index, and animate entry
            setSwipeOffset({ x: 0, y: 0 });
            navigateStudent("previous");
            setEnterFromBottom(true);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setEnterFromBottom(false);
              });
            });
          } else {
            setSwipeOffset({ x: 0, y: 0 });
          }
        }
      }

      dragStart.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDragging, studentsOrdered, currentStudentIndex, recordAttendance]
  );

  const resetCard = useCallback(() => {
    // Suppress transition so the new card doesn't animate into place
    skipTransition.current = true;
    setExitDirection(null);
    setEdgeFlash(null);
    setSwipeOffset({ x: 0, y: 0 });
    // Re-enable transitions after the card has rendered in place
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        skipTransition.current = false;
      });
    });
  }, []);

  // Clear edge flash after animation
  useEffect(() => {
    if (edgeFlash) {
      const t = setTimeout(() => setEdgeFlash(null), 500);
      return () => clearTimeout(t);
    }
  }, [edgeFlash]);

  // Compute card transform
  const getCardStyle = (): React.CSSProperties => {
    if (exitDirection) {
      const exits: Record<string, string> = {
        left: "translateX(-150vw)",
        right: "translateX(150vw)",
        up: "translateY(-150vh)",
        down: "translateY(150vh)",
      };
      return {
        transform: exits[exitDirection],
        transition: "transform 0.3s ease-out",
      };
    }
    if (enterFromBottom) {
      return {
        transform: "translateY(150vh)",
        transition: "none",
      };
    }
    if (isDragging) {
      return {
        transform: `translate(${swipeOffset.x}px, ${swipeOffset.y}px) rotate(${swipeOffset.x * 0.05}deg)`,
        transition: "none",
      };
    }
    // Resting position: use the student's own tilt so there's no snap from background
    const student = studentsOrdered[currentStudentIndex];
    if (student) {
      const { rotation, tx } = getCardTilt(student.id);
      return {
        transform: `translateX(${tx}px) rotate(${rotation}deg)`,
        transition: skipTransition.current ? "none" : "transform 0.35s ease-out",
      };
    }
    return {
      transform: "translate(0, 0) rotate(0deg)",
      transition: skipTransition.current ? "none" : "transform 0.35s ease-out",
    };
  };

  // Trigger completion when index goes past the last student
  useEffect(() => {
    if (
      view === "taking-attendance" &&
      studentsOrdered.length > 0 &&
      currentStudentIndex >= studentsOrdered.length
    ) {
      // Fire confetti
      const end = Date.now() + 1500;
      const colors = ["#22c55e", "#4ade80", "#86efac", "#16a34a"];
      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();

      // Refresh attendance data asynchronously
      refreshAttendanceData();

      // After 2.5 seconds, go back to attendances list
      setTimeout(() => {
        goBackToAttendances();
      }, 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStudentIndex, studentsOrdered.length, view]);

  // Taking attendance view
  if (
    view === "taking-attendance" &&
    selectedAttendance &&
    studentsOrdered.length > 0
  ) {
    const student = studentsOrdered[currentStudentIndex];
    const isComplete = currentStudentIndex >= studentsOrdered.length;

    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background overflow-hidden select-none">
        {/* Edge flash effects */}
        {edgeFlash === "green" && (
          <div className="absolute inset-y-0 right-0 w-16 z-50 pointer-events-none animate-in fade-in-0 fade-out-0 duration-500 bg-gradient-to-l from-green-400/60 to-transparent" />
        )}
        {edgeFlash === "red" && (
          <div className="absolute inset-y-0 left-0 w-16 z-50 pointer-events-none animate-in fade-in-0 fade-out-0 duration-500 bg-gradient-to-r from-red-400/60 to-transparent" />
        )}

        {/* Small X icon top-left */}
        <button
          onClick={goBackToAttendances}
          className="absolute top-4 left-4 z-30 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={20} />
        </button>

        {/* Progress bar */}
        <div className="px-14 pt-5">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${calculateAttendanceCompletion()}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {Object.keys(currentAttendanceRecords).length} / {studentsOrdered.length}
          </p>
        </div>

        {/* Swipeable area — covers cards + everything below for swipe-up gesture */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="relative w-full max-w-sm" style={{ height: 220 }}>
            {/* Green check underneath all cards — visible when last card is swiped away */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ zIndex: 1 }}
            >
              <div className="text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-3">
                  <Check className="text-green-500" size={40} />
                </div>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">¡Completado!</p>
              </div>
            </div>

            {/* Background stacked cards (up to 3 behind) */}
            {!isComplete && [3, 2, 1].map((offset) => {
              const bgIndex = currentStudentIndex + offset;
              if (bgIndex >= studentsOrdered.length) return null;
              const bgStudent = studentsOrdered[bgIndex];
              const { rotation, tx: translateX } = getCardTilt(bgStudent.id);
              return (
                <div
                  key={bgStudent.id}
                  className="absolute inset-0 rounded-2xl bg-card border border-border shadow-md p-8 overflow-hidden"
                  style={{
                    transform: `rotate(${rotation}deg) translateX(${translateX}px)`,
                    zIndex: 10 - offset,
                    opacity: 1 - offset * 0.15,
                  }}
                >
                  {offset === 1 && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        {bgIndex + 1} de {studentsOrdered.length}
                      </p>
                      <h2 className="text-2xl font-bold mb-1 text-foreground">
                        {bgStudent.firstName} {bgStudent.lastName}
                      </h2>
                      <p className="text-muted-foreground">
                        {bgStudent.age != null ? `${bgStudent.age} años` : "Sin edad"} ·{" "}
                        {bgStudent.gender === "M" ? "Masculino" : "Femenino"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Active top card (only if not complete) */}
            {!isComplete && student && (
              <div
                ref={cardRef}
                className="absolute inset-0 rounded-2xl shadow-lg p-8 cursor-grab active:cursor-grabbing bg-card border border-border"
                style={{ ...getCardStyle(), zIndex: 20 }}
              >
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {currentStudentIndex + 1} de {studentsOrdered.length}
                  </p>
                  <h2 className="text-2xl font-bold mb-1 text-foreground">
                    {student.firstName} {student.lastName}
                  </h2>
                  <p className="text-muted-foreground">
                    {student.age != null ? `${student.age} años` : "Sin edad"} ·{" "}
                    {student.gender === "M" ? "Masculino" : "Femenino"}
                  </p>
                  {currentAttendanceRecords[student.id] !== undefined && (
                    <div className="mt-3">
                      <Badge
                        className={
                          currentAttendanceRecords[student.id]
                            ? "bg-green-500"
                            : "bg-red-500"
                        }
                      >
                        {currentAttendanceRecords[student.id]
                          ? "Presente"
                          : "Ausente"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Swipe hints */}
          {!isComplete && (
            <div className="mt-6 text-center space-y-1 pointer-events-none">
              <p className="text-xs text-muted-foreground">
                ← Ausente · Presente →
              </p>
              <p className="text-xs text-muted-foreground">
                ↓ Saltar · ↑ Anterior
              </p>
            </div>
          )}
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
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No hay registros de asistencia</p>
            <p className="text-sm text-muted-foreground mt-1">
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
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedAttendance(attendance)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">
                          {formatAttendanceDate(attendance.date)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {presentStudents} presentes
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5">
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
      <Button variant="link" asChild className="p-0 h-auto mb-2 text-muted-foreground">
        <Link href="/proyectos">
          <ChevronLeft size={16} />
          Volver a Proyectos
        </Link>
      </Button>
      <h1 className="text-xl font-bold mb-4">Registro de Asistencia</h1>

      {!activeProjectId ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Selecciona un proyecto para ver la asistencia
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay clases disponibles</p>
          <p className="text-sm text-muted-foreground mt-1">
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
                className="cursor-pointer hover:bg-accent"
                onClick={() => setSelectedClass(cls)}
              >
                <CardContent className="p-4">
                  <h2 className="text-lg font-medium">{cls.name}</h2>
                  <p className="text-sm text-muted-foreground">
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
