"use client";

import { useState, useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { createStudent } from "@/lib/actions";
import { Class } from "@prisma/client";
import { downloadCSVTemplate } from "@/lib/export-utils";

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Class[];
  onImportComplete: () => void;
}

interface CSVRow {
  Nombre: string;
  Apellidos: string;
  Género: string;
  Edad: string;
}

export default function ImportStudentsDialog({
  open,
  onOpenChange,
  classes,
  onImportComplete,
}: ImportStudentsDialogProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      toast.error("Por favor selecciona un archivo CSV");
      return;
    }

    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[];
        
        // Validate data
        if (data.length === 0) {
          toast.error("El archivo CSV está vacío");
          return;
        }

        // Check required columns
        const requiredColumns = ["Nombre", "Apellidos", "Género", "Edad"];
        const firstRow = data[0];
        const hasAllColumns = requiredColumns.every(
          (col) => col in firstRow
        );

        if (!hasAllColumns) {
          toast.error(
            `El archivo debe contener las columnas: ${requiredColumns.join(", ")}`
          );
          return;
        }

        setPreviewData(data.slice(0, 5)); // Show first 5 rows as preview
        toast.success(`${data.length} estudiantes listos para importar`);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        toast.error("Error al leer el archivo CSV");
      },
    });
  };

  const handleImport = async () => {
    if (!selectedClassId) {
      toast.error("Por favor selecciona una clase");
      return;
    }

    if (!fileInputRef.current?.files?.[0]) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setIsImporting(true);

    const file = fileInputRef.current.files[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as CSVRow[];
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const row of data) {
          try {
            // Validate gender
            const gender = row.Género.toUpperCase();
            if (gender !== "M" && gender !== "F") {
              errors.push(
                `${row.Nombre} ${row.Apellidos}: Género inválido (debe ser M o F)`
              );
              errorCount++;
              continue;
            }

            // Validate age
            const age = parseInt(row.Edad);
            if (isNaN(age) || age < 1 || age > 100) {
              errors.push(
                `${row.Nombre} ${row.Apellidos}: Edad inválida (debe ser entre 1 y 100)`
              );
              errorCount++;
              continue;
            }

            // Create student
            const result = await createStudent({
              firstName: row.Nombre.trim(),
              lastName: row.Apellidos.trim(),
              gender: gender as "M" | "F",
              age: age,
              classId: parseInt(selectedClassId),
            });

            if (result.success) {
              successCount++;
            } else {
              errors.push(
                `${row.Nombre} ${row.Apellidos}: ${result.error}`
              );
              errorCount++;
            }
          } catch (error) {
            console.error("Error importing student:", error);
            errors.push(
              `${row.Nombre} ${row.Apellidos}: Error desconocido`
            );
            errorCount++;
          }
        }

        setIsImporting(false);

        // Show results
        if (successCount > 0) {
          toast.success(
            `${successCount} estudiante(s) importado(s) correctamente`
          );
        }

        if (errorCount > 0) {
          toast.error(
            `${errorCount} estudiante(s) no pudieron ser importados`,
            {
              description: errors.slice(0, 3).join("\n"),
            }
          );
        }

        // Reset and close
        setPreviewData([]);
        setSelectedClassId("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onImportComplete();
        onOpenChange(false);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        toast.error("Error al procesar el archivo CSV");
        setIsImporting(false);
      },
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadCSVTemplate();
      toast.success("Plantilla descargada correctamente");
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Error al descargar la plantilla");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Estudiantes desde CSV</DialogTitle>
          <DialogDescription>
            Selecciona un archivo CSV con los datos de los estudiantes. El
            archivo debe contener las columnas: Nombre, Apellidos, Género (M/F)
            y Edad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  ¿No tienes una plantilla?
                </p>
                <p className="text-xs text-blue-700">
                  Descarga nuestra plantilla CSV de ejemplo
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download size={14} />
              Descargar
            </Button>
          </div>

          {/* Class Selection */}
          <div className="space-y-2">
            <Label htmlFor="class-select">Clase de destino</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger id="class-select">
                <SelectValue placeholder="Selecciona una clase" />
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

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Archivo CSV</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Seleccionar archivo CSV
              </Button>
            </div>
            {fileInputRef.current?.files?.[0] && (
              <p className="text-sm text-gray-600">
                Archivo seleccionado: {fileInputRef.current.files[0].name}
              </p>
            )}
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Vista previa (primeras 5 filas)</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Apellidos</th>
                      <th className="px-3 py-2 text-left">Género</th>
                      <th className="px-3 py-2 text-left">Edad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{row.Nombre}</td>
                        <td className="px-3 py-2">{row.Apellidos}</td>
                        <td className="px-3 py-2">{row.Género}</td>
                        <td className="px-3 py-2">{row.Edad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Importante:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Los estudiantes duplicados no serán importados</li>
                <li>El género debe ser M (Masculino) o F (Femenino)</li>
                <li>La edad debe ser un número entre 1 y 100</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !selectedClassId ||
              !fileInputRef.current?.files?.[0] ||
              isImporting
            }
          >
            {isImporting ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
