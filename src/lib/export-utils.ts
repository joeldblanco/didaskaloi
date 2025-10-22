import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Student {
  firstName: string;
  lastName: string;
  attendancePercentage?: number;
  gender?: string;
  age?: number;
  class?: { name: string };
}

interface ReportData {
  genderDistribution: { name: string; value: number }[];
  bestAttendance: {
    overall: Student | null;
    male: Student | null;
    female: Student | null;
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

export function exportReportToPDF(
  reportData: ReportData,
  reportTitle: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`,
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );
  yPosition += 15;

  // Gender Distribution
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Distribución por Género", 14, yPosition);
  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [["Género", "Cantidad"]],
    body: reportData.genderDistribution.map((item) => [
      item.name,
      item.value.toString(),
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Best Attendance
  if (reportData.bestAttendance.overall) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Mejores Asistencias", 14, yPosition);
    yPosition += 5;

    const bestAttendanceData = [];
    if (reportData.bestAttendance.overall) {
      bestAttendanceData.push([
        "General",
        `${reportData.bestAttendance.overall.firstName} ${reportData.bestAttendance.overall.lastName}`,
        `${reportData.bestAttendance.overall.attendancePercentage || 0}%`,
      ]);
    }
    if (reportData.bestAttendance.male) {
      bestAttendanceData.push([
        "Masculino",
        `${reportData.bestAttendance.male.firstName} ${reportData.bestAttendance.male.lastName}`,
        `${reportData.bestAttendance.male.attendancePercentage || 0}%`,
      ]);
    }
    if (reportData.bestAttendance.female) {
      bestAttendanceData.push([
        "Femenino",
        `${reportData.bestAttendance.female.firstName} ${reportData.bestAttendance.female.lastName}`,
        `${reportData.bestAttendance.female.attendancePercentage || 0}%`,
      ]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [["Categoría", "Estudiante", "Asistencia"]],
      body: bestAttendanceData,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
    });

    yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Students by Age Range
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Distribución por Edad", 14, yPosition);
  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [["Rango de Edad", "Cantidad"]],
    body: reportData.studentsByAgeRange.map((item) => [
      item.range,
      item.count.toString(),
    ]),
    theme: "grid",
    headStyles: { fillColor: [168, 85, 247] },
  });

  yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Attendance by Age Range
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Asistencia Promedio por Edad", 14, yPosition);
  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [["Rango de Edad", "Asistencia Promedio"]],
    body: reportData.attendanceByAgeRange.map((item) => [
      item.range,
      `${item.average}%`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [249, 115, 22] },
  });

  yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Students by Age Range and Gender
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Distribución por Edad y Género", 14, yPosition);
  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [["Rango de Edad", "Masculino", "Femenino"]],
    body: reportData.studentsByAgeRangeAndGender.map((item) => [
      item.range,
      item.masculino.toString(),
      item.femenino.toString(),
    ]),
    theme: "grid",
    headStyles: { fillColor: [20, 184, 166] },
  });

  // Classes Summary (if available)
  if (reportData.classesSummary && reportData.classesSummary.length > 0) {
    yPosition = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen por Clases", 14, yPosition);
    yPosition += 5;

    autoTable(doc, {
      startY: yPosition,
      head: [["Clase", "Estudiantes", "Asistencia Promedio"]],
      body: reportData.classesSummary.map((item) => [
        item.name,
        item.students.toString(),
        `${item.averageAttendance}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241] },
    });
  }

  // Save the PDF
  const fileName = `reporte_${reportTitle.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

export async function exportReportToExcel(
  reportData: ReportData,
  reportTitle: string
) {
  const workbook = new ExcelJS.Workbook();

  // Gender Distribution Sheet
  const genderSheet = workbook.addWorksheet("Distribución Género");
  genderSheet.addRow(["Género", "Cantidad"]);
  reportData.genderDistribution.forEach((item) => {
    genderSheet.addRow([item.name, item.value]);
  });
  genderSheet.getRow(1).font = { bold: true };

  // Best Attendance Sheet
  if (reportData.bestAttendance.overall) {
    const bestAttendanceSheet = workbook.addWorksheet("Mejores Asistencias");
    bestAttendanceSheet.addRow(["Categoría", "Estudiante", "Asistencia"]);
    
    if (reportData.bestAttendance.overall) {
      bestAttendanceSheet.addRow([
        "General",
        `${reportData.bestAttendance.overall.firstName} ${reportData.bestAttendance.overall.lastName}`,
        `${reportData.bestAttendance.overall.attendancePercentage || 0}%`,
      ]);
    }
    if (reportData.bestAttendance.male) {
      bestAttendanceSheet.addRow([
        "Masculino",
        `${reportData.bestAttendance.male.firstName} ${reportData.bestAttendance.male.lastName}`,
        `${reportData.bestAttendance.male.attendancePercentage || 0}%`,
      ]);
    }
    if (reportData.bestAttendance.female) {
      bestAttendanceSheet.addRow([
        "Femenino",
        `${reportData.bestAttendance.female.firstName} ${reportData.bestAttendance.female.lastName}`,
        `${reportData.bestAttendance.female.attendancePercentage || 0}%`,
      ]);
    }
    bestAttendanceSheet.getRow(1).font = { bold: true };
  }

  // Students by Age Range Sheet
  const ageRangeSheet = workbook.addWorksheet("Distribución Edad");
  ageRangeSheet.addRow(["Rango de Edad", "Cantidad"]);
  reportData.studentsByAgeRange.forEach((item) => {
    ageRangeSheet.addRow([item.range, item.count]);
  });
  ageRangeSheet.getRow(1).font = { bold: true };

  // Attendance by Age Range Sheet
  const attendanceByAgeSheet = workbook.addWorksheet("Asistencia por Edad");
  attendanceByAgeSheet.addRow(["Rango de Edad", "Asistencia Promedio"]);
  reportData.attendanceByAgeRange.forEach((item) => {
    attendanceByAgeSheet.addRow([item.range, `${item.average}%`]);
  });
  attendanceByAgeSheet.getRow(1).font = { bold: true };

  // Students by Age Range and Gender Sheet
  const ageGenderSheet = workbook.addWorksheet("Edad y Género");
  ageGenderSheet.addRow(["Rango de Edad", "Masculino", "Femenino"]);
  reportData.studentsByAgeRangeAndGender.forEach((item) => {
    ageGenderSheet.addRow([item.range, item.masculino, item.femenino]);
  });
  ageGenderSheet.getRow(1).font = { bold: true };

  // Classes Summary Sheet (if available)
  if (reportData.classesSummary && reportData.classesSummary.length > 0) {
    const classesSummarySheet = workbook.addWorksheet("Resumen Clases");
    classesSummarySheet.addRow(["Clase", "Estudiantes", "Asistencia Promedio"]);
    reportData.classesSummary.forEach((item) => {
      classesSummarySheet.addRow([item.name, item.students, `${item.averageAttendance}%`]);
    });
    classesSummarySheet.getRow(1).font = { bold: true };
  }

  // Save the Excel file
  const fileName = `reporte_${reportTitle.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportStudentsToExcel(students: Student[], className?: string) {
  const workbook = new ExcelJS.Workbook();
  const studentsSheet = workbook.addWorksheet("Estudiantes");

  studentsSheet.addRow(["Nombre", "Apellidos", "Género", "Edad", "Clase", "Asistencia"]);
  students.forEach((student) => {
    studentsSheet.addRow([
      student.firstName,
      student.lastName,
      student.gender === "M" ? "Masculino" : "Femenino",
      student.age,
      student.class?.name || "",
      `${student.attendancePercentage || 0}%`,
    ]);
  });
  studentsSheet.getRow(1).font = { bold: true };

  const fileName = className
    ? `estudiantes_${className.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    : `estudiantes_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadCSVTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Plantilla");

  worksheet.addRow(["Nombre", "Apellidos", "Género", "Edad"]);
  worksheet.addRow(["Juan", "Pérez", "M", "18"]);
  worksheet.addRow(["María", "González", "F", "19"]);
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.csv.writeBuffer();
  const blob = new Blob([buffer], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla_estudiantes.csv";
  link.click();
  URL.revokeObjectURL(url);
}
