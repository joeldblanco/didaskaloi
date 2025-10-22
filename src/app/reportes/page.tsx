"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { offlineGetAgeRanges, offlineGetClasses, offlineGetStudents } from "@/lib/offline-actions";
import { AgeRange, Class, Student } from "@prisma/client";
import { ChevronLeft, Loader2, LayoutGrid, User, Users, Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { exportReportToPDF, exportReportToExcel } from "@/lib/export-utils";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface ClassWithCount extends Class {
  _count: {
    students: number;
  };
}

// Extended student type with additional properties based on Prisma schema
interface ExtendedStudent extends Student {
  class: Class;
  attendancePercentage: number;
  attendanceRecords: {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    present: boolean;
    studentId: number;
    attendanceId: number;
    attendance?: {
      date: Date;
    };
  }[];
}

interface ReportData {
  genderDistribution: { name: string; value: number }[];
  bestAttendance: {
    overall: ExtendedStudent | null;
    male: ExtendedStudent | null;
    female: ExtendedStudent | null;
  };
  studentsByAgeRange: { range: string; count: number }[];
  attendanceByAgeRange: { range: string; average: number }[];
  studentsByAgeRangeAndGender: {
    range: string;
    masculino: number;
    femenino: number;
  }[];
  classesSummary?: {
    name: string;
    students: number;
    averageAttendance: number;
  }[];
}

const ReportesView = () => {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [students, setStudents] = useState<ExtendedStudent[]>([]);
  const [ageRanges, setAgeRanges] = useState<AgeRange[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isGeneralReport, setIsGeneralReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [classesData, studentsData, ageRangesData] = await Promise.all([
          offlineGetClasses(),
          offlineGetStudents(),
          offlineGetAgeRanges(),
        ]);

        setClasses(classesData as ClassWithCount[]);

        // Process students data to include attendancePercentage
        const processedStudents = studentsData.map((student) => {
          // Calculate attendance percentage based on attendance records
          const attendanceRecords = (student as unknown as ExtendedStudent).attendanceRecords || [];
          const totalRecords = attendanceRecords.length;
          const presentCount = attendanceRecords.filter(
            (record: { present: boolean }) => record.present
          ).length;
          const attendancePercentage =
            totalRecords > 0
              ? Math.round((presentCount / totalRecords) * 100)
              : 0;

          return {
            ...student,
            attendancePercentage,
          };
        });

        setStudents(processedStudents as ExtendedStudent[]);
        setAgeRanges(ageRangesData as AgeRange[]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Generate report data - using useCallback to memoize the function
  const generateReportData = useCallback(() => {
    try {
      // Determine which students to include in the report
      let studentsToInclude = [];

      if (isGeneralReport) {
        // Include all students for the general report
        studentsToInclude = students;
      } else if (selectedClass) {
        // Include only students from the selected class
        studentsToInclude = students.filter(
          (student) => student.classId === selectedClass.id
        );
      } else {
        return; // No selection made yet
      }

      // 1. Gender distribution
      const maleCount = studentsToInclude.filter(
        (s) => s.gender === "M"
      ).length;
      const femaleCount = studentsToInclude.filter(
        (s) => s.gender === "F"
      ).length;

      // 2. Best attendance students
      const sortedByAttendance = [...studentsToInclude].sort(
        (a, b) => (b.attendancePercentage || 0) - (a.attendancePercentage || 0)
      );

      const bestOverall =
        sortedByAttendance.length > 0 ? sortedByAttendance[0] : null;
      const bestMale =
        sortedByAttendance.filter((s) => s.gender === "M")[0] || null;
      const bestFemale =
        sortedByAttendance.filter((s) => s.gender === "F")[0] || null;

      // 3. Students by age range
      const studentsByAgeRange = ageRanges.map((range) => {
        const count = studentsToInclude.filter(
          (s) => s.age >= range.minAge && s.age <= range.maxAge
        ).length;

        return {
          range: range.label,
          count,
        };
      });

      // 4. Average attendance by age range
      const attendanceByAgeRange = ageRanges.map((range) => {
        const rangeStudents = studentsToInclude.filter(
          (s) => s.age >= range.minAge && s.age <= range.maxAge
        );

        const average =
          rangeStudents.length > 0
            ? rangeStudents.reduce(
                (sum, s) => sum + (s.attendancePercentage || 0),
                0
              ) / rangeStudents.length
            : 0;

        return {
          range: range.label,
          average: Math.round(average),
        };
      });

      // 5. NEW: Students by age range and gender
      const studentsByAgeRangeAndGender = ageRanges.map((range) => {
        const rangeStudents = studentsToInclude.filter(
          (s) => s.age >= range.minAge && s.age <= range.maxAge
        );

        const maleStudents = rangeStudents.filter(
          (s) => s.gender === "M"
        ).length;
        const femaleStudents = rangeStudents.filter(
          (s) => s.gender === "F"
        ).length;

        return {
          range: range.label,
          masculino: maleStudents,
          femenino: femaleStudents,
        };
      });

      // 6. Classes summary (only for general report)
      let classesSummary = undefined;
      if (isGeneralReport) {
        classesSummary = classes.map((cls) => {
          const classStudents = students.filter((s) => s.classId === cls.id);
          const totalAttendance = classStudents.reduce(
            (sum, s) => sum + (s.attendancePercentage || 0),
            0
          );
          const averageAttendance =
            classStudents.length > 0
              ? Math.round(totalAttendance / classStudents.length)
              : 0;

          return {
            name: cls.name,
            students: classStudents.length,
            averageAttendance,
          };
        });
      }

      // Set the report data
      setReportData({
        genderDistribution: [
          { name: "Masculino", value: maleCount },
          { name: "Femenino", value: femaleCount },
        ],
        bestAttendance: {
          overall: bestOverall,
          male: bestMale,
          female: bestFemale,
        },
        studentsByAgeRange,
        attendanceByAgeRange,
        studentsByAgeRangeAndGender,
        classesSummary,
      });
    } catch (error) {
      console.error("Error generating report data:", error);
      toast.error("Error al generar los datos del reporte");
    }
  }, [selectedClass, students, ageRanges, classes, isGeneralReport]);

  // Generate report data when selection changes
  useEffect(() => {
    if (selectedClass || isGeneralReport) {
      generateReportData();
    }
  }, [selectedClass, isGeneralReport, generateReportData]);

  // Function to handle viewing general report
  const handleViewGeneralReport = () => {
    setSelectedClass(null);
    setIsGeneralReport(true);
  };

  // Function to go back to class selection
  const handleBackToSelection = () => {
    setSelectedClass(null);
    setIsGeneralReport(false);
    setReportData(null);
  };

  // Handle export functions
  const handleExportPDF = () => {
    if (!reportData) return;
    const title = isGeneralReport ? "Reporte General" : selectedClass?.name || "Reporte";
    try {
      exportReportToPDF(reportData, title);
      toast.success("Reporte exportado a PDF correctamente");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Error al exportar el reporte a PDF");
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    const title = isGeneralReport ? "Reporte General" : selectedClass?.name || "Reporte";
    try {
      await exportReportToExcel(reportData, title);
      toast.success("Reporte exportado a Excel correctamente");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error al exportar el reporte a Excel");
    }
  };

  // Report view for a selected class or general report
  if ((selectedClass || isGeneralReport) && reportData) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBackToSelection}
              variant="ghost"
              size="icon"
              className="p-0"
            >
              <ChevronLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">
              {isGeneralReport ? "Reporte General" : selectedClass?.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download size={16} />
              PDF
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <FileSpreadsheet size={16} />
              Excel
            </Button>
          </div>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="gender"
          className="space-y-4"
        >
          {/* Gender Distribution Section */}
          <AccordionItem
            value="gender"
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Distribución por Género</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 border-t">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.genderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Masculino</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {reportData.genderDistribution[0].value}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                    <span>Femenino</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {reportData.genderDistribution[1].value}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Age Range and Gender Distribution Section - NEW */}
          <AccordionItem
            value="ageGender"
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-500" />
                <span className="font-medium">
                  Distribución por Edad y Género
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 border-t">
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.studentsByAgeRangeAndGender}>
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="masculino" fill="#3b82f6" name="Masculino" />
                    <Bar dataKey="femenino" fill="#ec4899" name="Femenino" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {reportData.studentsByAgeRangeAndGender.map((item, index) => (
                  <div key={index} className="border-b pb-2">
                    <h3 className="font-medium">{item.range}</h3>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>
                          Masculino:{" "}
                          <span className="font-medium">{item.masculino}</span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                        <span>
                          Femenino:{" "}
                          <span className="font-medium">{item.femenino}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Best Attendance Section */}
          <AccordionItem
            value="attendance"
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-500" />
                <span className="font-medium">Mejores Asistencias</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 border-t">
              {reportData.bestAttendance.overall && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-500 mb-2">General</h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <p className="font-medium">
                            {reportData.bestAttendance.overall.firstName}{" "}
                            {reportData.bestAttendance.overall.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {reportData.bestAttendance.overall.age} años ·{" "}
                            {reportData.bestAttendance.overall.gender === "M"
                              ? "Masculino"
                              : "Femenino"}
                            {isGeneralReport &&
                              reportData.bestAttendance.overall.class && (
                                <>
                                  {" "}
                                  ·{" "}
                                  {reportData.bestAttendance.overall.class.name}
                                </>
                              )}
                          </p>
                        </div>
                        <Badge className="bg-green-500">
                          {
                            reportData.bestAttendance.overall
                              .attendancePercentage
                          }
                          %
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {reportData.bestAttendance.male && (
                  <div>
                    <h3 className="font-medium text-gray-500 mb-2">Varones</h3>
                    <Card className="bg-blue-50">
                      <CardContent className="p-3">
                        <p className="font-medium">
                          {reportData.bestAttendance.male.firstName}{" "}
                          {reportData.bestAttendance.male.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {reportData.bestAttendance.male.age} años
                          {isGeneralReport &&
                            reportData.bestAttendance.male.class && (
                              <>
                                {" "}
                                · {reportData.bestAttendance.male.class.name}
                              </>
                            )}
                        </p>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {reportData.bestAttendance.male.attendancePercentage}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {reportData.bestAttendance.female && (
                  <div>
                    <h3 className="font-medium text-gray-500 mb-2">Mujeres</h3>
                    <Card className="bg-pink-50">
                      <CardContent className="p-3">
                        <p className="font-medium">
                          {reportData.bestAttendance.female.firstName}{" "}
                          {reportData.bestAttendance.female.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {reportData.bestAttendance.female.age} años
                          {isGeneralReport &&
                            reportData.bestAttendance.female.class && (
                              <>
                                {" "}
                                · {reportData.bestAttendance.female.class.name}
                              </>
                            )}
                        </p>
                        <p className="text-lg font-bold text-pink-600 mt-1">
                          {
                            reportData.bestAttendance.female
                              .attendancePercentage
                          }
                          %
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Age Distribution Section */}
          <AccordionItem
            value="age"
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Distribución por Edad</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 border-t">
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.studentsByAgeRange}>
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#a855f7" name="Estudiantes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {reportData.studentsByAgeRange.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span>{item.range}</span>
                    <span className="font-medium">
                      {item.count} estudiantes
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Attendance by Age Section */}
          <AccordionItem
            value="attendanceByAge"
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Asistencia por Edad</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 border-t">
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.attendanceByAgeRange}>
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="average"
                      fill="#f97316"
                      name="Asistencia Promedio (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {reportData.attendanceByAgeRange.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span>{item.range}</span>
                    <span className="font-medium">
                      {item.average}% asistencia
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Classes Summary Section (only for general report) */}
          {isGeneralReport && reportData.classesSummary && (
            <AccordionItem
              value="classesSummary"
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium">Resumen por Clases</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 border-t">
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.classesSummary}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#82ca9d"
                      />
                      <Tooltip />
                      <Bar
                        yAxisId="left"
                        dataKey="students"
                        fill="#8884d8"
                        name="Estudiantes"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="averageAttendance"
                        fill="#82ca9d"
                        name="Asistencia %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {reportData.classesSummary.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 border-b"
                    >
                      <span className="font-medium">{item.name}</span>
                      <div className="flex space-x-4">
                        <span className="text-purple-600">
                          {item.students} estudiantes
                        </span>
                        <span className="text-green-600">
                          {item.averageAttendance}% asistencia
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    );
  }

  // Class selection view
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Reportes</h1>

      <p className="text-gray-500 mb-4">
        Selecciona una clase para ver sus reportes detallados o genera un
        reporte general.
      </p>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay clases disponibles</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* General report option */}
          <Card
            className="cursor-pointer hover:bg-gray-50 border-2 border-blue-200 bg-blue-50"
            onClick={handleViewGeneralReport}
          >
            <CardContent className="p-4">
              <div className="flex items-center">
                <LayoutGrid className="h-5 w-5 text-blue-500 mr-2" />
                <div>
                  <h2 className="text-lg font-medium">Reporte General</h2>
                  <p className="text-sm text-gray-500">
                    Ver estadísticas de todas las clases
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="my-3 border-t border-gray-200 pt-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Reportes por clase
            </h3>
          </div>

          {/* Individual class options */}
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
    </div>
  );
};

export default ReportesView;
