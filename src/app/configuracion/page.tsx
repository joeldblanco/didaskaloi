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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createAgeRange,
  deleteAgeRange,
  getAgeRanges,
  updateAgeRange,
} from "@/lib/actions";
import { ageRangeSchema, type AgeRangeFormValues } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgeRange } from "@prisma/client";
import { CheckCircle, Edit, Loader2, Plus, Save, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const ConfiguracionView = () => {
  const [ageRanges, setAgeRanges] = useState<AgeRange[]>([]);
  const [editingRangeId, setEditingRangeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<number | null>(null);

  // Form for creating or editing age ranges
  const form = useForm<AgeRangeFormValues>({
    resolver: zodResolver(ageRangeSchema),
    defaultValues: {
      label: "",
      minAge: 0,
      maxAge: 0,
    },
  });

  // Load age ranges when component mounts
  useEffect(() => {
    const loadAgeRanges = async () => {
      setIsLoading(true);
      try {
        const data = await getAgeRanges();
        setAgeRanges(data);
      } catch (error) {
        console.error("Error loading age ranges:", error);
        toast.error("Error al cargar los rangos de edad");
      } finally {
        setIsLoading(false);
      }
    };

    loadAgeRanges();
  }, []);

  // Start editing a range
  const startEditing = (range: AgeRange) => {
    setEditingRangeId(range.id);
    form.reset({
      id: range.id,
      label: range.label,
      minAge: range.minAge,
      maxAge: range.maxAge,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingRangeId(null);
    form.reset({
      label: "",
      minAge: 0,
      maxAge: 0,
    });
  };

  // Handle form submission - create or update
  const onSubmit = async (data: AgeRangeFormValues) => {
    try {
      let result;

      if (editingRangeId) {
        // Update existing range
        result = await updateAgeRange({ ...data, id: editingRangeId });

        if (result.success) {
          toast.success("Rango de edad actualizado correctamente");
          setEditingRangeId(null);
        }
      } else {
        // Create new range
        result = await createAgeRange(data);

        if (result.success) {
          toast.success("Rango de edad creado correctamente");
        }
      }

      if (result?.success) {
        // Refresh age ranges
        const updatedRanges = await getAgeRanges();
        setAgeRanges(updatedRanges);

        // Reset form
        form.reset({
          label: "",
          minAge: 0,
          maxAge: 0,
        });
      } else {
        toast.error(result?.error || "Error al guardar el rango de edad");
      }
    } catch (error) {
      console.error("Error saving age range:", error);
      toast.error("Error al guardar el rango de edad");
    }
  };

  // Handle deleting a range
  const handleDeleteRange = async (id: number) => {
    try {
      const result = await deleteAgeRange(id);

      if (result.success) {
        toast.success("Rango de edad eliminado correctamente");

        // Refresh age ranges
        const updatedRanges = await getAgeRanges();
        setAgeRanges(updatedRanges);
      } else {
        toast.error(result.error || "Error al eliminar el rango de edad");
      }

      setShowDeleteAlert(null);
    } catch (error) {
      console.error("Error deleting age range:", error);
      toast.error("Error al eliminar el rango de edad");
    }
  };

  // Save all configuration
  const saveConfiguration = () => {
    // In a real app, we might save additional configuration here
    setSuccessMessage("Configuración guardada correctamente");

    // Hide message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Configuración</h1>

      {/* Age Ranges Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Rangos de Edad</CardTitle>
          <p className="text-sm text-gray-500">
            Define los rangos de edad que se utilizarán para agrupar estudiantes
            en los reportes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {ageRanges.map((range) => (
                <Card key={range.id} className="border">
                  <CardContent className="p-4">
                    {editingRangeId === range.id ? (
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="minAge"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Edad mínima</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(
                                          value === ""
                                            ? ""
                                            : parseInt(value) || ""
                                        );
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="maxAge"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Edad máxima</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(
                                          value === ""
                                            ? ""
                                            : parseInt(value) || ""
                                        );
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Etiqueta</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: 18-19 años"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              Cancelar
                            </Button>
                            <Button type="submit" size="sm">
                              Guardar
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{range.label}</h3>
                          <p className="text-sm text-gray-500">
                            Entre {range.minAge} y {range.maxAge} años
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => startEditing(range)}
                            variant="ghost"
                            size="icon"
                          >
                            <Edit size={18} />
                          </Button>
                          <Button
                            onClick={() => setShowDeleteAlert(range.id)}
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                          >
                            <Trash size={18} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Add New Range Form */}
              <Card className="border border-dashed">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Agregar nuevo rango</h3>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="minAge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Edad mínima</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(
                                      value === "" ? "" : parseInt(value) || ""
                                    );
                                  }}
                                  disabled={editingRangeId !== null}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxAge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Edad máxima</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(
                                      value === "" ? "" : parseInt(value) || ""
                                    );
                                  }}
                                  disabled={editingRangeId !== null}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="label"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Etiqueta</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: 18-19 años"
                                {...field}
                                disabled={editingRangeId !== null}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 mt-2"
                        disabled={editingRangeId !== null}
                      >
                        <Plus size={16} />
                        <span>Agregar</span>
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button
            onClick={saveConfiguration}
            className="w-full flex items-center justify-center gap-2"
          >
            <Save size={16} />
            <span>Guardar Configuración</span>
          </Button>

          {successMessage && (
            <div className="flex items-center gap-2 text-green-600 mt-3 w-full justify-center">
              <CheckCircle size={16} />
              <span>{successMessage}</span>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Appearance Settings */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <p className="text-sm text-gray-500">
            Personaliza la apariencia de la aplicación
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Tema</h3>
              <p className="text-sm text-gray-500">
                Cambia entre modo claro y oscuro
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Application Information */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium mb-2">Información</h2>
          <p className="text-sm text-gray-500 mb-1">Versión: 1.0.0</p>
          <p className="text-sm text-gray-500">© 2025 Didaskaloi</p>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={showDeleteAlert !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShowDeleteAlert(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este rango de edad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteAlert !== null) {
                  handleDeleteRange(showDeleteAlert);
                }
              }}
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

export default ConfiguracionView;
